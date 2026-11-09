import time
from fastapi import APIRouter
from app.services.fleet_manager import fleet_manager
from app.websocket.connection_manager import ws_manager
from app.core.config import settings

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
def get_health():
    uptime = round(time.time() - START_TIME, 2)
    active_ws_count = sum(len(conns) for conns in ws_manager.active_connections.values())
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_sec": uptime,
        "fleet_size": len(fleet_manager.robots),
        "active_websockets": active_ws_count
    }
