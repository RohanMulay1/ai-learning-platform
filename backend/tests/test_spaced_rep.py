"""
Unit tests for SM-2 spaced repetition algorithm.
These are pure logic tests — no DB required.
"""
import pytest
from datetime import date, timedelta
from app.services.spaced_rep_service import sm2_update, CardState, retention_score, get_difficulty_label


def make_card(**kwargs) -> CardState:
    return CardState(interval=1, ease_factor=2.5, repetitions=0, **kwargs)


class TestSM2Algorithm:

    def test_quality_0_resets_card(self):
        """Complete blackout: interval resets to 1, repetitions to 0."""
        card = make_card(interval=10, ease_factor=2.5, repetitions=3)
        result = sm2_update(card, quality=0)
        assert result.interval == 1
        assert result.repetitions == 0

    def test_quality_1_resets_card(self):
        card = make_card(interval=6, ease_factor=2.5, repetitions=2)
        result = sm2_update(card, quality=1)
        assert result.interval == 1
        assert result.repetitions == 0

    def test_quality_2_resets_card(self):
        card = make_card(interval=3, ease_factor=2.3, repetitions=1)
        result = sm2_update(card, quality=2)
        assert result.interval == 1
        assert result.repetitions == 0

    def test_quality_3_first_repetition(self):
        """First successful recall sets interval to 1."""
        card = make_card(repetitions=0)
        result = sm2_update(card, quality=3)
        assert result.interval == 1
        assert result.repetitions == 1

    def test_quality_3_second_repetition(self):
        """Second successful recall sets interval to 6."""
        card = make_card(interval=1, repetitions=1)
        result = sm2_update(card, quality=3)
        assert result.interval == 6
        assert result.repetitions == 2

    def test_quality_5_third_repetition_multiplies_by_ease(self):
        """Third+ repetitions: interval = prev_interval * ease_factor."""
        card = make_card(interval=6, ease_factor=2.5, repetitions=2)
        result = sm2_update(card, quality=5)
        assert result.interval == round(6 * 2.5)  # 15
        assert result.repetitions == 3

    def test_ease_factor_increases_on_perfect(self):
        """Quality 5 increases ease factor."""
        card = make_card(ease_factor=2.5, repetitions=1)
        result = sm2_update(card, quality=5)
        assert result.ease_factor > 2.5

    def test_ease_factor_decreases_on_hard(self):
        """Quality 3 slightly decreases ease factor."""
        card = make_card(ease_factor=2.5, repetitions=1)
        result = sm2_update(card, quality=3)
        assert result.ease_factor < 2.5

    def test_ease_factor_clamped_at_minimum(self):
        """Ease factor never drops below 1.3."""
        card = make_card(ease_factor=1.3, repetitions=0)
        result = sm2_update(card, quality=0)
        assert result.ease_factor >= 1.3

    def test_next_review_date_set(self):
        """next_review_date is always set after update."""
        card = make_card()
        result = sm2_update(card, quality=4)
        assert result.next_review_date is not None
        assert result.next_review_date >= date.today()

    def test_next_review_date_correct_interval(self):
        """next_review_date = today + interval days."""
        card = make_card(interval=6, repetitions=1)
        result = sm2_update(card, quality=3)
        expected_date = date.today() + timedelta(days=result.interval)
        assert result.next_review_date == expected_date

    def test_invalid_quality_raises(self):
        card = make_card()
        with pytest.raises(ValueError, match="quality must be 0-5"):
            sm2_update(card, quality=6)
        with pytest.raises(ValueError):
            sm2_update(card, quality=-1)

    def test_long_chain_progressive_intervals(self):
        """Simulate perfect recalls: intervals grow over time."""
        card = make_card()
        intervals = []
        for _ in range(5):
            card = sm2_update(card, quality=5)
            intervals.append(card.interval)
        for i in range(1, len(intervals)):
            assert intervals[i] >= intervals[i - 1], f"Interval should grow: {intervals}"


class TestRetentionScore:

    def test_empty_logs_returns_zero(self):
        assert retention_score([]) == 0.0

    def test_all_perfect_recalls(self):
        logs = [{"quality": 5} for _ in range(10)]
        assert retention_score(logs) == 1.0

    def test_all_forgotten(self):
        logs = [{"quality": 0} for _ in range(10)]
        assert retention_score(logs) == 0.0

    def test_mixed_retention(self):
        logs = [{"quality": 5}, {"quality": 5}, {"quality": 0}, {"quality": 0}]
        assert retention_score(logs) == 0.5


class TestDifficultyLabel:

    def test_easy_label(self):
        assert get_difficulty_label(2.6) == "easy"

    def test_medium_label(self):
        assert get_difficulty_label(2.0) == "medium"

    def test_hard_label(self):
        assert get_difficulty_label(1.4) == "hard"
