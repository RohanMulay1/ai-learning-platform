import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_db, get_current_user
from app.models.user import User, UserStreak, UserStreakFreeze
from app.models.badge import Badge, UserBadgeProgress
from app.services.gamification_service import level_from_xp, next_level_xp, earn_streak_freeze

router = APIRouter(tags=["gamification"])


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    streak_start_date: str | None
    last_activity_date: str | None


class BadgeItem(BaseModel):
    id: str
    name: str
    description: str | None
    rarity: str
    xp_reward: int
    status: str
    completion_percentage: int
    earned_at: str | None
    is_masterpiece: bool


class BadgesResponse(BaseModel):
    badges: list[BadgeItem]
    earned_count: int


class XPSummaryResponse(BaseModel):
    total_xp: int
    current_level: int
    current_xp: int
    next_level_xp: int
    xp_to_next_level: int
    level_progress_pct: float


@router.get("/streaks", response_model=StreakResponse)
async def get_streaks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    streak = current_user.streak
    return StreakResponse(
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        streak_start_date=streak.streak_start_date.isoformat() if streak and streak.streak_start_date else None,
        last_activity_date=streak.last_activity_date.isoformat() if streak and streak.last_activity_date else None,
    )


@router.get("/badges", response_model=BadgesResponse)
async def get_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    badges_result = await db.execute(select(Badge))
    all_badges = badges_result.scalars().all()

    progress_result = await db.execute(
        select(UserBadgeProgress).where(UserBadgeProgress.user_id == current_user.id)
    )
    user_progress = {str(p.badge_id): p for p in progress_result.scalars().all()}

    items = []
    for badge in all_badges:
        p = user_progress.get(str(badge.id))
        items.append(BadgeItem(
            id=str(badge.id),
            name=badge.name,
            description=badge.description,
            rarity=badge.rarity,
            xp_reward=badge.xp_reward,
            status=p.status if p else "locked",
            completion_percentage=p.completion_percentage if p else 0,
            earned_at=p.earned_at.isoformat() if p and p.earned_at else None,
            is_masterpiece=p.is_masterpiece if p else False,
        ))

    earned = sum(1 for i in items if i.status in ("earned", "masterpiece"))
    return BadgesResponse(badges=items, earned_count=earned)


@router.get("/xp", response_model=XPSummaryResponse)
async def get_xp_summary(
    current_user: User = Depends(get_current_user),
):
    level_obj = current_user.level
    total_xp = level_obj.total_xp_earned if level_obj else 0
    current_level = level_obj.current_level if level_obj else 1
    current_xp = level_obj.current_xp if level_obj else 0
    next_xp = next_level_xp(current_level)
    xp_to_next = max(0, next_xp - total_xp)
    pct = min(100, round((total_xp / next_xp * 100) if next_xp else 0, 1))

    return XPSummaryResponse(
        total_xp=total_xp,
        current_level=current_level,
        current_xp=current_xp,
        next_level_xp=next_xp,
        xp_to_next_level=xp_to_next,
        level_progress_pct=pct,
    )


class StreakFreezeResponse(BaseModel):
    freezes_available: int
    freezes_used_total: int
    last_freeze_earned_at: str | None
    last_freeze_used_at: str | None


@router.get("/streaks/freeze", response_model=StreakFreezeResponse)
async def get_streak_freeze(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserStreakFreeze).where(UserStreakFreeze.user_id == current_user.id)
    )
    freeze = result.scalar_one_or_none()
    if not freeze:
        return StreakFreezeResponse(
            freezes_available=0, freezes_used_total=0,
            last_freeze_earned_at=None, last_freeze_used_at=None,
        )
    return StreakFreezeResponse(
        freezes_available=freeze.freezes_available,
        freezes_used_total=freeze.freezes_used_total,
        last_freeze_earned_at=freeze.last_freeze_earned_at.isoformat() if freeze.last_freeze_earned_at else None,
        last_freeze_used_at=freeze.last_freeze_used_at.isoformat() if freeze.last_freeze_used_at else None,
    )


@router.post("/streaks/freeze/earn", response_model=StreakFreezeResponse)
async def earn_freeze(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Grant the user a streak freeze (call when daily XP goal is hit)."""
    available = await earn_streak_freeze(db, str(current_user.id))
    result = await db.execute(
        select(UserStreakFreeze).where(UserStreakFreeze.user_id == current_user.id)
    )
    freeze = result.scalar_one_or_none()
    return StreakFreezeResponse(
        freezes_available=available,
        freezes_used_total=freeze.freezes_used_total if freeze else 0,
        last_freeze_earned_at=freeze.last_freeze_earned_at.isoformat() if freeze and freeze.last_freeze_earned_at else None,
        last_freeze_used_at=freeze.last_freeze_used_at.isoformat() if freeze and freeze.last_freeze_used_at else None,
    )
