import pytest
import math
from app.simulation.kinematics import DifferentialDriveKinematics

def test_inverse_forward_kinematics():
    kin = DifferentialDriveKinematics(wheel_base=0.5, wheel_radius=0.1)
    
    # Pure forward motion
    v_l, v_r = kin.inverse_kinematics(1.0, 0.0)
    assert v_l == pytest.approx(1.0)
    assert v_r == pytest.approx(1.0)
    
    v_calc, w_calc = kin.forward_kinematics(v_l, v_r)
    assert v_calc == pytest.approx(1.0)
    assert w_calc == pytest.approx(0.0)
    
    # Pure rotation in place
    v_l, v_r = kin.inverse_kinematics(0.0, 2.0)
    assert v_l == pytest.approx(-0.5)
    assert v_r == pytest.approx(0.5)
    
    v_calc, w_calc = kin.forward_kinematics(v_l, v_r)
    assert v_calc == pytest.approx(0.0)
    assert w_calc == pytest.approx(2.0)

def test_acceleration_limits():
    kin = DifferentialDriveKinematics(
        max_linear_velocity=2.0,
        max_linear_accel=1.0 # 1.0 m/s^2
    )
    
    dt = 0.5 # 0.5s step -> max delta v = 0.5
    new_v, _ = kin.apply_acceleration_limits(0.0, 0.0, 2.0, 0.0, dt)
    assert new_v == pytest.approx(0.5)
    
    # Next step
    new_v2, _ = kin.apply_acceleration_limits(new_v, 0.0, 2.0, 0.0, dt)
    assert new_v2 == pytest.approx(1.0)

def test_pose_integration():
    kin = DifferentialDriveKinematics()
    
    # Move straight east along X-axis from origin
    x, y, theta = kin.integrate_pose(0.0, 0.0, 0.0, 1.0, 0.0, 1.0)
    assert x == pytest.approx(1.0)
    assert y == pytest.approx(0.0)
    assert theta == pytest.approx(0.0)
    
    # Rotate 90 degrees (pi/2)
    _, _, theta2 = kin.integrate_pose(0.0, 0.0, 0.0, 0.0, math.pi / 2, 1.0)
    assert theta2 == pytest.approx(math.pi / 2)
