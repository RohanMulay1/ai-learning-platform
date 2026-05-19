from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import decode_token, get_user_by_id
from app.models.user import User

bearer_scheme = HTTPBearer()

# Use fakeredis so we don't need a real Redis server
try:
    import fakeredis.aioredis as fakeredis_aio
    _redis_instance = fakeredis_aio.FakeRedis(decode_responses=True)
    _use_fake = True
except ImportError:
    _use_fake = False

import redis.asyncio as aioredis
from app.config import get_settings
settings = get_settings()

_redis_pool = None


async def get_redis():
    global _redis_pool
    if _use_fake:
        return _redis_instance
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_pool


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        user_id: str = payload["sub"]
    except (ValueError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
