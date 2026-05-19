import uuid
from datetime import datetime, date
from sqlalchemy import Integer, Float, ForeignKey, DateTime, Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class ReviewCard(Base):
    __tablename__ = "review_cards"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    challenge_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), primary_key=True)
    interval: Mapped[int] = mapped_column(Integer, default=1)
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5)
    repetitions: Mapped[int] = mapped_column(Integer, default=0)
    next_review_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    last_reviewed: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    difficulty_rating: Mapped[str] = mapped_column(String(20), default="medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship("User", back_populates="review_cards")
    challenge: Mapped["Challenge"] = relationship("Challenge", back_populates="review_cards")
    logs: Mapped[list["ReviewLog"]] = relationship("ReviewLog", back_populates="card", cascade="all, delete-orphan",
                                                    primaryjoin="and_(ReviewCard.user_id==foreign(ReviewLog.user_id), ReviewCard.challenge_id==foreign(ReviewLog.challenge_id))")


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    challenge_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False)
    quality: Mapped[int] = mapped_column(Integer, nullable=False)
    old_interval: Mapped[int] = mapped_column(Integer, nullable=False)
    new_interval: Mapped[int] = mapped_column(Integer, nullable=False)
    old_ease_factor: Mapped[float] = mapped_column(Float, nullable=False)
    new_ease_factor: Mapped[float] = mapped_column(Float, nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    card: Mapped["ReviewCard"] = relationship(
        "ReviewCard",
        foreign_keys=[user_id, challenge_id],
        primaryjoin="and_(ReviewLog.user_id==ReviewCard.user_id, ReviewLog.challenge_id==ReviewCard.challenge_id)",
        back_populates="logs",
    )


from app.models.user import User  # noqa: E402, F401
from app.models.challenge import Challenge  # noqa: E402, F401
