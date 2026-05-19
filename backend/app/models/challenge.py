import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    examples: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")
    estimated_time_minutes: Mapped[int] = mapped_column(Integer, default=30)
    companies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    skill_tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    hints: Mapped[list | None] = mapped_column(JSON, nullable=True)
    test_cases: Mapped[list | None] = mapped_column(JSON, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    base_challenge_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("challenges.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    attempts: Mapped[list["ChallengeAttempt"]] = relationship("ChallengeAttempt", back_populates="challenge")
    review_cards: Mapped[list["ReviewCard"]] = relationship("ReviewCard", back_populates="challenge")


class ChallengeAttempt(Base):
    __tablename__ = "challenge_attempts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    output: Mapped[str | None] = mapped_column(Text, nullable=True)
    runtime_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_used_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_cases_passed: Mapped[int] = mapped_column(Integer, default=0)
    test_cases_total: Mapped[int] = mapped_column(Integer, default=0)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_from_ai: Mapped[str | None] = mapped_column(Text, nullable=True)
    mastery_score: Mapped[float] = mapped_column(Float, default=0.0)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="attempts")
    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="attempts")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    skill_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    modules: Mapped[list | None] = mapped_column(JSON, nullable=True)
    estimated_hours: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


from app.models.user import User  # noqa: E402, F401
from app.models.review_card import ReviewCard  # noqa: E402, F401
