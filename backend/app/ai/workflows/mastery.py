"""
Real-time mastery detection workflow.
Fuses multiple signals: attempt count, code quality, explanation coherence.
"""
import json
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import get_settings

settings = get_settings()

_haiku = ChatAnthropic(
    model="claude-haiku-4-5-20251001",
    api_key=settings.anthropic_api_key,
    max_tokens=512,
)


async def analyze_code_quality(code: str, challenge_description: str) -> float:
    """Score code quality 0-1 using AI."""
    response = _haiku.invoke([
        SystemMessage(content=(
            "You are a code reviewer. Score the code's quality for solving the given problem. "
            "Consider: correctness approach, efficiency, clarity, edge case handling. "
            "Return ONLY a JSON: {score: 0.0-1.0, feedback: string}"
        )),
        HumanMessage(content=f"Problem: {challenge_description}\n\nCode:\n{code}"),
    ])
    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content)
        return float(parsed.get("score", 0.5)), parsed.get("feedback", "")
    except Exception:
        return 0.5, "Code reviewed."


async def compute_mastery_score(
    user_id: str,
    challenge,
    code: str,
    explanation: str | None,
    attempt_number: int,
) -> dict:
    """
    Multi-signal mastery score fusion.

    Signals:
    - attempt_factor: fewer attempts → higher score
    - code_quality: AI-rated code quality
    - explanation_coherence: explanation clarity (if provided)
    """
    code_quality, feedback = await analyze_code_quality(code, challenge.description)

    attempt_factor = max(0.0, 1.0 - (attempt_number - 1) * 0.12)

    if explanation:
        response = _haiku.invoke([
            SystemMessage(content=(
                "Rate how well this explanation demonstrates understanding of the problem. "
                "Return ONLY JSON: {coherence: 0.0-1.0}"
            )),
            HumanMessage(content=f"Problem: {challenge.description}\n\nExplanation: {explanation}"),
        ])
        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            coherence = float(json.loads(content).get("coherence", 0.5))
        except Exception:
            coherence = 0.5

        mastery = (0.35 * attempt_factor) + (0.35 * code_quality) + (0.30 * coherence)
    else:
        mastery = (0.45 * attempt_factor) + (0.55 * code_quality)

    mastery = max(0.0, min(1.0, mastery))

    return {
        "mastery_score": round(mastery, 3),
        "feedback": feedback,
        "attempt_factor": round(attempt_factor, 3),
        "code_quality": round(code_quality, 3),
        "runtime_ms": None,
    }
