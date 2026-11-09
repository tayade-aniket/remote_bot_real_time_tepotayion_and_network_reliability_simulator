import asyncio
import random
import time
from typing import Optional, Dict, Any, Callable, Awaitable
from app.schemas.network import NetworkConfig
from app.core.logging import logger

class NetworkSimulator:
    """
    Simulates network degradation (latency, jitter, packet drop, disconnections).
    Can be configured per-robot and tweaked live by operators.
    """
    def __init__(self, robot_id: str):
        self.robot_id = robot_id
        self.config = NetworkConfig(
            robot_id=robot_id,
            latency_ms=0.0,
            jitter_ms=0.0,
            packet_loss_pct=0.0,
            bandwidth_limit_kbps=10000.0,
            simulated_disconnect=False
        )
        self.rng = random.Random()

    def update_config(self, new_config: NetworkConfig) -> None:
        self.config = new_config
        if new_config.random_seed is not None:
            self.rng.seed(new_config.random_seed)
        logger.info(
            f"Updated network config for {self.robot_id}: "
            f"lat={self.config.latency_ms}ms, jit={self.config.jitter_ms}ms, "
            f"loss={self.config.packet_loss_pct}%, disconnect={self.config.simulated_disconnect}",
            extra={"robot_id": self.robot_id, "event_type": "network_config_update"}
        )

    def should_drop_packet(self) -> bool:
        """Determines if a packet should be dropped due to simulated packet loss or disconnect."""
        if self.config.simulated_disconnect:
            return True
        if self.config.packet_loss_pct <= 0.0:
            return False
        if self.config.packet_loss_pct >= 100.0:
            return True
        return self.rng.uniform(0.0, 100.0) < self.config.packet_loss_pct

    def calculate_delay_sec(self) -> float:
        """
        Calculates simulated propagation delay in seconds incorporating jitter:
        delay = max(0, latency + gaussian(0, jitter))
        """
        base_ms = self.config.latency_ms
        jitter_ms = self.config.jitter_ms
        if base_ms <= 0.0 and jitter_ms <= 0.0:
            return 0.0
            
        noise = self.rng.gauss(0.0, jitter_ms) if jitter_ms > 0.0 else 0.0
        total_delay_ms = max(0.0, base_ms + noise)
        return total_delay_ms / 1000.0

    async def process_upstream_command(
        self,
        command_data: Dict[str, Any],
        on_deliver: Callable[[Dict[str, Any]], Awaitable[None]],
        on_drop: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ) -> None:
        """
        Applies network impairment to an incoming client command.
        If dropped, calls on_drop (if provided) and returns.
        If delayed, sleeps for simulated delay before executing on_deliver callback.
        """
        # 1. Packet drop check
        if self.should_drop_packet():
            if on_drop:
                await on_drop(command_data)
            return

        # 2. Latency delay
        delay_sec = self.calculate_delay_sec()
        if delay_sec > 0.0:
            await asyncio.sleep(delay_sec)

        # 3. Deliver to simulation engine
        await on_deliver(command_data)

    async def process_downstream_packet(
        self,
        packet_data: Dict[str, Any],
        send_fn: Callable[[str], Awaitable[None]],
        serialize_fn: Callable[[Dict[str, Any]], str],
        on_drop: Optional[Callable[[], None]] = None
    ) -> None:
        """
        Applies network impairment to outgoing telemetry or ACK packets.
        """
        if self.should_drop_packet():
            if on_drop:
                on_drop()
            return

        delay_sec = self.calculate_delay_sec()
        if delay_sec > 0.0:
            await asyncio.sleep(delay_sec)

        payload_str = serialize_fn(packet_data)
        await send_fn(payload_str)
