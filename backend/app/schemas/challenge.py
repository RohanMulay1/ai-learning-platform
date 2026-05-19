from pydantic import BaseModel, Field
from typing import Literal
import uuid


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    examples: list | None = None
    constraints: str | None = None
    difficulty: str
    estimated_time_minutes: int
    companies: list | None = None
    skill_tags: list | None = None
    hints: list | None = None
    is_generated: bool = False

    model_config = {"from_attributes": True}


class ChallengeListResponse(BaseModel):
    items: list[ChallengeResponse]
    total: int
    page: int
    has_more: bool


class ChallengeAttemptRequest(BaseModel):
    code: str = Field(min_length=1)
    language: Literal["python", "javascript", "typescript"]
    explanation: str | None = None


class ChallengeAttemptResponse(BaseModel):
    attempt_id: str
    status: Literal["success", "error", "timeout", "pending"]
    output: str
    runtime_ms: int | None = None
    test_cases_passed: int
    test_cases_total: int
    feedback: str
    mastery_score: float = Field(ge=0, le=1)
    xp_earned: int


class HintRequest(BaseModel):
    hint_level: int = Field(ge=1, le=3)


class HintResponse(BaseModel):
    hint: str
    hint_level: int
    xp_penalty: int


class ChallengeGenerateRequest(BaseModel):
    skill_id: str
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    topic: str | None = None
