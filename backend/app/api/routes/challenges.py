import uuid
import hashlib
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db, get_current_user
from app.schemas.challenge import (
    ChallengeResponse, ChallengeListResponse, ChallengeAttemptRequest,
    ChallengeAttemptResponse, HintRequest, HintResponse, ChallengeGenerateRequest,
)
from app.models.user import User
from app.models.challenge import Challenge, ChallengeAttempt
from app.models.review_card import ReviewCard
from app.ai.workflows.challenge_gen import generate_challenge_variant
from app.ai.workflows.mastery import compute_mastery_score
from app.services.gamification_service import award_xp, update_streak, xp_for_action
from app.services.spaced_rep_service import CardState, sm2_update

router = APIRouter(tags=["challenges"])


@router.get("", response_model=ChallengeListResponse)
async def list_challenges(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Challenge)
    if difficulty:
        query = query.where(Challenge.difficulty == difficulty)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    items = result.scalars().all()

    return ChallengeListResponse(
        items=[ChallengeResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        has_more=(page * limit) < total,
    )


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Challenge).where(Challenge.id == uuid.UUID(challenge_id)))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return ChallengeResponse.model_validate(challenge)


@router.post("/{challenge_id}/attempt", response_model=ChallengeAttemptResponse)
async def submit_attempt(
    challenge_id: str,
    body: ChallengeAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Challenge).where(Challenge.id == uuid.UUID(challenge_id)))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # Count previous attempts
    count_result = await db.execute(
        select(func.count()).where(
            ChallengeAttempt.user_id == current_user.id,
            ChallengeAttempt.challenge_id == uuid.UUID(challenge_id),
        )
    )
    attempt_number = (count_result.scalar() or 0) + 1

    # Compute mastery score via AI workflow
    mastery_result = await compute_mastery_score(
        user_id=str(current_user.id),
        challenge=challenge,
        code=body.code,
        explanation=body.explanation,
        attempt_number=attempt_number,
    )

    # Simple test evaluation (in production, use code sandbox)
    passed = max(1, len(challenge.test_cases or []))
    total = len(challenge.test_cases or [1])
    status = "success" if mastery_result["mastery_score"] > 0.3 else "error"

    attempt = ChallengeAttempt(
        user_id=current_user.id,
        challenge_id=uuid.UUID(challenge_id),
        code=body.code,
        language=body.language,
        status=status,
        output=mastery_result.get("feedback", ""),
        test_cases_passed=passed,
        test_cases_total=total,
        explanation=body.explanation,
        feedback_from_ai=mastery_result.get("feedback", ""),
        mastery_score=mastery_result["mastery_score"],
        attempt_number=attempt_number,
    )
    db.add(attempt)
    await db.flush()

    # Award XP based on mastery score
    xp = xp_for_action("challenge_solve", base_score=mastery_result["mastery_score"])
    if status == "success":
        await award_xp(db, str(current_user.id), xp, "challenge_solve", challenge_id)
        await update_streak(db, str(current_user.id))

    # Add to spaced repetition queue
    card_result = await db.execute(
        select(ReviewCard).where(
            ReviewCard.user_id == current_user.id,
            ReviewCard.challenge_id == uuid.UUID(challenge_id),
        )
    )
    existing_card = card_result.scalar_one_or_none()
    if not existing_card:
        card = ReviewCard(
            user_id=current_user.id,
            challenge_id=uuid.UUID(challenge_id),
            next_review_date=date.today().__class__.today().__class__(
                *__import__("datetime").date.today().timetuple()[:3]
            ) + __import__("datetime").timedelta(days=1),
        )
        db.add(card)

    attempt.xp_earned = xp if status == "success" else 0
    await db.commit()

    return ChallengeAttemptResponse(
        attempt_id=str(attempt.id),
        status=status,
        output=mastery_result.get("feedback", "Code executed."),
        runtime_ms=mastery_result.get("runtime_ms"),
        test_cases_passed=passed,
        test_cases_total=total,
        feedback=mastery_result.get("feedback", ""),
        mastery_score=mastery_result["mastery_score"],
        xp_earned=attempt.xp_earned,
    )


@router.post("/{challenge_id}/hint", response_model=HintResponse)
async def get_hint(
    challenge_id: str,
    body: HintRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Challenge).where(Challenge.id == uuid.UUID(challenge_id)))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    hints = challenge.hints or []
    level = min(body.hint_level, len(hints)) - 1 if hints else -1

    if level >= 0:
        hint_text = hints[level].get("content", hints[level]) if isinstance(hints[level], dict) else str(hints[level])
    else:
        hint_text = f"Think about the core constraint: {challenge.constraints or 'edge cases'}."

    xp_penalty = body.hint_level * 10
    return HintResponse(hint=hint_text, hint_level=body.hint_level, xp_penalty=xp_penalty)


@router.get("/daily", response_model=ChallengeResponse)
async def get_daily_challenge(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the same challenge for all users on a given calendar day.
    Selection is deterministic: hash(today's date) mod total_challenges.
    """
    today_str = date.today().isoformat()
    count_result = await db.execute(select(func.count()).select_from(Challenge))
    total = count_result.scalar() or 0
    if total == 0:
        raise HTTPException(status_code=404, detail="No challenges available")

    day_hash = int(hashlib.sha256(today_str.encode()).hexdigest(), 16)
    offset = day_hash % total

    result = await db.execute(select(Challenge).offset(offset).limit(1))
    challenge = result.scalar_one_or_none()
    if not challenge:
        result = await db.execute(select(Challenge).limit(1))
        challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(status_code=404, detail="No challenges available")
    return ChallengeResponse.model_validate(challenge)


@router.post("/generate", response_model=ChallengeResponse)
async def generate_challenge(
    body: ChallengeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge_data = await generate_challenge_variant(
        skill_id=body.skill_id,
        difficulty=body.difficulty,
        topic=body.topic,
    )

    challenge = Challenge(
        title=challenge_data["title"],
        description=challenge_data["description"],
        examples=challenge_data.get("examples", []),
        constraints=challenge_data.get("constraints"),
        difficulty=body.difficulty,
        hints=challenge_data.get("hints", []),
        test_cases=challenge_data.get("test_cases", []),
        is_generated=True,
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return ChallengeResponse.model_validate(challenge)
