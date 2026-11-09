from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class RobotCreate(BaseModel):
    id: str
    name: str

class RobotUpdate(BaseModel):
    name: Optional[str] = None
    battery_level: Optional[float] = None

class RobotResponse(BaseModel):
    id: str
    name: str
    status: str
    battery_level: float
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class FleetSummary(BaseModel):
    total_robots: int
    active_robots: int
    connected_operators: int
    avg_latency_ms: float
    avg_delivery_ratio: float
