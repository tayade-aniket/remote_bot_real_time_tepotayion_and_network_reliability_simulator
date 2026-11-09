import asyncio
import json
import time
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
from app.services.fleet_manager import fleet_manager
from app.services.recording_service import recording_service
from app.core.config import settings
from app.core.logging import logger

class WebSocketConnectionManager:
    """
    Manages active client WebSocket connections, multi-operator leases,
    and telemetry streaming loops for all simulated robots.
    """
    def __init__(self):
        # robot_id -> Set of active WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # websocket -> operator_id
        self.socket_operators: Dict[WebSocket, str] = {}
        # robot_id -> asyncio.Task (telemetry broadcast loop)
        self.telemetry_tasks: Dict[str, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, robot_id: str, operator_id: str):
        await websocket.accept()
        if robot_id not in self.active_connections:
            self.active_connections[robot_id] = set()
        self.active_connections[robot_id].add(websocket)
        self.socket_operators[websocket] = operator_id
        
        # Record connection in network metrics
        metrics = fleet_manager.get_metrics_tracker(robot_id)
        if metrics:
            metrics.record_reconnection()

        logger.info(f"Operator {operator_id} connected to {robot_id} (active clients: {len(self.active_connections[robot_id])})")

        # Start telemetry loop for this robot if not already running
        if robot_id not in self.telemetry_tasks or self.telemetry_tasks[robot_id].done():
            self.telemetry_tasks[robot_id] = asyncio.create_task(self._telemetry_stream_loop(robot_id))

    def disconnect(self, websocket: WebSocket, robot_id: str):
        if robot_id in self.active_connections:
            self.active_connections[robot_id].discard(websocket)
            if not self.active_connections[robot_id]:
                del self.active_connections[robot_id]
                # If no clients connected, cancel streaming loop
                if robot_id in self.telemetry_tasks:
                    self.telemetry_tasks[robot_id].cancel()
                    del self.telemetry_tasks[robot_id]
                    
        operator_id = self.socket_operators.pop(websocket, "unknown")
        
        # If this operator held the lease, release it and stop robot
        engine = fleet_manager.get_robot(robot_id)
        if engine and engine.lease_holder == operator_id:
            engine.release_lease(operator_id)
            logger.info(f"Released lease for {robot_id} due to operator {operator_id} disconnect")
            
        metrics = fleet_manager.get_metrics_tracker(robot_id)
        if metrics:
            metrics.record_disconnection()
            
        logger.info(f"Operator {operator_id} disconnected from {robot_id}")

    async def send_personal_json(self, websocket: WebSocket, data: Dict[str, Any]):
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass

    async def broadcast_to_robot(self, robot_id: str, data: Dict[str, Any]):
        """Broadcasts message to all clients watching this robot."""
        if robot_id not in self.active_connections:
            return
        payload = json.dumps(data)
        stale_sockets = []
        for ws in list(self.active_connections[robot_id]):
            try:
                await ws.send_text(payload)
            except Exception:
                stale_sockets.append(ws)
        for ws in stale_sockets:
            self.disconnect(ws, robot_id)

    async def _telemetry_stream_loop(self, robot_id: str):
        """
        Periodically transmits telemetry packets subjected to network impairment.
        """
        interval = 1.0 / settings.TELEMETRY_HZ
        engine = fleet_manager.get_robot(robot_id)
        net_sim = fleet_manager.get_network_sim(robot_id)
        metrics = fleet_manager.get_metrics_tracker(robot_id)

        while True:
            try:
                await asyncio.sleep(interval)
                if not engine or robot_id not in self.active_connections or not self.active_connections[robot_id]:
                    continue

                telemetry = engine.get_telemetry_dict()
                
                # Check active mission recording
                active_session_id = recording_service.get_active_session_for_robot(robot_id)
                if active_session_id:
                    avg_rtt = metrics.get_metrics().avg_rtt_ms if metrics else 0.0
                    recording_service.record_telemetry(active_session_id, telemetry, rtt_ms=avg_rtt)

                # Send via network impairment simulator
                if net_sim:
                    if net_sim.should_drop_packet():
                        if metrics:
                            metrics.record_telemetry_dropped()
                        continue

                    delay_sec = net_sim.calculate_delay_sec()
                    if delay_sec > 0.0:
                        await asyncio.sleep(delay_sec)

                if metrics:
                    metrics.record_telemetry_sent()

                # Broadcast to connected clients
                await self.broadcast_to_robot(robot_id, telemetry)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in telemetry loop for {robot_id}: {e}", exc_info=True)

ws_manager = WebSocketConnectionManager()
