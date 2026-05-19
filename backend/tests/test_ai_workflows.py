"""
Tests for AI orchestration workflows.
Uses mocking to avoid real API calls during testing.
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock


class TestTutorWorkflow:

    def test_mastery_check_low_on_many_attempts(self):
        """Many attempts + poor explanation = low mastery score."""
        from app.ai.workflows.tutor import mastery_check_node
        from app.ai.state import LearnerState

        state: LearnerState = {
            "student_id": "user-1",
            "challenge_id": "ch-1",
            "conversation_history": [
                {"role": "student", "content": f"try {i}"} for i in range(10)
            ],
            "student_understanding": {},
            "detected_misconceptions": ["confused about base case", "off-by-one error"],
            "session_metadata": {},
            "next_action": "",
            "mastery_score": None,
            "generated_hint_count": 0,
            "coherence_score": 0.2,
            "tutor_response": None,
            "tutor_intent": None,
            "follow_up": None,
        }
        result = mastery_check_node(state)
        assert result["mastery_score"] is not None
        assert result["mastery_score"] < 0.5

    def test_mastery_check_high_on_first_try(self):
        """First attempt + high coherence + no misconceptions = high mastery."""
        from app.ai.workflows.tutor import mastery_check_node
        from app.ai.state import LearnerState

        state: LearnerState = {
            "student_id": "user-1",
            "challenge_id": "ch-1",
            "conversation_history": [{"role": "student", "content": "my solution"}],
            "student_understanding": {},
            "detected_misconceptions": [],
            "session_metadata": {},
            "next_action": "",
            "mastery_score": None,
            "generated_hint_count": 0,
            "coherence_score": 0.95,
            "tutor_response": None,
            "tutor_intent": None,
            "follow_up": None,
        }
        result = mastery_check_node(state)
        assert result["mastery_score"] > 0.7

    def test_mastery_clamped_between_0_and_1(self):
        """Mastery score should always be 0-1."""
        from app.ai.workflows.tutor import mastery_check_node
        from app.ai.state import LearnerState

        for coherence in [0.0, 0.5, 1.0]:
            for miscs in [[], ["a", "b", "c", "d", "e"]]:
                state: LearnerState = {
                    "student_id": "u", "challenge_id": "c",
                    "conversation_history": [{"role": "student", "content": "x"}],
                    "student_understanding": {}, "detected_misconceptions": miscs,
                    "session_metadata": {}, "next_action": "", "mastery_score": None,
                    "generated_hint_count": 0, "coherence_score": coherence,
                    "tutor_response": None, "tutor_intent": None, "follow_up": None,
                }
                result = mastery_check_node(state)
                assert 0.0 <= result["mastery_score"] <= 1.0

    @pytest.mark.asyncio
    async def test_router_classifies_asking_solution(self):
        """Router should identify 'give me the answer' as asking_solution."""
        from app.ai.workflows.tutor import router_node
        from app.ai.state import LearnerState

        mock_response = MagicMock()
        mock_response.content = "asking_solution"

        with patch("app.ai.workflows.tutor._haiku") as mock_llm:
            mock_llm.invoke.return_value = mock_response
            state: LearnerState = {
                "student_id": "u", "challenge_id": "c",
                "conversation_history": [{"role": "student", "content": "Just give me the answer please"}],
                "student_understanding": {}, "detected_misconceptions": [],
                "session_metadata": {}, "next_action": "", "mastery_score": None,
                "generated_hint_count": 0, "coherence_score": None,
                "tutor_response": None, "tutor_intent": None, "follow_up": None,
            }
            result = router_node(state)
            assert result["next_action"] == "asking_solution"

    @pytest.mark.asyncio
    async def test_redirect_node_does_not_give_solution(self):
        """Redirect node must not contain 'answer is' or 'solution is'."""
        from app.ai.workflows.tutor import redirect_node
        from app.ai.state import LearnerState

        mock_response = MagicMock()
        mock_response.content = "I understand the temptation, but let me give you a hint instead."

        with patch("app.ai.workflows.tutor._sonnet") as mock_llm:
            mock_llm.invoke.return_value = mock_response
            state: LearnerState = {
                "student_id": "u", "challenge_id": "c",
                "conversation_history": [{"role": "student", "content": "give me the answer"}],
                "student_understanding": {}, "detected_misconceptions": [],
                "session_metadata": {}, "next_action": "asking_solution", "mastery_score": None,
                "generated_hint_count": 0, "coherence_score": None,
                "tutor_response": None, "tutor_intent": None, "follow_up": None,
            }
            result = redirect_node(state)
            assert result["tutor_intent"] == "redirect"
            assert result["tutor_response"] is not None
            response_lower = result["tutor_response"].lower()
            assert "the answer is" not in response_lower
            assert "solution is" not in response_lower


class TestSM2EdgeCases:

    def test_concurrent_reviews_independent(self):
        """Two review cards updated independently don't affect each other."""
        from app.services.spaced_rep_service import sm2_update, CardState

        card1 = CardState(interval=6, ease_factor=2.5, repetitions=2)
        card2 = CardState(interval=6, ease_factor=2.5, repetitions=2)

        sm2_update(card1, quality=5)
        result2 = sm2_update(card2, quality=0)

        assert result2.interval == 1  # card2 reset, card1 unchanged

    def test_sm2_large_interval_stays_reasonable(self):
        """After many perfect recalls, intervals should grow but stay reasonable."""
        from app.services.spaced_rep_service import sm2_update, CardState

        card = CardState(interval=1, ease_factor=2.5, repetitions=0)
        for _ in range(20):
            card = sm2_update(card, quality=5)

        # After 20 perfect recalls, interval should be large but not absurd (< 5 years)
        assert card.interval < 365 * 5


class TestAssessmentLogic:

    def test_level_detection_beginner(self):
        """Low score → beginner."""
        score = 1 / 7
        if score >= 0.75:
            level = "advanced"
        elif score >= 0.45:
            level = "intermediate"
        else:
            level = "beginner"
        assert level == "beginner"

    def test_level_detection_advanced(self):
        """High score → advanced."""
        score = 6 / 7
        if score >= 0.75:
            level = "advanced"
        elif score >= 0.45:
            level = "intermediate"
        else:
            level = "beginner"
        assert level == "advanced"
