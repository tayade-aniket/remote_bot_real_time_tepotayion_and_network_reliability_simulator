from pydantic import BaseModel, Field
from typing import Optional, Literal

class NetworkConfig(BaseModel):
    robot_id: str
    latency_ms: float = Field(0.0, ge=0.0, le=5000.0)
    jitter_ms: float = Field(0.0, ge=0.0, le=1000.0)
    packet_loss_pct: float = Field(0.0, ge=0.0, le=100.0)
    bandwidth_limit_kbps: float = Field(10000.0, ge=8.0, le=100000.0)
    simulated_disconnect: bool = False
    random_seed: Optional[int] = None

class NetworkMetrics(BaseModel):
    robot_id: str
    sent_commands: int
    received_acks: int
    dropped_commands: int
    sent_telemetry: int
    dropped_telemetry: int
    delivery_ratio_pct: float
    estimated_loss_pct: float
    avg_rtt_ms: float
    min_rtt_ms: float
    max_rtt_ms: float
    p95_rtt_ms: float
    jitter_ms: float
    reconnections_count: int
    connection_status: str # CONNECTED, DEGRADED, DISCONNECTED

class NetworkPreset(BaseModel):
    name: str
    latency_ms: float
    jitter_ms: float
    packet_loss_pct: float
    bandwidth_limit_kbps: float
    simulated_disconnect: bool
