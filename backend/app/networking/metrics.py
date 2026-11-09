import math
from collections import deque
from typing import List, Dict, Any, Optional
from app.schemas.network import NetworkMetrics

class NetworkMetricsTracker:
    """
    Monitors round-trip times, command sequence delivery, application-level packet loss,
    and connection health indicators.
    """
    def __init__(self, robot_id: str, rtt_window_size: int = 100):
        self.robot_id = robot_id
        self.rtt_window: deque = deque(maxlen=rtt_window_size)
        
        self.sent_commands: int = 0
        self.received_acks: int = 0
        self.dropped_commands: int = 0
        self.sent_telemetry: int = 0
        self.dropped_telemetry: int = 0
        self.reconnections_count: int = 0
        
        self.is_connected: bool = True

    def record_command_sent(self):
        self.sent_commands += 1

    def record_command_ack(self, rtt_ms: Optional[float] = None):
        self.received_acks += 1
        if rtt_ms is not None and rtt_ms >= 0:
            self.rtt_window.append(rtt_ms)

    def record_command_dropped(self):
        self.dropped_commands += 1

    def record_telemetry_sent(self):
        self.sent_telemetry += 1

    def record_telemetry_dropped(self):
        self.dropped_telemetry += 1

    def record_reconnection(self):
        self.reconnections_count += 1
        self.is_connected = True

    def record_disconnection(self):
        self.is_connected = False

    def get_metrics(self) -> NetworkMetrics:
        # Delivery ratio
        if self.sent_commands > 0:
            delivery_ratio = (self.received_acks / self.sent_commands) * 100.0
            delivery_ratio = min(100.0, max(0.0, delivery_ratio))
        else:
            delivery_ratio = 100.0
            
        estimated_loss = 100.0 - delivery_ratio

        # RTT statistics
        rtt_list = sorted(list(self.rtt_window))
        if rtt_list:
            min_rtt = round(rtt_list[0], 2)
            max_rtt = round(rtt_list[-1], 2)
            avg_rtt = round(sum(rtt_list) / len(rtt_list), 2)
            
            p95_index = int(math.ceil(0.95 * len(rtt_list))) - 1
            p95_rtt = round(rtt_list[min(p95_index, len(rtt_list) - 1)], 2)
            
            # Standard deviation for jitter
            variance = sum((x - avg_rtt) ** 2 for x in rtt_list) / len(rtt_list)
            jitter = round(math.sqrt(variance), 2)
        else:
            min_rtt = 0.0
            max_rtt = 0.0
            avg_rtt = 0.0
            p95_rtt = 0.0
            jitter = 0.0

        # Communication status evaluation
        if not self.is_connected:
            status = "DISCONNECTED"
        elif estimated_loss > 10.0 or avg_rtt > 250.0:
            status = "DEGRADED"
        else:
            status = "CONNECTED"

        return NetworkMetrics(
            robot_id=self.robot_id,
            sent_commands=self.sent_commands,
            received_acks=self.received_acks,
            dropped_commands=self.dropped_commands,
            sent_telemetry=self.sent_telemetry,
            dropped_telemetry=self.dropped_telemetry,
            delivery_ratio_pct=round(delivery_ratio, 2),
            estimated_loss_pct=round(estimated_loss, 2),
            avg_rtt_ms=avg_rtt,
            min_rtt_ms=min_rtt,
            max_rtt_ms=max_rtt,
            p95_rtt_ms=p95_rtt,
            jitter_ms=jitter,
            reconnections_count=self.reconnections_count,
            connection_status=status
        )
