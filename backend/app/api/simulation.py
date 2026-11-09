from fastapi import APIRouter
from app.services.fleet_manager import fleet_manager

router = APIRouter()

@router.get("/environment")
def get_environment():
    env = fleet_manager.shared_environment
    return {
        "bounds": {
            "min_x": env.min_x,
            "max_x": env.max_x,
            "min_y": env.min_y,
            "max_y": env.max_y
        },
        "obstacles": env.get_obstacles_metadata()
    }
