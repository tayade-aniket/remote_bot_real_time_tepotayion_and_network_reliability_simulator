from pydantic import BaseModel, Field
from typing import Optional, Literal

class RobotCommand(BaseModel):
    type: Literal["robot_command"] = "robot_command"
    robot_id: str
    command_id: str
    sequence: int = Field(..., ge=0)
    timestamp: float
    operator_id: str
    linear_velocity: float = Field(..., ge=-2.0, le=2.0)
    angular_velocity: float = Field(..., ge=-3.14, le=3.14)

class EmergencyStopCommand(BaseModel):
    type: Literal["emergency_stop"] = "emergency_stop"
    robot_id: str
    command_id: str
    timestamp: float
    operator_id: str
    reason: Optional[str] = "Operator Emergency Stop Triggered"

class ResetStopCommand(BaseModel):
    type: Literal["reset_stop"] = "reset_stop"
    robot_id: str
    timestamp: float
    operator_id: str

class CommandAck(BaseModel):
    type: Literal["command_ack"] = "command_ack"
    robot_id: str
    command_id: str
    sequence: int
    status: Literal["accepted", "rejected", "e_stopped", "unauthorized", "dropped_by_sim"]
    rtt_ms: Optional[float] = None
    reason: Optional[str] = None
    server_timestamp: float
