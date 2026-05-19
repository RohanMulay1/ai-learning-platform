"""SM-2 spaced repetition algorithm implementation."""
from datetime import date, timedelta, datetime
from dataclasses import dataclass, field


@dataclass
class CardState:
    interval: int = 1
    ease_factor: float = 2.5
    repetitions: int = 0
    next_review_date: date | None = None
    last_reviewed: datetime | None = None


@dataclass
class BehaviorPenalty:
    """Telemetry signals collected during the challenge session."""
    hint_count: int = 0
    error_repetition_frequency: float = 0.0  # same error type / total executions
    paralysis_windows: int = 0               # idle gaps > 30s while tab active


def compute_behavior_penalty(penalty: BehaviorPenalty) -> float:
    """
    P_b multiplier for SM-2 interval adjustment.
    Floored at 0.10 to prevent zero/negative ease_factors.
    Applied as: adjusted_interval = base_interval * P_b
    """
    raw = (
        1.0
        - (0.05 * penalty.hint_count)
        - (0.10 * penalty.error_repetition_frequency)
        - (0.02 * penalty.paralysis_windows)
    )
    return max(0.10, raw)


def sm2_update(card: CardState, quality: int) -> CardState:
    """
    SM-2 algorithm. quality: 0 (total blackout) to 5 (perfect recall).
    Returns updated card state with new interval, ease_factor, and next_review_date.
    """
    if quality < 0 or quality > 5:
        raise ValueError("quality must be 0-5")

    if quality < 3:
        # Forgot — reset
        card.repetitions = 0
        card.interval = 1
    else:
        # Remembered
        if card.repetitions == 0:
            card.interval = 1
        elif card.repetitions == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.ease_factor)
        card.repetitions += 1

    # Update ease factor; clamp to minimum 1.3
    card.ease_factor = max(
        1.3,
        card.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
    )
    card.next_review_date = date.today() + timedelta(days=card.interval)
    card.last_reviewed = datetime.utcnow()
    return card


def sm2_update_with_behavior(card: CardState, quality: int, penalty: BehaviorPenalty) -> CardState:
    """
    SM-2 with behavioral penalty multiplier applied to the computed interval.
    Ease factor is updated normally; only the scheduled interval is shortened.
    """
    card = sm2_update(card, quality)
    p_b = compute_behavior_penalty(penalty)
    card.interval = max(1, round(card.interval * p_b))
    card.next_review_date = date.today() + timedelta(days=card.interval)
    return card


def get_difficulty_label(ease_factor: float) -> str:
    if ease_factor >= 2.5:
        return "easy"
    elif ease_factor >= 1.8:
        return "medium"
    return "hard"


def retention_score(logs: list[dict]) -> float:
    """Estimate retention as ratio of quality >= 3 reviews."""
    if not logs:
        return 0.0
    passed = sum(1 for log in logs if log["quality"] >= 3)
    return passed / len(logs)
