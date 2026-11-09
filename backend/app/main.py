import sys
from pathlib import Path

# Ensure backend directory is in sys.path when running from workspace root
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import engine, Base
from app.services.fleet_manager import fleet_manager
from app.services.recording_service import recording_service
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.robots import router as robots_router
from app.api.simulation import router as simulation_router
from app.api.sessions import router as sessions_router
from app.websocket.handler import router as ws_router

# Setup structured logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Starting Fleet Manager physics loop...")
    await fleet_manager.start()
    
    logger.info("Starting Recording Service worker...")
    await recording_service.start()
    
    yield
    
    logger.info("Shutting down background services...")
    await fleet_manager.stop()
    await recording_service.stop()
    logger.info("Shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real-Time Robot Teleoperation & Network Reliability Simulator API Gateway",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routers
app.include_router(health_router, prefix="/api", tags=["System Health"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication & Operators"])
app.include_router(robots_router, prefix="/api/robots", tags=["Fleet Management"])
app.include_router(simulation_router, prefix="/api/simulation", tags=["Simulation Environment"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["Recording & Replay"])

# WebSocket Routers
app.include_router(ws_router, tags=["Real-Time WebSockets"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
