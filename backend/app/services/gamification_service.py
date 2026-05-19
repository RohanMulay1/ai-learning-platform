"""XP, levels, streaks, and badge logic."""
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import UserLevel, UserStreak, UserXPLedger, UserStreakFreeze
from app.models.badge import Badge, UserBadgeProgress

# XP required to reach each level (cumulative)
LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000, 110000]


def xp_for_action(action: str, base_score: float = 1.0, streak_multiplier: float = 1.0) -> int:
    base_xp = {
        "challenge_solve": 100,
        "challenge_attempt": 10,
        "review_done": 20,
        "badge_earned": 200,
        "streak_bonus": 50,
    }.get(action, 10)
    return round(base_xp * base_score * streak_multiplier)


def level_from_xp(total_xp: int) -> int:
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1
    return min(level, len(LEVEL_THRESHOLDS))


def next_level_xp(current_level: int) -> int:
    if current_level >= len(LEVEL_THRESHOLDS):
        return LEVEL_THRESHOLDS[-1]
    return LEVEL_THRESHOLDS[current_level]


async def award_xp(db: AsyncSession, user_id: str, xp: int, reason: str, related_id: str | None = None) -> int:
    import uuid
    ledger_entry = UserXPLedger(
        user_id=uuid.UUID(user_id),
        xp_amount=xp,
        reason=reason,
        related_id=uuid.UUID(related_id) if related_id else None,
    )
    db.add(ledger_entry)

    result = await db.execute(select(UserLevel).where(UserLevel.user_id == uuid.UUID(user_id)))
    level = result.scalar_one_or_none()
    if level:
        level.current_xp += xp
        level.total_xp_earned += xp
        new_level = level_from_xp(level.total_xp_earned)
        if new_level > level.current_level:
            level.current_level = new_level
            level.last_level_up = datetime.utcnow()

    await db.commit()
    return xp


async def update_streak(db: AsyncSession, user_id: str) -> dict:
    import uuid
    from datetime import timedelta
    uid = uuid.UUID(user_id)

    result = await db.execute(select(UserStreak).where(UserStreak.user_id == uid))
    streak = result.scalar_one_or_none()
    if not streak:
        return {"current_streak": 0, "extended": False, "freeze_used": False}

    today = date.today()
    extended = False
    freeze_used = False

    if streak.last_activity_date == today:
        pass  # already counted today
    elif streak.last_activity_date == today - timedelta(days=1):
        streak.current_streak += 1
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        extended = True
    else:
        # Gap detected — try to consume a streak freeze before breaking
        days_missed = (today - streak.last_activity_date).days if streak.last_activity_date else 999
        if days_missed == 2:
            freeze_result = await db.execute(
                select(UserStreakFreeze).where(UserStreakFreeze.user_id == uid)
            )
            freeze = freeze_result.scalar_one_or_none()
            if freeze and freeze.freezes_available > 0:
                freeze.freezes_available -= 1
                freeze.freezes_used_total += 1
                freeze.last_freeze_used_at = datetime.utcnow()
                # Streak continues as if yesterday was active
                streak.current_streak += 1
                streak.longest_streak = max(streak.longest_streak, streak.current_streak)
                extended = True
                freeze_used = True

        if not freeze_used:
            streak.current_streak = 1
            streak.streak_start_date = today
            extended = True

    streak.last_activity_date = today
    await db.commit()
    return {"current_streak": streak.current_streak, "extended": extended, "freeze_used": freeze_used}


async def earn_streak_freeze(db: AsyncSession, user_id: str) -> int:
    """Award 1 streak freeze. Called when user hits a daily XP goal milestone."""
    import uuid
    uid = uuid.UUID(user_id)
    result = await db.execute(select(UserStreakFreeze).where(UserStreakFreeze.user_id == uid))
    freeze = result.scalar_one_or_none()
    if not freeze:
        freeze = UserStreakFreeze(user_id=uid, freezes_available=1)
        db.add(freeze)
    else:
        freeze.freezes_available = min(freeze.freezes_available + 1, 5)  # cap at 5
        freeze.last_freeze_earned_at = datetime.utcnow()
    await db.commit()
    return freeze.freezes_available
