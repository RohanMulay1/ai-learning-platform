"""
LangGraph-based Socratic tutor workflow.

Graph structure:
  START → router → [code_analyzer | coherence | redirect | code_analyzer]
        → misconception → socratic_q → mastery_check
        → [celebrate (if mastery > 0.75) | router (continue)]
"""
import json
from typing import Literal
from langgraph.graph import StateGraph, END
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from app.ai.state import LearnerState
from app.config import get_settings

settings = get_settings()

# Use Haiku for fast intent classification, Sonnet for quality responses
_haiku = ChatAnthropic(
    model="claude-haiku-4-5-20251001",
    api_key=settings.anthropic_api_key,
    max_tokens=256,
)
_sonnet = ChatAnthropic(
    model="claude-sonnet-4-6",
    api_key=settings.anthropic_api_key,
    max_tokens=1024,
)

SYSTEM_PROMPT = """You are a Socratic AI tutor. Your core rules:
1. NEVER give the answer directly — always guide via questions
2. Ask one focused question at a time
3. Detect misconceptions and address them specifically
4. Celebrate genuine insight and effort
5. When redirecting (student asks for solution): acknowledge the urge, offer a hint instead
"""


def router_node(state: LearnerState) -> LearnerState:
    """Classify student intent using fast model."""
    last_msg = state["conversation_history"][-1]["content"] if state["conversation_history"] else ""

    response = _haiku.invoke([
        SystemMessage(content=(
            "Classify the student's message into exactly one category. "
            "Reply with ONLY the category word.\n"
            "Categories:\n"
            "- stuck_on_code: student has code and is stuck\n"
            "- explaining_concept: student is explaining their understanding\n"
            "- asking_solution: student wants the answer/solution\n"
            "- showing_work: student is sharing code for review\n"
            "- general_question: general question about the topic"
        )),
        HumanMessage(content=last_msg),
    ])

    action = response.content.strip().lower()
    valid = {"stuck_on_code", "explaining_concept", "asking_solution", "showing_work", "general_question"}
    if action not in valid:
        action = "general_question"

    return {**state, "next_action": action}


def code_analyzer_node(state: LearnerState) -> LearnerState:
    """Analyze code for bugs, patterns, and issues without giving the answer."""
    last_msg = state["conversation_history"][-1]["content"]

    response = _sonnet.invoke([
        SystemMessage(content=SYSTEM_PROMPT + (
            "\nAnalyze the student's code. Identify: "
            "1) What they are trying to do, "
            "2) The specific issue (don't state it directly), "
            "3) A Socratic question that helps them see the issue themselves. "
            "Return JSON: {issue_type, socratic_question, misconception_detected}"
        )),
        HumanMessage(content=f"Student code/message: {last_msg}"),
    ])

    try:
        parsed = json.loads(response.content)
    except Exception:
        parsed = {
            "issue_type": "logic",
            "socratic_question": "What does this part of your code return when the input is empty?",
            "misconception_detected": None,
        }

    misconceptions = state["detected_misconceptions"]
    if parsed.get("misconception_detected"):
        misconceptions = misconceptions + [parsed["misconception_detected"]]

    return {
        **state,
        "tutor_response": parsed["socratic_question"],
        "tutor_intent": "unblock",
        "detected_misconceptions": misconceptions,
    }


def coherence_analyzer_node(state: LearnerState) -> LearnerState:
    """Evaluate how coherent the student's explanation is."""
    last_msg = state["conversation_history"][-1]["content"]

    response = _sonnet.invoke([
        SystemMessage(content=(
            "Evaluate the student's explanation of a concept. "
            "Score coherence 0.0-1.0 and identify any gaps. "
            "Return JSON: {coherence_score, gaps, follow_up_question, misconception}"
        )),
        HumanMessage(content=f"Student explanation: {last_msg}"),
    ])

    try:
        parsed = json.loads(response.content)
        coherence = float(parsed.get("coherence_score", 0.5))
        follow_up = parsed.get("follow_up_question", "Can you explain that in a different way?")
        misconception = parsed.get("misconception")
    except Exception:
        coherence = 0.5
        follow_up = "That's interesting — can you walk me through a specific example?"
        misconception = None

    misconceptions = state["detected_misconceptions"]
    if misconception:
        misconceptions = misconceptions + [misconception]

    return {
        **state,
        "coherence_score": coherence,
        "follow_up": follow_up,
        "tutor_intent": "deepen",
        "detected_misconceptions": misconceptions,
    }


def misconception_node(state: LearnerState) -> LearnerState:
    """Generate a targeted response to address detected misconceptions."""
    if not state["detected_misconceptions"]:
        return {**state, "tutor_response": state.get("tutor_response") or state.get("follow_up", "Keep going, you're on the right track!")}

    misconception = state["detected_misconceptions"][-1]
    response = _sonnet.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=(
            f"The student has the following misconception: '{misconception}'. "
            "Ask a single Socratic question that will help them discover the correct understanding. "
            "Be encouraging. Don't state the misconception directly."
        )),
    ])

    return {**state, "tutor_response": response.content, "tutor_intent": "verify"}


def socratic_q_node(state: LearnerState) -> LearnerState:
    """Generate progressive hint question if not already set."""
    if state.get("tutor_response"):
        return state

    hint_count = state.get("generated_hint_count", 0)
    last_msg = state["conversation_history"][-1]["content"] if state["conversation_history"] else ""

    if hint_count == 0:
        prompt = f"Ask a broad guiding question about: {last_msg}"
    elif hint_count == 1:
        prompt = f"Ask a more specific follow-up about: {last_msg}. They need more direction."
    else:
        prompt = f"Give a near-direct hint (but not the answer) about: {last_msg}. They're really stuck."

    response = _sonnet.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=prompt)])
    return {
        **state,
        "tutor_response": response.content,
        "tutor_intent": "unblock",
        "generated_hint_count": hint_count + 1,
    }


