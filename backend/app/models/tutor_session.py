import uuid
from datetime import datetime
from sqlalchemy import Integer, Float, ForeignKey, DateTime, Text, String, JSON, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class TutorSession(Base):
    __tablename__ = "tutor_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("challenges.id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    conversation_turns: Mapped[int] = mapped_column(Integer, default=0)
    detected_misconceptions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    inferred_mastery_level: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="tutor_sessions")
    turns: Mapped[list["ConversationTurn"]] = relationship("ConversationTurn", back_populates="session", cascade="all, delete-orphan")
    telemetry: Mapped["SessionTelemetry | None"] = relationship("SessionTelemetry", back_populates="session", uselist=False, cascade="all, delete-orphan")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("tutor_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_number: Mapped[int] = mapped_column(Integer, nullable=False)
    student_message: Mapped[str] = mapped_column(Text, nullable=False)
    tutor_response: Mapped[str] = mapped_column(Text, nullable=False)
    tutor_intent: Mapped[str] = mapped_column(String(50), nullable=False)
    mastery_signal: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["TutorSession"] = relationship("TutorSession", back_populates="turns")


class SessionTelemetry(Base):
    """
    Aggregated editor + behavioral telemetry collected during a challenge session.
    Captured from Monaco editor events, batched every 5s via the WebSocket channel.
    Stored on session end. Powers archetype classification and P_b SM-2 adjustment.
    """
    __tablename__ = "session_telemetry"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("tutor_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    time_to_first_commit_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rewrite_density_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.0)
    execution_frequency_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paralysis_windows_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hint_velocity_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    error_repetition_frequency: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    # Archetype probability vector {fast_reckless, paralyzed, hint_dependent, pattern_memorizer}
    archetype_vector: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["TutorSession"] = relationship("TutorSession", back_populates="telemetry")


from app.models.user import User  # noqa: E402, F401
