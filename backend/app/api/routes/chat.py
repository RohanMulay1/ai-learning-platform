import uuid
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.websockets import WebSocketState
import redis.asyncio as aioredis

from app.api.dependencies import get_redis, get_db
from app.schemas.chat import TutorClientMessage, TutorServerMessage, SessionStartRequest, SessionStartResponse
from app.ai.workflows.tutor import run_tutor_turn
from app.services.auth_service import decode_token, get_user_by_id
from app.db.database import AsyncSessionLocal

router = APIRouter(tags=["tutor"])


@router.post("/tutor/session", response_model=SessionStartResponse)
async def start_session(
    body: SessionStartRequest,
    redis: aioredis.Redis = Depends(get_redis),
):
    session_id = str(uuid.uuid4())
    session_state = {
        "session_id": session_id,
        "challenge_id": body.challenge_id,
        "conversation_history": [],
        "student_understanding": {},
        "detected_misconceptions": [],
        "generated_hint_count": 0,
    }
    await redis.setex(f"tutor_session:{session_id}", 3600, json.dumps(session_state))

    greeting = "Hi! I'm your AI tutor. I won't give you the answer directly, but I'll guide you to discover it yourself. What are you working on?"
    if body.challenge_id:
        greeting = f"Let's work through this challenge together. Tell me your initial thoughts — what approach comes to mind?"

    return SessionStartResponse(
        session_id=session_id,
        greeting=greeting,
        challenge_context={"challenge_id": body.challenge_id} if body.challenge_id else None,
    )


@router.websocket("/ws/tutor/{session_id}")
async def tutor_websocket(
    websocket: WebSocket,
    session_id: str,
    token: str,
    redis: aioredis.Redis = Depends(get_redis),
):
    await websocket.accept()

    # Authenticate via query param token
    try:
        payload = decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.send_json({"type": "error", "content": "Unauthorized"})
        await websocket.close(code=1008)
        return

    session_raw = await redis.get(f"tutor_session:{session_id}")
    if not session_raw:
        await websocket.send_json({"type": "error", "content": "Session not found"})
        await websocket.close(code=1011)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            client_msg = TutorClientMessage.model_validate_json(raw)

            session = json.loads(await redis.get(f"tutor_session:{session_id}") or "{}")
            session["conversation_history"].append({
                "role": "student",
                "content": client_msg.content,
                "type": client_msg.type,
            })

            response = await run_tutor_turn(
                session_state=session,
                student_message=client_msg.content,
                message_type=client_msg.type,
                metadata=client_msg.metadata or {},
            )

            session["conversation_history"].append({
                "role": "tutor",
                "content": response["content"],
                "intent": response["intent"],
            })
            session["detected_misconceptions"] = response.get("detected_misconceptions", session["detected_misconceptions"])

            await redis.setex(f"tutor_session:{session_id}", 3600, json.dumps(session))

            server_msg = TutorServerMessage(
                id=str(uuid.uuid4()),
                type=response["type"],
                content=response["content"],
                intent=response["intent"],
                follow_up=response.get("follow_up"),
                mastery_signal=response.get("mastery_signal"),
                visualization=response.get("visualization"),
            )
            await websocket.send_json(server_msg.model_dump())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.send_json({"type": "error", "content": str(e)})
