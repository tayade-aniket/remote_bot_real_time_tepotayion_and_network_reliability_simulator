from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.database.session import get_db
from app.database.models import SessionRecording, RecordedCommand, RecordedTelemetry, RecordedNetworkEvent
from app.services.recording_service import recording_service
from app.schemas.session import SessionCreate, SessionSummary, SessionReplayResponse

router = APIRouter()

@router.post("/start")
def start_session(payload: SessionCreate):
    session_id = recording_service.start_recording(
        robot_id=payload.robot_id,
        operator_id=payload.operator_id,
        title=payload.title
    )
    return {"status": "started", "session_id": session_id}

@router.post("/{session_id}/stop")
def stop_session(session_id: str):
    info = recording_service.stop_recording(session_id)
    if not info:
        raise HTTPException(status_code=404, detail="Active recording session not found")
    return {"status": "stopped", "session_id": session_id}

@router.get("", response_model=List[SessionSummary])
def list_sessions(db: Session = Depends(get_db)):
    records = db.query(SessionRecording).order_by(SessionRecording.start_time.desc()).limit(50).all()
    results = []
    for r in records:
        results.append(SessionSummary(
            id=r.id,
            robot_id=r.robot_id,
            operator_id=r.operator_id,
            title=r.title,
            start_time=r.start_time,
            end_time=r.end_time,
            duration_sec=r.duration_sec,
            total_commands=r.total_commands,
            total_telemetry_ticks=r.total_telemetry_ticks,
            avg_latency_ms=r.avg_latency_ms,
            packet_loss_pct=r.packet_loss_pct
        ))
    return results

@router.get("/{session_id}/replay")
def get_replay_data(session_id: str, db: Session = Depends(get_db)):
    rec = db.query(SessionRecording).filter(SessionRecording.id == session_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Session recording not found")
        
    cmds = db.query(RecordedCommand).filter(RecordedCommand.session_id == session_id).order_by(RecordedCommand.sequence.asc()).all()
    telem = db.query(RecordedTelemetry).filter(RecordedTelemetry.session_id == session_id).order_by(RecordedTelemetry.sequence.asc()).all()
    events = db.query(RecordedNetworkEvent).filter(RecordedNetworkEvent.session_id == session_id).order_by(RecordedNetworkEvent.timestamp.asc()).all()
    
    return {
        "session": {
            "id": rec.id,
            "robot_id": rec.robot_id,
            "operator_id": rec.operator_id,
            "title": rec.title,
            "start_time": rec.start_time,
            "end_time": rec.end_time,
            "duration_sec": rec.duration_sec,
            "total_commands": rec.total_commands,
            "total_telemetry_ticks": rec.total_telemetry_ticks,
            "avg_latency_ms": rec.avg_latency_ms,
            "packet_loss_pct": rec.packet_loss_pct
        },
        "commands": [
            {
                "sequence": c.sequence,
                "command_id": c.command_id,
                "timestamp": c.timestamp,
                "linear_velocity": c.linear_velocity,
                "angular_velocity": c.angular_velocity,
                "status": c.status
            } for c in cmds
        ],
        "telemetry": [
            {
                "sequence": t.sequence,
                "server_timestamp": t.server_timestamp,
                "position": {"x": t.x, "y": t.y},
                "heading": t.heading,
                "linear_velocity": t.linear_velocity,
                "angular_velocity": t.angular_velocity,
                "battery_level": t.battery_level,
                "operating_mode": t.operating_mode,
                "rtt_ms": t.rtt_ms
            } for t in telem
        ],
        "network_events": [
            {
                "timestamp": e.timestamp,
                "event_type": e.event_type,
                "latency_ms": e.latency_ms,
                "jitter_ms": e.jitter_ms,
                "loss_pct": e.loss_pct,
                "details": e.details
            } for e in events
        ]
    }
