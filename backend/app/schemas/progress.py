from pydantic import BaseModel
from typing import Literal


class SkillMasteryItem(BaseModel):
    skill_id: str
    skill_name: str
    mastery_level: float
    is_unlocked: bool
    problems_solved: int


class ProgressSnapshotResponse(BaseModel):
    skill_mastery: list[SkillMasteryItem]
    weak_areas: list[SkillMasteryItem]
    strengths: list[SkillMasteryItem]
    overall_mastery: float
    total_challenges_solved: int
    current_streak: int
    total_xp: int
    current_level: int


class MasteryTimelinePoint(BaseModel):
    timestamp: str
    skill_id: str
    skill_name: str
    mastery_score: float


class ProgressTimelineResponse(BaseModel):
    data: list[MasteryTimelinePoint]
    time_range: str


class HeatmapDay(BaseModel):
    date: str
    activity_count: int
    xp_earned: int


class HeatmapResponse(BaseModel):
    data: list[HeatmapDay]
    year: int
    total_active_days: int
    max_streak: int


class SessionRecapResponse(BaseModel):
    session_id: str
    recap: str
    key_takeaways: list[str]
    misconceptions_cleared: list[str]
    mastery_gained: float
    xp_earned: int
    suggested_next: str | None = None
