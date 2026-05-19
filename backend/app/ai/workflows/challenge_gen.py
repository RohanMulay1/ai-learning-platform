"""
Challenge generation workflow using LangGraph.

Graph:
  START → extract_pattern → generate_variant → feasibility_check
        → [retry (max 3) | add_to_output → END]
"""
import json
import uuid
from langgraph.graph import StateGraph, END
from typing import TypedDict
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import get_settings

settings = get_settings()

_sonnet = ChatAnthropic(
    model="claude-sonnet-4-6",
    api_key=settings.anthropic_api_key,
    max_tokens=2048,
)


class ChallengeGenState(TypedDict):
    skill_id: str
    difficulty: str
    topic: str | None
    retry_count: int
    generated_challenge: dict | None
    feasible: bool
    error: str | None


CHALLENGE_SYSTEM = """Generate a coding challenge as valid JSON (no markdown):
{
  "title": "...",
  "description": "...",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": "...",
  "hints": [
    {"level": 1, "content": "broad hint"},
    {"level": 2, "content": "specific hint"},
    {"level": 3, "content": "near-solution hint"}
  ],
  "test_cases": [{"input": "...", "expected_output": "..."}],
  "solution": "reference solution code"
}"""


def extract_pattern_node(state: ChallengeGenState) -> ChallengeGenState:
    return state


def generate_variant_node(state: ChallengeGenState) -> ChallengeGenState:
    topic = state.get("topic") or state["skill_id"].replace("_", " ")
    retry = state.get("retry_count", 0)
    twists = ["", " with an additional space constraint", " using only recursion", " optimized for large inputs"]
    twist = twists[min(retry, len(twists) - 1)]

    response = _sonnet.invoke([
        SystemMessage(content=CHALLENGE_SYSTEM),
        HumanMessage(content=(
            f"Create a {state['difficulty']}-level coding challenge about '{topic}'{twist}. "
            f"Make it practical and interview-style."
        )),
    ])

    try:
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        challenge = json.loads(content)
        return {**state, "generated_challenge": challenge, "error": None}
    except Exception as e:
        return {**state, "generated_challenge": None, "error": str(e)}


def feasibility_check_node(state: ChallengeGenState) -> ChallengeGenState:
    challenge = state.get("generated_challenge")
    if not challenge:
        return {**state, "feasible": False}

    required_fields = ["title", "description", "examples", "test_cases"]
    feasible = all(challenge.get(f) for f in required_fields)
    return {**state, "feasible": feasible}


def should_retry(state: ChallengeGenState) -> str:
    if state["feasible"]:
        return "done"
    if state.get("retry_count", 0) >= 2:
        return "done"  # Use whatever we have after 3 tries
    return "retry"


def retry_node(state: ChallengeGenState) -> ChallengeGenState:
    return {**state, "retry_count": state.get("retry_count", 0) + 1}


def build_challenge_gen_graph():
    g = StateGraph(ChallengeGenState)
    g.add_node("extract_pattern", extract_pattern_node)
    g.add_node("generate_variant", generate_variant_node)
    g.add_node("feasibility_check", feasibility_check_node)
    g.add_node("retry", retry_node)

    g.set_entry_point("extract_pattern")
    g.add_edge("extract_pattern", "generate_variant")
    g.add_edge("generate_variant", "feasibility_check")
    g.add_conditional_edges("feasibility_check", should_retry, {
        "done": END,
        "retry": "retry",
    })
    g.add_edge("retry", "generate_variant")
    return g.compile()


_challenge_gen_graph = None


def get_challenge_gen_graph():
    global _challenge_gen_graph
    if _challenge_gen_graph is None:
        _challenge_gen_graph = build_challenge_gen_graph()
    return _challenge_gen_graph


async def generate_challenge_variant(skill_id: str, difficulty: str, topic: str | None = None) -> dict:
    graph = get_challenge_gen_graph()
    result = await graph.ainvoke({
        "skill_id": skill_id,
        "difficulty": difficulty,
        "topic": topic,
        "retry_count": 0,
        "generated_challenge": None,
        "feasible": False,
        "error": None,
    })

    challenge = result.get("generated_challenge") or {}
    # Ensure all required fields exist
    return {
        "title": challenge.get("title", f"{difficulty.title()} {skill_id.replace('_', ' ').title()} Challenge"),
        "description": challenge.get("description", "Solve this coding challenge."),
        "examples": challenge.get("examples", []),
        "constraints": challenge.get("constraints", "1 <= n <= 10^4"),
        "hints": challenge.get("hints", []),
        "test_cases": challenge.get("test_cases", []),
        "solution": challenge.get("solution"),
    }
