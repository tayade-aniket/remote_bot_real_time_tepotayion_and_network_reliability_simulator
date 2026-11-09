import pytest
import time
from app.simulation.robot_engine import RobotEngine
from app.simulation.environment import VirtualEnvironment

def test_emergency_stop_priority():
    engine = RobotEngine("test_bot", "Test Bot", initial_x=0.0, initial_y=0.0)
    
    # Send movement command
    ok, status = engine.apply_movement_command("c1", 1, "op1", 1.0, 0.0, time.time())
    assert ok is True
    assert engine.target_linear_velocity == 1.0
    
    # Trigger E-STOP
    engine.trigger_emergency_stop(reason="Emergency Test")
    assert engine.is_estopped is True
    assert engine.linear_velocity == 0.0
    assert engine.target_linear_velocity == 0.0
    assert engine.operating_mode == "EMERGENCY_STOPPED"
    
    # Attempt movement while E-STOP is active -> Must be rejected!
    ok2, status2 = engine.apply_movement_command("c2", 2, "op1", 1.0, 0.0, time.time())
    assert ok2 is False
    assert status2 == "e_stopped"
    
    # Clear E-STOP
    engine.reset_emergency_stop()
    assert engine.is_estopped is False
    assert engine.operating_mode == "IDLE"
    
    # Now movement works
    ok3, status3 = engine.apply_movement_command("c3", 3, "op1", 0.5, 0.0, time.time())
    assert ok3 is True
    assert status3 == "accepted"

def test_server_watchdog_timeout():
    engine = RobotEngine("watchdog_bot", "Watchdog Bot", initial_x=-3.0, initial_y=-3.0)
    engine.watchdog_timeout_sec = 0.1 # 100ms
    
    # Issue command
    engine.apply_movement_command("c1", 1, "op1", 1.0, 0.0, time.time())
    assert engine.target_linear_velocity == 1.0
    
    # Step simulation immediately (not timed out yet)
    engine.step(0.02)
    assert engine.target_linear_velocity == 1.0
    
    # Simulate time lapse > watchdog timeout
    engine.last_command_time = time.monotonic() - 0.2
    engine.step(0.02)
    
    # Targets must be zeroed by watchdog
    assert engine.target_linear_velocity == 0.0

def test_collision_detection():
    env = VirtualEnvironment(min_x=-5.0, max_x=5.0, min_y=-5.0, max_y=5.0)
    engine = RobotEngine("wall_bot", "Wall Bot", initial_x=4.8, initial_y=0.0, environment=env)
    
    # Command forward towards East boundary
    engine.apply_movement_command("c1", 1, "op1", 1.0, 0.0, time.time())
    engine.step(0.5)
    
    # Robot should trigger collision warning and halt forward velocity
    assert engine.collision_warning is True
    assert engine.linear_velocity == 0.0
    assert engine.operating_mode == "COLLISION_STOPPED"

def test_battery_depletion():
    engine = RobotEngine("batt_bot", "Batt Bot", initial_x=-3.0, initial_y=-3.0)
    engine.battery_level = 0.001
    
    engine.apply_movement_command("c1", 1, "op1", 1.0, 0.0, time.time())
    engine.step(1.0)
    
    assert engine.battery_level == 0.0
    assert engine.operating_mode == "BATTERY_DEPLETED"
    assert engine.linear_velocity == 0.0
