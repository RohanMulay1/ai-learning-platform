from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
import operator


class LearnerState(TypedDict):
    """Shared state flowing through all LangGraph nodes."""
    student_id: str
    challenge_id: str | None
    conversation_history: list[dict]              # {role, content, type}
    student_understanding: dict[str, float]       # concept → confidence 0-1
    detected_misconceptions: list[str]
    session_metadata: dict
    next_action: str                              # routing signal from classifier
    mastery_score: float | None
    generated_hint_count: int
    coherence_score: float | None
    tutor_response: str | None
    tutor_intent: str | None
    follow_up: str | None
