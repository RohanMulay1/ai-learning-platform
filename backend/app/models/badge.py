import uuid
from datetime import datetime
from sqlalchemy import Integer, Float, ForeignKey, DateTime, Text, String, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    rarity: Mapped[str] = mapped_column(String(20), default="common")
    requirements: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=100)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user_progress: Mapped[list["UserBadgeProgress"]] = relationship("UserBadgeProgress", back_populates="badge")


class UserBadgeProgress(Base):
    __tablename__ = "user_badge_progress"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    badge_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="locked")
    completion_percentage: Mapped[int] = mapped_column(Integer, default=0)
    earned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_masterpiece: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User", back_populates="badge_progress")
    badge: Mapped["Badge"] = relationship("Badge", back_populates="user_progress")


from app.models.user import User  # noqa: E402, F401
