import pytest
import time
from app.services.recording_service import recording_service
from app.database.session import SessionLocal
from app.database.models import SessionRecording, RecordedCommand, RecordedTelemetry

def test_mission_recording_lifecycle():
    # 1. Start recording
    session_id = recording_service.start_recording("robot_alpha", "operator_test", "Test Mission Alpha")
    assert session_id in recording_service.active_sessions
    assert recording_service.get_active_session_for_robot("robot_alpha") == session_id

    # 2. Record commands and telemetry
    cmd = {
        "sequence": 1,
        "command_id": "c1",
        "timestamp": time.time(),
        "linear_velocity": 0.8,
        "angular_velocity": 0.2
    }
    recording_service.record_command(session_id, cmd, status="accepted")
    
    telem = {
        "sequence": 10,
        "server_timestamp": time.time(),
        "position": {"x": 1.2, "y": 3.4},
        "heading": 0.5,
        "linear_velocity": 0.8,
        "angular_velocity": 0.2,
        "battery_level": 98.5,
        "operating_mode": "MANUAL_CONTROL"
    }
    recording_service.record_telemetry(session_id, telem, rtt_ms=25.0)

    # 3. Stop recording and verify DB persistence
    summary = recording_service.stop_recording(session_id)
    assert summary is not None
    assert summary["total_commands"] == 1
    assert summary["total_telemetry_ticks"] == 1

    with SessionLocal() as db:
        rec = db.query(SessionRecording).filter(SessionRecording.id == session_id).first()
        assert rec is not None
        assert rec.total_commands == 1
        assert rec.total_telemetry_ticks == 1
        assert rec.robot_id == "robot_alpha"
        
        cmds = db.query(RecordedCommand).filter(RecordedCommand.session_id == session_id).all()
        assert len(cmds) == 1
        assert cmds[0].command_id == "c1"
        
        telems = db.query(RecordedTelemetry).filter(RecordedTelemetry.session_id == session_id).all()
        assert len(telems) == 1
        assert telems[0].x == pytest.approx(1.2)
