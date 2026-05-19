from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_current_user
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.services.auth_service import (
    register_user, authenticate_user, create_access_token,
    create_refresh_token, decode_token, get_user_by_id,
)
from app.config import get_settings
from app.models.user import User

router = APIRouter(tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await register_user(db, body.email, body.password, body.first_name, body.last_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await authenticate_user(db, body.email, body.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = payload["sub"]
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    level = current_user.level
    streak = current_user.streak
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        current_level=level.current_level if level else 1,
        current_xp=level.current_xp if level else 0,
        current_streak=streak.current_streak if streak else 0,
    )
