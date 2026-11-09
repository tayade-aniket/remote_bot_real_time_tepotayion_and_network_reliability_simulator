from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any, List

class Position2D(BaseModel):
    x: float
    y: float

class TelemetryPacket(BaseModel):
    type: Literal["telemetry"] = "telemetry"
    robot_id: str
    sequence: int
    server_timestamp: float
    position: Position2D
    heading: float  # radians (-pi to pi)
    linear_velocity: float
    angular_velocity: float
    target_linear_velocity: float
    target_angular_velocity: float
    battery_level: float
    operating_mode: str
    collision_warning: bool = False
    last_command_id: Optional[str] = None
    last_command_sequence: Optional[int] = None
    lease_holder: Optional[str] = None
    lease_active: bool = False
    trail: Optional[List[List[float]]] = None

class HealthMetrics(BaseModel):
    uptime_sec: float
    cpu_percent: float
    memory_mb: float
    active_websockets: int
    fleet_count: int
