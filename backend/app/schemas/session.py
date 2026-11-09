from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SessionCreate(BaseModel):
    robot_id: str
    operator_id: str
    title: Optional[str] = "Teleoperation Mission"

class SessionSummary(BaseModel):
    id: str
    robot_id: str
    operator_id: str
    title: Optional[str]
    start_time: datetime
    end_time: Optional[datetime]
    duration_sec: float
    total_commands: int
    total_telemetry_ticks: int
    avg_latency_ms: float
    packet_loss_pct: float

class SessionReplayResponse(BaseModel):
    session: SessionSummary
    commands: List[Dict[str, Any]]
    telemetry: List[Dict[str, Any]]
    network_events: List[Dict[str, Any]]
