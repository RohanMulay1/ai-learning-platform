import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.review_card import ReviewCard, ReviewLog
from app.models.challenge import Challenge
from app.services.spaced_rep_service import sm2_update, CardState, retention_score, get_difficulty_label

router = APIRouter(tags=["spaced_repetition"])


class ReviewQueueItem(BaseModel):
    challenge_id: str
    challenge_title: str
    challenge_difficulty: str
    interval: int
    ease_factor: float
    repetitions: int
    last_reviewed: str | None


class ReviewQueueResponse(BaseModel):
    due_cards: list[ReviewQueueItem]
    upcoming_count: int
    next_review_time: str | None


class ReviewSubmitRequest(BaseModel):
    quality: int = Field(ge=0, le=5)


class ReviewSubmitResponse(BaseModel):
    next_review_date: str
    interval: int
    ease_factor: float
    difficulty_label: str
    message: str


class ReviewStatsResponse(BaseModel):
    cards_studied_total: int
    due_today: int
    retention_rate: float
    average_interval: float


@router.get("/queue", response_model=ReviewQueueResponse)
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    due_result = await db.execute(
        select(ReviewCard, Challenge)
        .join(Challenge, ReviewCard.challenge_id == Challenge.id)
        .where(ReviewCard.user_id == current_user.id)
        .where(ReviewCard.next_review_date <= today)
    )
    due_rows = due_result.all()

    upcoming_result = await db.execute(
        select(func.count()).where(
            ReviewCard.user_id == current_user.id,
            ReviewCard.next_review_date > today,
        )
    )
    upcoming_count = upcoming_result.scalar() or 0

    due_cards = [
        ReviewQueueItem(
            challenge_id=str(card.challenge_id),
            challenge_title=challenge.title,
            challenge_difficulty=challenge.difficulty,
            interval=card.interval,
            ease_factor=round(card.ease_factor, 2),
            repetitions=card.repetitions,
            last_reviewed=card.last_reviewed.isoformat() if card.last_reviewed else None,
        )
        for card, challenge in due_rows
    ]

    return ReviewQueueResponse(
        due_cards=due_cards,
        upcoming_count=upcoming_count,
        next_review_time=None,
    )


@router.post("/{challenge_id}", response_model=ReviewSubmitResponse)
async def submit_review(
    challenge_id: str,
    body: ReviewSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReviewCard).where(
            ReviewCard.user_id == current_user.id,
            ReviewCard.challenge_id == uuid.UUID(challenge_id),
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Review card not found")

    old_interval = card.interval
    old_ease = card.ease_factor

    state = CardState(
        interval=card.interval,
        ease_factor=card.ease_factor,
        repetitions=card.repetitions,
    )
    updated = sm2_update(state, body.quality)

    log = ReviewLog(
        user_id=current_user.id,
        challenge_id=uuid.UUID(challenge_id),
        quality=body.quality,
        old_interval=old_interval,
        new_interval=updated.interval,
        old_ease_factor=old_ease,
        new_ease_factor=updated.ease_factor,
    )
    db.add(log)

    card.interval = updated.interval
    card.ease_factor = updated.ease_factor
    card.repetitions = updated.repetitions
    card.next_review_date = updated.next_review_date
    card.last_reviewed = updated.last_reviewed
    card.difficulty_rating = get_difficulty_label(updated.ease_factor)

    await db.commit()

    quality_labels = {0: "Forgot it", 1: "Hard", 2: "Struggled", 3: "Good", 4: "Easy", 5: "Perfect!"}
    return ReviewSubmitResponse(
        next_review_date=updated.next_review_date.isoformat(),
        interval=updated.interval,
        ease_factor=round(updated.ease_factor, 2),
        difficulty_label=get_difficulty_label(updated.ease_factor),
        message=f"{quality_labels.get(body.quality, 'Reviewed')}. Next review in {updated.interval} day(s).",
    )


@router.get("/stats", response_model=ReviewStatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    total_result = await db.execute(select(func.count()).where(ReviewCard.user_id == current_user.id))
    total = total_result.scalar() or 0

    due_result = await db.execute(
        select(func.count()).where(
            ReviewCard.user_id == current_user.id,
            ReviewCard.next_review_date <= today,
        )
    )
    due = due_result.scalar() or 0

    logs_result = await db.execute(
        select(ReviewLog).where(ReviewLog.user_id == current_user.id)
    )
    logs = logs_result.scalars().all()
    retention = retention_score([{"quality": log.quality} for log in logs])

    interval_result = await db.execute(select(func.avg(ReviewCard.interval)).where(ReviewCard.user_id == current_user.id))
    avg_interval = float(interval_result.scalar() or 1.0)

    return ReviewStatsResponse(
        cards_studied_total=total,
        due_today=due,
        retention_rate=round(retention, 3),
        average_interval=round(avg_interval, 1),
    )
