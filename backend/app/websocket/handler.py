import json
import time
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.connection_manager import ws_manager
from app.services.fleet_manager import fleet_manager
from app.services.recording_service import recording_service
from app.schemas.network import NetworkConfig
from app.core.security import verify_access_token
from app.core.logging import logger

router = APIRouter()

@router.websocket("/ws/robots/{robot_id}")
async def websocket_robot_endpoint(
    websocket: WebSocket,
    robot_id: str,
    token: Optional[str] = Query(None)
):
    # Authenticate token or fallback to demo operator for development
    operator_id = "operator_guest"
    if token:
        payload = verify_access_token(token)
        if payload and "sub" in payload:
            operator_id = payload["sub"]

    engine = fleet_manager.get_robot(robot_id)
    if not engine:
        await websocket.close(code=4004, reason=f"Robot '{robot_id}' not found")
        return

    net_sim = fleet_manager.get_network_sim(robot_id)
    metrics = fleet_manager.get_metrics_tracker(robot_id)

    await ws_manager.connect(websocket, robot_id, operator_id)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data: Dict[str, Any] = json.loads(raw_text)
            except json.JSONDecodeError:
                await ws_manager.send_personal_json(websocket, {
                    "type": "error",
                    "message": "Malformed JSON payload"
                })
                continue

            msg_type = data.get("type")

            # 1. EMERGENCY STOP - High priority, bypasses queue
            if msg_type == "emergency_stop":
                engine.trigger_emergency_stop(reason=data.get("reason", "Operator manual E-STOP"))
                active_session_id = recording_service.get_active_session_for_robot(robot_id)
                if active_session_id:
                    recording_service.record_network_event(active_session_id, "EMERGENCY_STOP", data)
                
                # Send immediate broadcast
                await ws_manager.broadcast_to_robot(robot_id, {
                    "type": "command_ack",
                    "robot_id": robot_id,
                    "command_id": data.get("command_id", "estop"),
                    "sequence": data.get("sequence", 0),
                    "status": "e_stopped",
                    "reason": "Emergency stop latched",
                    "server_timestamp": time.time()
                })
                continue

            # 2. RESET EMERGENCY STOP
            if msg_type == "reset_stop":
                engine.reset_emergency_stop()
                await ws_manager.broadcast_to_robot(robot_id, {
                    "type": "command_ack",
                    "robot_id": robot_id,
                    "command_id": data.get("command_id", "reset_stop"),
                    "sequence": data.get("sequence", 0),
                    "status": "accepted",
                    "reason": "Emergency stop cleared",
                    "server_timestamp": time.time()
                })
                continue

            # 3. HEARTBEAT PING
            if msg_type == "ping":
                client_ts = data.get("timestamp", time.time())
                server_now = time.time()
                await ws_manager.send_personal_json(websocket, {
                    "type": "pong",
                    "client_timestamp": client_ts,
                    "server_timestamp": server_now,
                    "sequence": data.get("sequence", 0)
                })
                continue

            # 4. NETWORK CONFIGURATION UPDATE
            if msg_type == "network_config":
                try:
                    cfg = NetworkConfig(
                        robot_id=robot_id,
                        latency_ms=data.get("latency_ms", 0.0),
                        jitter_ms=data.get("jitter_ms", 0.0),
                        packet_loss_pct=data.get("packet_loss_pct", 0.0),
                        bandwidth_limit_kbps=data.get("bandwidth_limit_kbps", 10000.0),
                        simulated_disconnect=data.get("simulated_disconnect", False),
                        random_seed=data.get("random_seed")
                    )
                    if net_sim:
                        net_sim.update_config(cfg)
                    active_session_id = recording_service.get_active_session_for_robot(robot_id)
                    if active_session_id:
                        recording_service.record_network_event(active_session_id, "network_config_change", data)
                    await ws_manager.send_personal_json(websocket, {
                        "type": "network_config_ack",
                        "status": "updated",
                        "config": cfg.model_dump()
                    })
                except Exception as e:
                    await ws_manager.send_personal_json(websocket, {
                        "type": "error",
                        "message": f"Invalid network config: {str(e)}"
                    })
                continue

            # 5. CONTROL LEASE REQUEST
            if msg_type == "lease_request":
                success = engine.acquire_lease(operator_id)
                await ws_manager.broadcast_to_robot(robot_id, {
                    "type": "lease_status",
                    "robot_id": robot_id,
                    "lease_holder": engine.lease_holder,
                    "lease_active": engine.is_lease_valid(),
                    "success": success
                })
                continue

            # 6. CONTROL LEASE RELEASE
            if msg_type == "lease_release":
                success = engine.release_lease(operator_id)
                await ws_manager.broadcast_to_robot(robot_id, {
                    "type": "lease_status",
                    "robot_id": robot_id,
                    "lease_holder": engine.lease_holder,
                    "lease_active": False,
                    "success": success
                })
                continue

            # 7. ROBOT MOVEMENT COMMAND (Subjected to Network Impairment)
            if msg_type == "robot_command":
                if metrics:
                    metrics.record_command_sent()

                async def deliver_command(cmd: Dict[str, Any]):
                    try:
                        cmd_id = cmd.get("command_id", "cmd")
                        seq = cmd.get("sequence", 0)
                        client_ts = cmd.get("timestamp", time.time())
                        linear_v = float(cmd.get("linear_velocity", 0.0))
                        angular_w = float(cmd.get("angular_velocity", 0.0))
                        
                        # Apply to physics engine
                        accepted, status = engine.apply_movement_command(
                            command_id=cmd_id,
                            sequence=seq,
                            operator_id=operator_id,
                            target_v=linear_v,
                            target_w=angular_w,
                            client_timestamp=client_ts
                        )

                        now = time.time()
                        rtt_ms = round((now - client_ts) * 1000.0, 2)
                        
                        if metrics:
                            metrics.record_command_ack(rtt_ms)

                        # Record to session buffer
                        active_session_id = recording_service.get_active_session_for_robot(robot_id)
                        if active_session_id:
                            recording_service.record_command(active_session_id, cmd, status=status)

                        ack = {
                            "type": "command_ack",
                            "robot_id": robot_id,
                            "command_id": cmd_id,
                            "sequence": seq,
                            "status": status,
                            "rtt_ms": rtt_ms,
                            "server_timestamp": now
                        }

                        # Send ACK through network simulation downlink
                        if net_sim:
                            if net_sim.should_drop_packet():
                                if metrics:
                                    metrics.record_command_dropped()
                                return
                            delay = net_sim.calculate_delay_sec()
                            if delay > 0:
                                await asyncio.sleep(delay)

                        await ws_manager.send_personal_json(websocket, ack)
                    except Exception as err:
                        logger.debug(f"Command processing task ended: {err}")

                async def drop_command(cmd: Dict[str, Any]):
                    if metrics:
                        metrics.record_command_dropped()
                    logger.debug(f"Simulated network dropped command {cmd.get('command_id')} for {robot_id}")

                if net_sim:
                    # Run upstream pipeline (latency, jitter, drop)
                    asyncio.create_task(
                        net_sim.process_upstream_command(data, deliver_command, on_drop=drop_command)
                    )
                else:
                    await deliver_command(data)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, robot_id)
    except Exception as e:
        logger.error(f"WebSocket error for {robot_id}: {e}", exc_info=True)
        ws_manager.disconnect(websocket, robot_id)
