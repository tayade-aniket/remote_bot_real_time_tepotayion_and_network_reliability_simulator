import math
from typing import Tuple

class DifferentialDriveKinematics:
    """
    Kinematics model and acceleration/velocity limiting for differential drive robot.
    Wheelbase L (distance between wheels), Wheel Radius R.
    """
    def __init__(
        self,
        wheel_base: float = 0.5,           # 0.5 meters
        wheel_radius: float = 0.1,         # 0.1 meters
        max_linear_velocity: float = 1.5,  # 1.5 m/s
        max_angular_velocity: float = 2.0, # 2.0 rad/s
        max_linear_accel: float = 2.5,     # 2.5 m/s^2
        max_angular_accel: float = 4.0     # 4.0 rad/s^2
    ):
        self.wheel_base = wheel_base
        self.wheel_radius = wheel_radius
        self.max_linear_velocity = max_linear_velocity
        self.max_angular_velocity = max_angular_velocity
        self.max_linear_accel = max_linear_accel
        self.max_angular_accel = max_angular_accel

    def inverse_kinematics(self, linear_v: float, angular_w: float) -> Tuple[float, float]:
        """
        Calculates left and right wheel linear velocities from body frame (v, omega).
        v_right = v + (omega * L) / 2
        v_left  = v - (omega * L) / 2
        """
        v_r = linear_v + (angular_w * self.wheel_base) / 2.0
        v_l = linear_v - (angular_w * self.wheel_base) / 2.0
        return v_l, v_r

    def forward_kinematics(self, v_left: float, v_right: float) -> Tuple[float, float]:
        """
        Calculates body frame linear velocity (v) and angular velocity (omega)
        from left and right wheel velocities.
        v = (v_r + v_l) / 2
        omega = (v_r - v_l) / L
        """
        v = (v_right + v_left) / 2.0
        omega = (v_right - v_left) / self.wheel_base
        return v, omega

    def clamp_targets(self, target_v: float, target_w: float) -> Tuple[float, float]:
        """Clamps desired targets to safe physical limits."""
        v = max(-self.max_linear_velocity, min(self.max_linear_velocity, target_v))
        w = max(-self.max_angular_velocity, min(self.max_angular_velocity, target_w))
        return v, w

    def apply_acceleration_limits(
        self,
        current_v: float,
        current_w: float,
        target_v: float,
        target_w: float,
        dt: float
    ) -> Tuple[float, float]:
        """
        Ramps velocity smoothly based on maximum acceleration limits.
        """
        target_v, target_w = self.clamp_targets(target_v, target_w)
        
        # Linear velocity acceleration ramp
        max_delta_v = self.max_linear_accel * dt
        diff_v = target_v - current_v
        if abs(diff_v) <= max_delta_v:
            new_v = target_v
        else:
            new_v = current_v + math.copysign(max_delta_v, diff_v)

        # Angular velocity acceleration ramp
        max_delta_w = self.max_angular_accel * dt
        diff_w = target_w - current_w
        if abs(diff_w) <= max_delta_w:
            new_w = target_w
        else:
            new_w = current_w + math.copysign(max_delta_w, diff_w)

        return new_v, new_w

    @staticmethod
    def normalize_angle(theta: float) -> float:
        """Normalizes angle to range [-pi, +pi]."""
        while theta > math.pi:
            theta -= 2.0 * math.pi
        while theta < -math.pi:
            theta += 2.0 * math.pi
        return theta

    def integrate_pose(
        self,
        x: float,
        y: float,
        theta: float,
        v: float,
        w: float,
        dt: float
    ) -> Tuple[float, float, float]:
        """
        Integrates pose forward in time using 2nd-order Runge-Kutta / midpoint rule.
        """
        d_theta = w * dt
        mid_theta = theta + (d_theta / 2.0)
        
        dx = v * math.cos(mid_theta) * dt
        dy = v * math.sin(mid_theta) * dt
        
        new_x = x + dx
        new_y = y + dy
        new_theta = self.normalize_angle(theta + d_theta)
        
        return new_x, new_y, new_theta
