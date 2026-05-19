from pydantic import BaseModel
from typing import Literal


class AssessmentStartResponse(BaseModel):
    session_id: str
    question_id: str
    question: str
    options: list[str] | None = None
    question_type: Literal["multiple_choice", "code", "open_ended"] = "multiple_choice"
    skill_being_assessed: str


class AssessmentSubmitRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str


class AssessmentSubmitResponse(BaseModel):
    correct: bool
    explanation: str
    next_question: "AssessmentStartResponse | None" = None
    completed: bool = False
    questions_remaining: int = 0


class SkillGap(BaseModel):
    skill_id: str
    skill_name: str
    confidence: float  # 0-1 how confident we are this is a gap


class RoadmapModule(BaseModel):
    order: int
    skill_id: str
    skill_name: str
    estimated_hours: int
    challenges_count: int
    description: str


class AssessmentResultResponse(BaseModel):
    session_id: str
    detected_level: Literal["beginner", "intermediate", "advanced"]
    overall_score: float
    skill_gaps: list[SkillGap]
    strengths: list[str]
    recommended_roadmap: list[RoadmapModule]
    summary: str
