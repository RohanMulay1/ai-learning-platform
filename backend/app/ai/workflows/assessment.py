"""
Adaptive assessment workflow using LangGraph.
Determines learner level (beginner/intermediate/advanced) via a 7-question adaptive quiz.
"""
import uuid
import json
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import get_settings

settings = get_settings()

_sonnet = ChatAnthropic(
    model="claude-sonnet-4-6",
    api_key=settings.anthropic_api_key,
    max_tokens=1024,
)

QUESTION_SYSTEM = """You are generating adaptive quiz questions to assess a learner's skill level.
Generate a single multiple-choice question. Return ONLY valid JSON, no markdown:
{
  "id": "<uuid>",
  "text": "<question text>",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct": "A",
  "explanation": "<why the answer is correct>",
  "skill": "<skill_being_tested>",
  "type": "multiple_choice",
  "difficulty": "beginner|intermediate|advanced"
}"""


async def run_assessment_workflow(session_id: str, topic: str, phase: str, session: dict | None = None) -> dict:
    """Generate the next adaptive question based on session state."""
    if session is None:
        # First question — start easy
        prompt = f"Generate a BEGINNER-level question about {topic}."
    else:
        score = session.get("correct", 0)
        asked = session.get("questions_asked", 0)
        rate = score / asked if asked else 0

        if rate >= 0.8:
            level = "ADVANCED"
        elif rate >= 0.5:
            level = "INTERMEDIATE"
        else:
            level = "BEGINNER"

        prompt = (
            f"Generate a {level}-level question about {topic}. "
            f"So far the student got {score}/{asked} correct. "
            f"Focus on skills they may be weak in: {list(session.get('skill_scores', {}).keys())}"
        )

    response = _sonnet.invoke([
        SystemMessage(content=QUESTION_SYSTEM),
        HumanMessage(content=prompt),
    ])

    try:
        # Strip markdown fences if present
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        question = json.loads(content)
        if "id" not in question:
            question["id"] = str(uuid.uuid4())
        return question
    except Exception:
        # Fallback question
        return {
            "id": str(uuid.uuid4()),
            "text": f"What is a key concept in {topic}?",
            "options": ["A) Variables", "B) Functions", "C) Loops", "D) All of the above"],
            "correct": "D",
            "explanation": "All are fundamental programming concepts.",
            "skill": topic,
            "type": "multiple_choice",
            "difficulty": "beginner",
        }


async def evaluate_answer(question: dict, student_answer: str) -> dict:
    """Evaluate a student's answer against the correct answer."""
    correct_letter = question.get("correct", "A")
    # Normalize: check if student answer starts with correct letter
    is_correct = student_answer.strip().upper().startswith(correct_letter.upper())

    return {
        "correct": is_correct,
        "explanation": question.get("explanation", "Review this concept carefully."),
        "correct_answer": question.get("correct"),
    }
