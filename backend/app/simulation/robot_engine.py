import time
import math
from typing import Optional, List, Dict, Any, Tuple
from collections import deque
from app.simulation.kinematics import DifferentialDriveKinematics
from app.simulation.environment import VirtualEnvironment
from app.core.config import settings

class RobotEngine:
    """
    Simulated mobile robot engine encapsulating differential drive physics,
    state management, safety watchdogs, collision prevention, and battery depletion.
    """
    def __init__(
        self,
        robot_id: str,
        name: str,
        initial_x: float = -3.0,
        initial_y: float = -3.0,
        initial_theta: float = 0.0,
        environment: Optional[VirtualEnvironment] = None
    ):
        self.robot_id = robot_id
        self.name = name
        
        # State
        self.x = initial_x
        self.y = initial_y
        self.theta = initial_theta
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0
        
        # Battery (0 to 100%)
        self.battery_level = 100.0
        
        # Safety & Watchdog
        self.is_estopped = False
        self.operating_mode = "IDLE"  # IDLE, MANUAL_CONTROL, EMERGENCY_STOPPED, WATCHDOG_STOPPED, COLLISION_STOPPED, BATTERY_DEPLETED
        self.last_command_id: Optional[str] = None
        self.last_command_sequence: int = -1
        self.last_command_time: float = time.monotonic()
        self.watchdog_timeout_sec: float = settings.WATCHDOG_TIMEOUT_SEC
        
        # Lease management
        self.lease_holder: Optional[str] = None
        self.lease_expires_at: float = 0.0
        
        # Trail history (stores [x, y] coordinates)
        self.trail: deque = deque(maxlen=150)
        self.trail.append([round(self.x, 3), round(self.y, 3)])
        
        # Subsystems
        self.kinematics = DifferentialDriveKinematics()
        self.environment = environment if environment is not None else VirtualEnvironment()
        self.collision_warning: bool = False
        self.collision_message: Optional[str] = None
        
        # Counters
        self.sequence_counter: int = 0
        self.total_commands_executed: int = 0
        self.robot_radius: float = 0.35  # meters

    def acquire_lease(self, operator_id: str, duration_sec: float = 30.0) -> bool:
        """Grants exclusive control lease to an operator if available or renewing."""
        now = time.monotonic()
        if self.lease_holder is None or now > self.lease_expires_at or self.lease_holder == operator_id:
            self.lease_holder = operator_id
            self.lease_expires_at = now + duration_sec
            return True
        return False

    def release_lease(self, operator_id: str) -> bool:
        if self.lease_holder == operator_id:
            self.lease_holder = None
            self.lease_expires_at = 0.0
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            return True
        return False

    def is_lease_valid(self, operator_id: Optional[str] = None) -> bool:
        now = time.monotonic()
        if self.lease_holder is None or now > self.lease_expires_at:
            return False
        if operator_id is not None and self.lease_holder != operator_id:
            return False
        return True

    def trigger_emergency_stop(self, reason: str = "Emergency stop") -> None:
        """Immediately halts the robot and latches safety state."""
        self.is_estopped = True
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.operating_mode = "EMERGENCY_STOPPED"
        self.collision_message = reason

    def reset_emergency_stop(self) -> None:
        """Clears emergency stop latch, returning robot to IDLE."""
        self.is_estopped = False
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.operating_mode = "IDLE"
        self.collision_warning = False
        self.collision_message = None

    def apply_movement_command(
        self,
        command_id: str,
        sequence: int,
        operator_id: str,
        target_v: float,
        target_w: float,
        client_timestamp: float
    ) -> Tuple[bool, str]:
        """
        Validates and sets new target velocities.
        Returns (success: bool, status_reason: str).
        """
        # 1. Safety latch check
        if self.is_estopped:
            return False, "e_stopped"

        # 2. Lease check
        if self.lease_holder is not None and not self.is_lease_valid(operator_id):
            return False, "unauthorized"

        # 3. Battery check
        if self.battery_level <= 0.0:
            self.operating_mode = "BATTERY_DEPLETED"
            return False, "rejected: battery depleted"

        # 4. Sequence number check (reject duplicate or out-of-order)
        if sequence <= self.last_command_sequence:
            return False, f"rejected: stale sequence ({sequence} <= {self.last_command_sequence})"

        # 5. Stale command check against excessive wall-clock drift (> 3.0s)
        now_wall = time.time()
        if abs(now_wall - client_timestamp) > 3.0:
            return False, f"rejected: command timestamp stale (drift={abs(now_wall - client_timestamp):.2f}s)"

        # Command accepted
        self.last_command_id = command_id
        self.last_command_sequence = sequence
        self.last_command_time = time.monotonic()
        
        # Clamp targets to kinematic limits
        clamped_v, clamped_w = self.kinematics.clamp_targets(target_v, target_w)
        self.target_linear_velocity = clamped_v
        self.target_angular_velocity = clamped_w
        
        self.operating_mode = "MANUAL_CONTROL" if (abs(clamped_v) > 0.01 or abs(clamped_w) > 0.01) else "IDLE"
        self.total_commands_executed += 1
        
        # Renew lease on valid command
        if self.lease_holder == operator_id:
            self.lease_expires_at = time.monotonic() + settings.CONTROL_LEASE_TIMEOUT_SEC

        return True, "accepted"

    def step(self, dt: float) -> None:
        """
        Advances the physical simulation by dt seconds.
        Executed in the high-frequency physics loop.
        """
        now = time.monotonic()
        
        # 1. Check emergency stop
        if self.is_estopped:
            self.linear_velocity = 0.0
            self.angular_velocity = 0.0
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            self.operating_mode = "EMERGENCY_STOPPED"
            return

        # 2. Check battery depletion
        if self.battery_level <= 0.0:
            self.battery_level = 0.0
            self.linear_velocity = 0.0
            self.angular_velocity = 0.0
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            self.operating_mode = "BATTERY_DEPLETED"
            return

        # 3. Server-side movement watchdog
        # If no command received in watchdog_timeout_sec, ramp targets to 0
        elapsed_since_command = now - self.last_command_time
        if elapsed_since_command > self.watchdog_timeout_sec and self.operating_mode == "MANUAL_CONTROL":
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            if abs(self.linear_velocity) < 0.05 and abs(self.angular_velocity) < 0.05:
                self.operating_mode = "WATCHDOG_STOPPED"

        # 4. Apply acceleration limits
        self.linear_velocity, self.angular_velocity = self.kinematics.apply_acceleration_limits(
            self.linear_velocity,
            self.angular_velocity,
            self.target_linear_velocity,
            self.target_angular_velocity,
            dt
        )

        # 5. Integrate candidate pose
        cand_x, cand_y, cand_theta = self.kinematics.integrate_pose(
            self.x,
            self.y,
            self.theta,
            self.linear_velocity,
            self.angular_velocity,
            dt
        )

        # 6. Check collision
        collided, msg = self.environment.check_collision(cand_x, cand_y, self.robot_radius)
        if collided:
            self.collision_warning = True
            self.collision_message = msg
            # Arrest linear movement into obstacle, allow rotational recovery
            self.linear_velocity = 0.0
            self.target_linear_velocity = 0.0
            # Allow theta rotation so operator can steer away
            self.theta = cand_theta
            self.operating_mode = "COLLISION_STOPPED"
        else:
            self.collision_warning = False
            self.collision_message = None
            self.x = cand_x
            self.y = cand_y
            self.theta = cand_theta
            
            # Append to trail if moved noticeably (> 5 cm)
            last_pos = self.trail[-1]
            if (self.x - last_pos[0]) ** 2 + (self.y - last_pos[1]) ** 2 > 0.0025:
                self.trail.append([round(self.x, 3), round(self.y, 3)])

        # 7. Drain battery (idle drain + motion drain)
        # Base drain: ~0.005% per second; motion drain up to 0.04% per second at full speed
        idle_drain = 0.005 * dt
        motion_drain = (abs(self.linear_velocity) * 0.03 + abs(self.angular_velocity) * 0.015) * dt
        self.battery_level = max(0.0, self.battery_level - (idle_drain + motion_drain))
        if self.battery_level <= 0.0:
            self.battery_level = 0.0
            self.linear_velocity = 0.0
            self.angular_velocity = 0.0
            self.target_linear_velocity = 0.0
            self.target_angular_velocity = 0.0
            self.operating_mode = "BATTERY_DEPLETED"

        self.sequence_counter += 1

    def reset_position(self, x: float = -3.0, y: float = -3.0, theta: float = 0.0) -> None:
        """Resets robot position and clear velocity/watchdogs."""
        self.x = x
        self.y = y
        self.theta = theta
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0
        self.target_linear_velocity = 0.0
        self.target_angular_velocity = 0.0
        self.battery_level = 100.0
        self.trail.clear()
        self.trail.append([round(self.x, 3), round(self.y, 3)])
        self.reset_emergency_stop()

    def get_telemetry_dict(self) -> Dict[str, Any]:
        """Returns snapshot telemetry dictionary."""
        return {
            "type": "telemetry",
            "robot_id": self.robot_id,
            "sequence": self.sequence_counter,
            "server_timestamp": round(time.time(), 4),
            "position": {
                "x": round(self.x, 3),
                "y": round(self.y, 3)
            },
            "heading": round(self.theta, 3),
            "linear_velocity": round(self.linear_velocity, 3),
            "angular_velocity": round(self.angular_velocity, 3),
            "target_linear_velocity": round(self.target_linear_velocity, 3),
            "target_angular_velocity": round(self.target_angular_velocity, 3),
            "battery_level": round(self.battery_level, 2),
            "operating_mode": self.operating_mode,
            "collision_warning": self.collision_warning,
            "last_command_id": self.last_command_id,
            "last_command_sequence": self.last_command_sequence,
            "lease_holder": self.lease_holder,
            "lease_active": self.is_lease_valid(),
            "trail": list(self.trail)
        }
