"""
FastAPI application with embedded web frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from pathlib import Path

from app.config import get_settings
from app.api.routes import router


settings = get_settings()
BASE_DIR = Path(__file__).parent
FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"
LEGACY_FRONTEND_INDEX = BASE_DIR / "frontend" / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"Starting {settings.app_name}...")
    yield
    print("Shutting down...")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if not settings.debug else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api", tags=["chat"])


if FRONTEND_DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST_DIR), html=True), name="frontend")
else:
    @app.get("/")
    async def serve_frontend():
        """Serve the legacy web frontend fallback."""
        if LEGACY_FRONTEND_INDEX.exists():
            return FileResponse(str(LEGACY_FRONTEND_INDEX))
        return JSONResponse({"error": "Frontend not found"}, status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
