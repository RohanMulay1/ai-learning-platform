from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.db.database import create_tables
# Import all models so SQLAlchemy resolves relationships before first request
import app.models.user  # noqa: F401
import app.models.skill  # noqa: F401
import app.models.challenge  # noqa: F401
import app.models.review_card  # noqa: F401
import app.models.tutor_session  # noqa: F401
import app.models.badge  # noqa: F401
from app.api.routes import auth, assessment, challenges, spaced_rep, progress, simulation, chat, gamification

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Next-generation AI-powered learning platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=f"{PREFIX}/auth")
app.include_router(assessment.router, prefix=f"{PREFIX}/assessment")
app.include_router(challenges.router, prefix=f"{PREFIX}/challenges")
app.include_router(spaced_rep.router, prefix=f"{PREFIX}/review")
app.include_router(progress.router, prefix=f"{PREFIX}/progress")
app.include_router(simulation.router, prefix=f"{PREFIX}/simulation")
app.include_router(chat.router, prefix=f"{PREFIX}")
app.include_router(gamification.router, prefix=f"{PREFIX}")


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.app_name}


# Serve React frontend — must be last
_static_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
if _static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_static_dir / "assets")), name="assets")

    @app.get("/")
    async def root():
        return FileResponse(str(_static_dir / "index.html"))

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(str(_static_dir / "index.html"))
