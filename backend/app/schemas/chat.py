from pydantic import BaseModel
from typing import Literal


class TutorClientMessage(BaseModel):
    type: Literal["message", "voice", "code_request", "explanation"]
    content: str
    metadata: dict | None = None  # {language, challenge_id}


class TutorServerMessage(BaseModel):
    id: str
    type: Literal["guidance", "question", "feedback", "hint", "visualization", "error", "mastery_unlocked"]
    content: str
    intent: Literal["unblock", "deepen", "verify", "redirect", "celebrate"]
    follow_up: str | None = None
    visualization: dict | None = None
    mastery_signal: float | None = None   # 0-1
    audio_url: str | None = None          # ElevenLabs TTS URL


class SessionStartRequest(BaseModel):
    challenge_id: str | None = None
    topic: str | None = None


class SessionStartResponse(BaseModel):
    session_id: str
    greeting: str
    challenge_context: dict | None = None
