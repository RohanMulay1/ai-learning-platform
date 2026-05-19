import uuid
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db, get_current_user
from app.schemas.progress import (
    ProgressSnapshotResponse, ProgressTimelineResponse, HeatmapResponse,
    SessionRecapResponse, SkillMasteryItem, MasteryTimelinePoint, HeatmapDay,
)
from app.models.user import User, UserXPLedger
from app.models.skill import UserSkillMastery, Skill
from app.models.challenge import ChallengeAttempt

router = APIRouter(tags=["progress"])


@router.get("/snapshot", response_model=ProgressSnapshotResponse)
async def get_snapshot(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mastery_result = await db.execute(
        select(UserSkillMastery, Skill)
        .join(Skill, UserSkillMastery.skill_id == Skill.id)
        .where(UserSkillMastery.user_id == current_user.id)
    )
    mastery_rows = mastery_result.all()

    skill_items = [
        SkillMasteryItem(
            skill_id=str(m.skill_id),
            skill_name=s.name,
            mastery_level=round(m.mastery_level, 3),
            is_unlocked=m.is_unlocked,
            problems_solved=m.problems_solved,
        )
        for m, s in mastery_rows
    ]

    overall = sum(i.mastery_level for i in skill_items) / max(len(skill_items), 1)
    weak = [i for i in skill_items if i.mastery_level < 0.4]
    strong = [i for i in skill_items if i.mastery_level >= 0.7]

    attempts_result = await db.execute(
        select(func.count()).where(
            ChallengeAttempt.user_id == current_user.id,
            ChallengeAttempt.status == "success",
        )
    )
    solved = attempts_result.scalar() or 0

    level = current_user.level
    streak = current_user.streak

    return ProgressSnapshotResponse(
        skill_mastery=skill_items,
        weak_areas=weak[:5],
        strengths=strong[:5],
        overall_mastery=round(overall, 3),
        total_challenges_solved=solved,
        current_streak=streak.current_streak if streak else 0,
        total_xp=level.total_xp_earned if level else 0,
        current_level=level.current_level if level else 1,
    )


@router.get("/timeline", response_model=ProgressTimelineResponse)
async def get_timeline(
    time_range: str = Query("week", enum=["day", "week", "month", "year"]),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    days = {"day": 1, "week": 7, "month": 30, "year": 365}[time_range]
    since = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(ChallengeAttempt)
        .where(
            ChallengeAttempt.user_id == current_user.id,
            ChallengeAttempt.created_at >= since,
        )
        .order_by(ChallengeAttempt.created_at)
    )
    attempts = result.scalars().all()

    points = [
        MasteryTimelinePoint(
            timestamp=a.created_at.isoformat(),
            skill_id=str(a.challenge_id),
            skill_name="Challenge",
            mastery_score=a.mastery_score,
        )
        for a in attempts
    ]

    return ProgressTimelineResponse(data=points, time_range=time_range)


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    year: int = Query(datetime.utcnow().year),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = datetime(year, 1, 1)
    end = datetime(year, 12, 31, 23, 59, 59)

    result = await db.execute(
        select(UserXPLedger).where(
            UserXPLedger.user_id == current_user.id,
            UserXPLedger.created_at >= start,
            UserXPLedger.created_at <= end,
        )
    )
    ledger = result.scalars().all()

    day_map: dict[str, dict] = {}
    for entry in ledger:
        day = entry.created_at.date().isoformat()
        if day not in day_map:
            day_map[day] = {"activity_count": 0, "xp_earned": 0}
        day_map[day]["activity_count"] += 1
        day_map[day]["xp_earned"] += entry.xp_amount

    days_data = [
        HeatmapDay(date=d, activity_count=v["activity_count"], xp_earned=v["xp_earned"])
        for d, v in sorted(day_map.items())
    ]

    return HeatmapResponse(
        data=days_data,
        year=year,
        total_active_days=len(day_map),
        max_streak=current_user.streak.longest_streak if current_user.streak else 0,
    )
