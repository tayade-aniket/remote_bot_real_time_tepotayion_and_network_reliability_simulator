import pytest
import json
import time
from starlette.testclient import TestClient
from app.main import app

def test_websocket_teleoperation_flow():
    client = TestClient(app)
    with client.websocket_connect("/ws/robots/robot_alpha") as ws:
        # 1. Send Ping, expect Pong
        ws.send_text(json.dumps({
            "type": "ping",
            "timestamp": time.time(),
            "sequence": 1
        }))
        
        # Read messages until we get pong
        pong_received = False
        for _ in range(5):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == "pong":
                pong_received = True
                assert msg.get("sequence") == 1
                break
        assert pong_received, "Failed to receive pong"

        # 2. Send Movement Command
        cmd = {
            "type": "robot_command",
            "robot_id": "robot_alpha",
            "command_id": "cmd_ws_001",
            "sequence": 10,
            "timestamp": time.time(),
            "operator_id": "operator_test",
            "linear_velocity": 0.5,
            "angular_velocity": 0.1
        }
        ws.send_text(json.dumps(cmd))
        
        ack_received = False
        for _ in range(10):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == "command_ack" and msg.get("command_id") == "cmd_ws_001":
                assert msg.get("status") == "accepted"
                ack_received = True
                break
        assert ack_received, "Failed to receive command_ack"

        # 3. Trigger Emergency Stop
        ws.send_text(json.dumps({
            "type": "emergency_stop",
            "robot_id": "robot_alpha",
            "command_id": "estop_01",
            "timestamp": time.time(),
            "operator_id": "operator_test"
        }))
        
        estop_ack = False
        for _ in range(10):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == "command_ack" and msg.get("status") == "e_stopped":
                estop_ack = True
                break
        assert estop_ack, "Failed to receive e_stopped status"

        # 4. Clear Emergency Stop
        ws.send_text(json.dumps({
            "type": "reset_stop",
            "robot_id": "robot_alpha",
            "timestamp": time.time(),
            "operator_id": "operator_test"
        }))
        
        reset_ack = False
        for _ in range(10):
            msg = json.loads(ws.receive_text())
            if msg.get("type") == "command_ack" and msg.get("status") == "accepted":
                reset_ack = True
                break
        assert reset_ack, "Failed to clear emergency stop"
