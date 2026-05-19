import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="general")
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    estimated_hours: Mapped[int] = mapped_column(Integer, default=5)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    prerequisites: Mapped[list["SkillPrerequisite"]] = relationship(
        "SkillPrerequisite", foreign_keys="SkillPrerequisite.skill_id", back_populates="skill"
    )
    dependents: Mapped[list["SkillPrerequisite"]] = relationship(
        "SkillPrerequisite", foreign_keys="SkillPrerequisite.prerequisite_id", back_populates="prerequisite"
    )
    user_masteries: Mapped[list["UserSkillMastery"]] = relationship("UserSkillMastery", back_populates="skill")


class SkillPrerequisite(Base):
    __tablename__ = "skill_prerequisites"

    skill_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)

    skill: Mapped["Skill"] = relationship("Skill", foreign_keys=[skill_id], back_populates="prerequisites")
    prerequisite: Mapped["Skill"] = relationship("Skill", foreign_keys=[prerequisite_id], back_populates="dependents")


class UserSkillMastery(Base):
    __tablename__ = "user_skill_mastery"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    mastery_level: Mapped[float] = mapped_column(Float, default=0.0)
    is_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_practiced: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    problems_solved: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship("User", back_populates="skill_masteries")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="user_masteries")


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("skills.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    misconceptions: Mapped[list["Misconception"]] = relationship("Misconception", back_populates="concept")


class Misconception(Base):
    __tablename__ = "misconceptions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    concept_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("concepts.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="medium")
    correction: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    concept: Mapped["Concept"] = relationship("Concept", back_populates="misconceptions")


# avoid circular import — import at module level only
from app.models.user import User  # noqa: E402, F401
