import pytest
import asyncio
from app.networking.impairment import NetworkSimulator
from app.networking.metrics import NetworkMetricsTracker
from app.schemas.network import NetworkConfig

def test_packet_drop_behavior():
    sim = NetworkSimulator("test_robot")
    
    # 0% loss -> should never drop
    sim.update_config(NetworkConfig(robot_id="test_robot", packet_loss_pct=0.0))
    for _ in range(50):
        assert sim.should_drop_packet() is False
        
    # 100% loss -> should always drop
    sim.update_config(NetworkConfig(robot_id="test_robot", packet_loss_pct=100.0))
    for _ in range(50):
        assert sim.should_drop_packet() is True
        
    # Simulated disconnect -> should drop
    sim.update_config(NetworkConfig(robot_id="test_robot", packet_loss_pct=0.0, simulated_disconnect=True))
    assert sim.should_drop_packet() is True

def test_deterministic_seed():
    sim1 = NetworkSimulator("bot1")
    sim1.update_config(NetworkConfig(robot_id="bot1", packet_loss_pct=30.0, random_seed=42))
    drops1 = [sim1.should_drop_packet() for _ in range(20)]
    
    sim2 = NetworkSimulator("bot2")
    sim2.update_config(NetworkConfig(robot_id="bot2", packet_loss_pct=30.0, random_seed=42))
    drops2 = [sim2.should_drop_packet() for _ in range(20)]
    
    assert drops1 == drops2

def test_network_metrics_tracker():
    tracker = NetworkMetricsTracker("bot1")
    
    # Record 10 sent commands and 8 ACKs
    for _ in range(10):
        tracker.record_command_sent()
    for rtt in [20.0, 25.0, 30.0, 22.0, 28.0, 35.0, 24.0, 26.0]:
        tracker.record_command_ack(rtt)
        
    metrics = tracker.get_metrics()
    assert metrics.sent_commands == 10
    assert metrics.received_acks == 8
    assert metrics.delivery_ratio_pct == pytest.approx(80.0)
    assert metrics.estimated_loss_pct == pytest.approx(20.0)
    assert metrics.min_rtt_ms == 20.0
    assert metrics.max_rtt_ms == 35.0
    assert metrics.avg_rtt_ms > 20.0
