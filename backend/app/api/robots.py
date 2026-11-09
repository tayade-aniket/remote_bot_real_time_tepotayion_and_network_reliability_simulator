from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.services.fleet_manager import fleet_manager
from app.schemas.network import NetworkConfig, NetworkMetrics
from app.schemas.robot import RobotCreate

router = APIRouter()

@router.get("")
def list_robots():
    return fleet_manager.list_robots()

@router.get("/{robot_id}")
def get_robot_details(robot_id: str):
    engine = fleet_manager.get_robot(robot_id)
    if not engine:
        raise HTTPException(status_code=404, detail=f"Robot '{robot_id}' not found")
    
    metrics = fleet_manager.get_metrics_tracker(robot_id)
    net_sim = fleet_manager.get_network_sim(robot_id)
    
    return {
        "engine": engine.get_telemetry_dict(),
        "network_config": net_sim.config.model_dump() if net_sim else None,
        "metrics": metrics.get_metrics().model_dump() if metrics else None
    }

@router.post("")
def create_robot(payload: RobotCreate):
    engine = fleet_manager.add_robot(payload.id, payload.name)
    return {
        "id": engine.robot_id,
        "name": engine.name,
        "status": engine.operating_mode
    }

@router.delete("/{robot_id}")
def delete_robot(robot_id: str):
    deleted = fleet_manager.delete_robot(robot_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Robot not found")
    return {"status": "deleted", "robot_id": robot_id}

@router.post("/{robot_id}/reset")
def reset_robot(robot_id: str, x: float = -3.0, y: float = -3.0, theta: float = 0.0):
    engine = fleet_manager.get_robot(robot_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Robot not found")
    engine.reset_position(x, y, theta)
    return {"status": "reset", "robot_id": robot_id, "position": {"x": x, "y": y}}

@router.get("/{robot_id}/network", response_model=NetworkMetrics)
def get_robot_network_metrics(robot_id: str):
    metrics = fleet_manager.get_metrics_tracker(robot_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="Robot not found")
    return metrics.get_metrics()

@router.put("/{robot_id}/network")
def update_robot_network_config(robot_id: str, config: NetworkConfig):
    net_sim = fleet_manager.get_network_sim(robot_id)
    if not net_sim:
        raise HTTPException(status_code=404, detail="Robot not found")
    net_sim.update_config(config)
    return {"status": "updated", "config": config.model_dump()}

@router.post("/{robot_id}/estop")
def trigger_estop(robot_id: str, reason: str = "REST API emergency stop"):
    engine = fleet_manager.get_robot(robot_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Robot not found")
    engine.trigger_emergency_stop(reason)
    return {"status": "e_stopped", "robot_id": robot_id}

@router.post("/{robot_id}/reset-estop")
def reset_estop(robot_id: str):
    engine = fleet_manager.get_robot(robot_id)
    if not engine:
        raise HTTPException(status_code=404, detail="Robot not found")
    engine.reset_emergency_stop()
    return {"status": "reset_e_stopped", "robot_id": robot_id}
