import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.api.dependencies import get_db, get_current_user, get_redis
from app.schemas.assessment import (
    AssessmentStartResponse, AssessmentSubmitRequest, AssessmentSubmitResponse,
    AssessmentResultResponse, SkillGap, RoadmapModule,
)
from app.models.user import User
from app.ai.workflows.assessment import run_assessment_workflow, evaluate_answer

router = APIRouter(tags=["assessment"])


@router.post("/start", response_model=AssessmentStartResponse)
async def start_assessment(
    topic: str = "programming",
    current_user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    session_id = str(uuid.uuid4())
    question = await run_assessment_workflow(session_id, topic, "start")

    session_data = {
        "user_id": str(current_user.id),
        "topic": topic,
        "questions_asked": 0,
        "correct": 0,
        "skill_scores": {},
        "current_question": question,
    }
    await redis.setex(f"assessment:{session_id}", 3600, json.dumps(session_data))

    return AssessmentStartResponse(
        session_id=session_id,
        question_id=question["id"],
        question=question["text"],
        options=question.get("options"),
        question_type=question.get("type", "multiple_choice"),
        skill_being_assessed=question.get("skill", topic),
    )


@router.post("/submit", response_model=AssessmentSubmitResponse)
async def submit_answer(
    body: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    session_raw = await redis.get(f"assessment:{body.session_id}")
    if not session_raw:
        raise HTTPException(status_code=404, detail="Assessment session not found or expired")

    session = json.loads(session_raw)
    current_q = session["current_question"]

    result = await evaluate_answer(current_q, body.answer)
    session["questions_asked"] += 1
    if result["correct"]:
        session["correct"] += 1
    skill = current_q.get("skill", "general")
    if skill not in session["skill_scores"]:
        session["skill_scores"][skill] = []
    session["skill_scores"][skill].append(1 if result["correct"] else 0)

    completed = session["questions_asked"] >= 7
    next_q = None

    if not completed:
        next_q_data = await run_assessment_workflow(body.session_id, session["topic"], "next", session)
        session["current_question"] = next_q_data
        next_q = AssessmentStartResponse(
            session_id=body.session_id,
            question_id=next_q_data["id"],
            question=next_q_data["text"],
            options=next_q_data.get("options"),
            question_type=next_q_data.get("type", "multiple_choice"),
            skill_being_assessed=next_q_data.get("skill", session["topic"]),
        )

    if completed:
        session["completed"] = True
    await redis.setex(f"assessment:{body.session_id}", 3600, json.dumps(session))

    return AssessmentSubmitResponse(
        correct=result["correct"],
        explanation=result["explanation"],
        next_question=next_q,
        completed=completed,
        questions_remaining=max(0, 7 - session["questions_asked"]),
    )


@router.get("/result/{session_id}", response_model=AssessmentResultResponse)
async def get_result(
    session_id: str,
    current_user: User = Depends(get_current_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    session_raw = await redis.get(f"assessment:{session_id}")
    if not session_raw:
        raise HTTPException(status_code=404, detail="Session not found")

    session = json.loads(session_raw)
    skill_scores = session.get("skill_scores", {})
    total = session.get("questions_asked", 1)
    correct = session.get("correct", 0)
    overall_score = correct / total if total else 0

    if overall_score >= 0.75:
        level = "advanced"
    elif overall_score >= 0.45:
        level = "intermediate"
    else:
        level = "beginner"

    skill_gaps = [
        SkillGap(
            skill_id=skill,
            skill_name=skill.replace("_", " ").title(),
            confidence=1.0 - (sum(scores) / len(scores)) if scores else 1.0,
        )
        for skill, scores in skill_scores.items()
        if scores and (sum(scores) / len(scores)) < 0.7
    ]

    roadmap = [
        RoadmapModule(
            order=i + 1,
            skill_id=gap.skill_id,
            skill_name=gap.skill_name,
            estimated_hours=5,
            challenges_count=10,
            description=f"Build mastery in {gap.skill_name}",
        )
        for i, gap in enumerate(skill_gaps[:5])
    ]

    return AssessmentResultResponse(
        session_id=session_id,
        detected_level=level,
        overall_score=overall_score,
        skill_gaps=skill_gaps,
        strengths=[s for s, sc in skill_scores.items() if sc and sum(sc) / len(sc) >= 0.7],
        recommended_roadmap=roadmap,
        summary=f"You scored {round(overall_score * 100)}%. Detected level: {level}.",
    )