def redirect_node(state: LearnerState) -> LearnerState:
    """Student asked for the answer — redirect to hint system."""
    response = _sonnet.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=(
            "The student asked for the answer directly. "
            "Kindly acknowledge their frustration, explain that giving the answer would rob them of the learning moment, "
            "and offer a specific first hint instead. Keep it warm and encouraging."
        )),
    ])
    return {**state, "tutor_response": response.content, "tutor_intent": "redirect"}


def mastery_check_node(state: LearnerState) -> LearnerState:
    """Multi-signal mastery score fusion."""
    history = state["conversation_history"]
    # Attempt count proxy: number of student messages in this session
    student_msgs = sum(1 for m in history if m.get("role") == "student")
    attempt_factor = max(0, 1 - (student_msgs - 1) * 0.1)

    coherence = state.get("coherence_score") or 0.5
    misconception_penalty = len(state["detected_misconceptions"]) * 0.15

    mastery = (
        0.40 * attempt_factor +
        0.40 * coherence +
        0.20 * max(0, 1 - misconception_penalty)
    )
    mastery = max(0.0, min(1.0, mastery))
    return {**state, "mastery_score": mastery}


def celebrate_node(state: LearnerState) -> LearnerState:
    """Student has reached mastery threshold."""
    response = _sonnet.invoke([
        SystemMessage(content="You are an enthusiastic tutor."),
        HumanMessage(content=(
            "The student has just demonstrated strong understanding of this concept. "
            "Write a brief, genuine celebration message (2-3 sentences) and suggest what to explore next."
        )),
    ])
    return {
        **state,
        "tutor_response": response.content,
        "tutor_intent": "celebrate",
        "next_action": "mastery_unlocked",
    }


def route_from_router(state: LearnerState) -> str:
    action = state.get("next_action", "general_question")
    routes = {
        "stuck_on_code": "code_analyzer",
        "explaining_concept": "coherence",
        "asking_solution": "redirect",
        "showing_work": "code_analyzer",
        "general_question": "socratic_q",
    }
    return routes.get(action, "socratic_q")


def route_after_mastery_check(state: LearnerState) -> str:
    if (state.get("mastery_score") or 0) >= 0.75:
        return "celebrate"
    return END


def build_tutor_graph() -> StateGraph:
    g = StateGraph(LearnerState)

    g.add_node("router", router_node)
    g.add_node("code_analyzer", code_analyzer_node)
    g.add_node("coherence", coherence_analyzer_node)
    g.add_node("redirect", redirect_node)
    g.add_node("misconception", misconception_node)
    g.add_node("socratic_q", socratic_q_node)
    g.add_node("mastery_check", mastery_check_node)
    g.add_node("celebrate", celebrate_node)

    g.set_entry_point("router")

    g.add_conditional_edges("router", route_from_router, {
        "code_analyzer": "code_analyzer",
        "coherence": "coherence",
        "redirect": "redirect",
        "socratic_q": "socratic_q",
    })

    g.add_edge("code_analyzer", "misconception")
    g.add_edge("coherence", "misconception")
    g.add_edge("misconception", "socratic_q")
    g.add_edge("socratic_q", "mastery_check")
    g.add_edge("redirect", END)

    g.add_conditional_edges("mastery_check", route_after_mastery_check, {
        "celebrate": "celebrate",
        END: END,
    })
    g.add_edge("celebrate", END)

    return g.compile()


_tutor_graph = None


def get_tutor_graph():
    global _tutor_graph
    if _tutor_graph is None:
        _tutor_graph = build_tutor_graph()
    return _tutor_graph


async def run_tutor_turn(
    session_state: dict,
    student_message: str,
    message_type: str,
    metadata: dict,
) -> dict:
    """Entry point called from WebSocket route."""
    graph = get_tutor_graph()

    state: LearnerState = {
        "student_id": session_state.get("student_id", ""),
        "challenge_id": session_state.get("challenge_id"),
        "conversation_history": session_state.get("conversation_history", []),
        "student_understanding": session_state.get("student_understanding", {}),
        "detected_misconceptions": session_state.get("detected_misconceptions", []),
        "session_metadata": metadata,
        "next_action": "",
        "mastery_score": None,
        "generated_hint_count": session_state.get("generated_hint_count", 0),
        "coherence_score": None,
        "tutor_response": None,
        "tutor_intent": None,
        "follow_up": None,
    }

    # Add current message to history for graph processing
    state["conversation_history"] = state["conversation_history"] + [
        {"role": "student", "content": student_message, "type": message_type}
    ]

    result = await graph.ainvoke(state)

    response_type = "guidance"
    if result.get("next_action") == "mastery_unlocked":
        response_type = "mastery_unlocked"
    elif result.get("tutor_intent") == "redirect":
        response_type = "hint"

    return {
        "type": response_type,
        "content": result.get("tutor_response", "Tell me more about your thinking."),
        "intent": result.get("tutor_intent", "unblock"),
        "follow_up": result.get("follow_up"),
        "mastery_signal": result.get("mastery_score"),
        "detected_misconceptions": result.get("detected_misconceptions", []),
        "visualization": None,
    }
