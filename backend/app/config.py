from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "LearnAI"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/learnai"
    redis_url: str = "redis://localhost:6379"

    secret_key: str = "changeme-in-production-use-256-bit-random"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    anthropic_api_key: str = ""
    openai_api_key: str = ""  # for embeddings fallback
    elevenlabs_api_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
