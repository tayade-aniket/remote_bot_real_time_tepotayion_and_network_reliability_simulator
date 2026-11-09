import asyncio
import time
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.database.session import SessionLocal
from app.database.models import (
    SessionRecording, RecordedCommand, RecordedTelemetry, RecordedNetworkEvent
)
from app.core.logging import logger

class RecordingSessionManager:
    """
    Asynchronous buffered recording service for teleoperation missions.
    Decouples real-time high frequency streaming from SQLite writes.
    """
    def __init__(self):
        # Active in-memory session buffers keyed by session_id
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.buffered_telemetry: Dict[str, List[Dict[str, Any]]] = {}
        self.buffered_commands: Dict[str, List[Dict[str, Any]]] = {}
        self.buffered_events: Dict[str, List[Dict[str, Any]]] = {}
        self._flush_task: Optional[asyncio.Task] = None
        self._running = False

    async def start(self):
        if self._running:
            return
        self._running = True
        self._flush_task = asyncio.create_task(self._periodic_flush_worker())

    async def stop(self):
        self._running = False
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
        # Final flush
        self._flush_all_buffers_sync()

    def start_recording(self, robot_id: str, operator_id: str, title: Optional[str] = None) -> str:
        session_id = f"session_{uuid.uuid4().hex[:10]}"
        now = datetime.now(timezone.utc)
        
        session_info = {
            "id": session_id,
            "robot_id": robot_id,
            "operator_id": operator_id,
            "title": title or f"Mission {robot_id} - {now.strftime('%H:%M:%S')}",
            "start_time": now,
            "start_monotonic": time.monotonic(),
            "total_commands": 0,
            "total_telemetry_ticks": 0,
            "rtt_samples": []
        }
        
        self.active_sessions[session_id] = session_info
        self.buffered_telemetry[session_id] = []
        self.buffered_commands[session_id] = []
        self.buffered_events[session_id] = []
        
        # Write initial session row
        with SessionLocal() as db:
            db_session = SessionRecording(
                id=session_id,
                robot_id=robot_id,
                operator_id=operator_id,
                title=session_info["title"],
                start_time=now
            )
            db.add(db_session)
            db.commit()
            
        logger.info(f"Started mission recording {session_id} for {robot_id}")
        return session_id

    def get_active_session_for_robot(self, robot_id: str) -> Optional[str]:
        for s_id, s in self.active_sessions.items():
            if s["robot_id"] == robot_id:
                return s_id
        return None

    def record_command(self, session_id: str, command: Dict[str, Any], status: str = "accepted"):
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["total_commands"] += 1
            self.buffered_commands[session_id].append({
                "sequence": command.get("sequence", 0),
                "command_id": command.get("command_id", "unknown"),
                "timestamp": command.get("timestamp", time.time()),
                "linear_velocity": command.get("linear_velocity", 0.0),
                "angular_velocity": command.get("angular_velocity", 0.0),
                "status": status
            })

    def record_telemetry(self, session_id: str, telemetry: Dict[str, Any], rtt_ms: float = 0.0):
        if session_id in self.active_sessions:
            self.active_sessions[session_id]["total_telemetry_ticks"] += 1
            if rtt_ms > 0:
                self.active_sessions[session_id]["rtt_samples"].append(rtt_ms)
                
            pos = telemetry.get("position", {"x": 0.0, "y": 0.0})
            self.buffered_telemetry[session_id].append({
                "sequence": telemetry.get("sequence", 0),
                "server_timestamp": telemetry.get("server_timestamp", time.time()),
                "x": pos.get("x", 0.0),
                "y": pos.get("y", 0.0),
                "heading": telemetry.get("heading", 0.0),
                "linear_velocity": telemetry.get("linear_velocity", 0.0),
                "angular_velocity": telemetry.get("angular_velocity", 0.0),
                "battery_level": telemetry.get("battery_level", 100.0),
                "operating_mode": telemetry.get("operating_mode", "IDLE"),
                "rtt_ms": rtt_ms
            })

    def record_network_event(self, session_id: str, event_type: str, details: Dict[str, Any]):
        if session_id in self.active_sessions:
            self.buffered_events[session_id].append({
                "timestamp": time.time(),
                "event_type": event_type,
                "latency_ms": details.get("latency_ms", 0.0),
                "jitter_ms": details.get("jitter_ms", 0.0),
                "loss_pct": details.get("packet_loss_pct", 0.0),
                "details": json.dumps(details)
            })

    def stop_recording(self, session_id: str) -> Optional[Dict[str, Any]]:
        if session_id not in self.active_sessions:
            return None
            
        session_info = self.active_sessions.pop(session_id)
        now = datetime.now(timezone.utc)
        duration_sec = round(time.monotonic() - session_info["start_monotonic"], 2)
        
        rtt_list = session_info["rtt_samples"]
        avg_rtt = round(sum(rtt_list) / len(rtt_list), 2) if rtt_list else 0.0
        
        # Flush buffers for this session
        self._flush_session_sync(session_id)
        
        with SessionLocal() as db:
            db_session = db.query(SessionRecording).filter(SessionRecording.id == session_id).first()
            if db_session:
                db_session.end_time = now
                db_session.duration_sec = duration_sec
                db_session.total_commands = session_info["total_commands"]
                db_session.total_telemetry_ticks = session_info["total_telemetry_ticks"]
                db_session.avg_latency_ms = avg_rtt
                db_session.summary_json = json.dumps({
                    "duration_sec": duration_sec,
                    "total_commands": session_info["total_commands"],
                    "total_telemetry_ticks": session_info["total_telemetry_ticks"],
                    "avg_rtt_ms": avg_rtt
                })
                db.commit()
                db.refresh(db_session)
                
        logger.info(f"Closed and persisted mission recording {session_id} (duration: {duration_sec}s)")
        return session_info

    def _flush_session_sync(self, session_id: str):
        telemetry_batch = self.buffered_telemetry.pop(session_id, [])
        commands_batch = self.buffered_commands.pop(session_id, [])
        events_batch = self.buffered_events.pop(session_id, [])
        
        if not (telemetry_batch or commands_batch or events_batch):
            return

        with SessionLocal() as db:
            if telemetry_batch:
                db.bulk_save_objects([
                    RecordedTelemetry(session_id=session_id, **t) for t in telemetry_batch
                ])
            if commands_batch:
                db.bulk_save_objects([
                    RecordedCommand(session_id=session_id, **c) for c in commands_batch
                ])
            if events_batch:
                db.bulk_save_objects([
                    RecordedNetworkEvent(session_id=session_id, **e) for e in events_batch
                ])
            db.commit()

    def _flush_all_buffers_sync(self):
        for s_id in list(self.buffered_telemetry.keys()):
            self._flush_session_sync(s_id)

    async def _periodic_flush_worker(self):
        while self._running:
            await asyncio.sleep(2.0)  # Flush to disk every 2 seconds
            for s_id in list(self.active_sessions.keys()):
                self._flush_session_sync(s_id)

recording_service = RecordingSessionManager()
