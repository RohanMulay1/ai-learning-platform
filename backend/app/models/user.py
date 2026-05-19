import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Integer, Float, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    preferences: Mapped["UserPreferences"] = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    level: Mapped["UserLevel"] = relationship("UserLevel", back_populates="user", uselist=False, cascade="all, delete-orphan")
    streak: Mapped["UserStreak"] = relationship("UserStreak", back_populates="user", uselist=False, cascade="all, delete-orphan")
    skill_masteries: Mapped[list["UserSkillMastery"]] = relationship("UserSkillMastery", back_populates="user", cascade="all, delete-orphan")
    attempts: Mapped[list["ChallengeAttempt"]] = relationship("ChallengeAttempt", back_populates="user", cascade="all, delete-orphan")
    review_cards: Mapped[list["ReviewCard"]] = relationship("ReviewCard", back_populates="user", cascade="all, delete-orphan")
    tutor_sessions: Mapped[list["TutorSession"]] = relationship("TutorSession", back_populates="user", cascade="all, delete-orphan")
    badge_progress: Mapped[list["UserBadgeProgress"]] = relationship("UserBadgeProgress", back_populates="user", cascade="all, delete-orphan")
    streak_freeze: Mapped["UserStreakFreeze"] = relationship("UserStreakFreeze", back_populates="user", uselist=False, cascade="all, delete-orphan")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[str] = mapped_column(String(20), default="dark")
    language: Mapped[str] = mapped_column(String(5), default="en")
    daily_xp_goal: Mapped[int] = mapped_column(Integer, default=500)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship("User", back_populates="preferences")


class UserLevel(Base):
    __tablename__ = "user_levels"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    current_xp: Mapped[int] = mapped_column(Integer, default=0)
    total_xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    last_level_up: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="level")


class UserStreak(Base):
    __tablename__ = "user_streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    streak_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_activity_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="streak")


class UserXPLedger(Base):
    __tablename__ = "user_xp_ledger"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    xp_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    related_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UserStreakFreeze(Base):
    """Streak insurance — earned freezes protect streak when user misses a day."""
    __tablename__ = "user_streak_freezes"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    freezes_available: Mapped[int] = mapped_column(Integer, default=0)
    freezes_used_total: Mapped[int] = mapped_column(Integer, default=0)
    last_freeze_earned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_freeze_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="streak_freeze")
