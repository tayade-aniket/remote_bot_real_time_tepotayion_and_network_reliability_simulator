# RemoteBot Safety and Fail-Safe Architecture

> [!IMPORTANT]
> **DISCLAIMER:** This project is strictly a virtual robotics simulation and network testing environment. It is NOT certified, rated, or intended for the direct control or actuation of physical safety-critical robotic equipment.

---

## 1. Safety Principles for Remote Teleoperation

Operating mobile robotics across public or unreliable wireless networks (Wi-Fi, 4G/5G, satellite) exposes the system to intermittent latency spikes, packet drops, and transport connection drops. Without fail-safe mechanisms, a robot might continue executing its last received velocity command indefinitely ("runaway robot").

RemoteBot addresses these real-world failure modes through defense-in-depth safety layers.

---

## 2. Server-Side Movement Watchdog (Dead-Man's Switch)

### Mechanism
- The server maintains a high-resolution monotonic timestamp `last_valid_command_time` for each robot.
- In every simulation physics tick (typically 50 Hz):
  $$\Delta t_{\text{idle}} = t_{\text{now}} - t_{\text{last\_command}}$$
- If $\Delta t_{\text{idle}} > \tau_{\text{watchdog}}$ (configurable, default: **500 ms**):
  - Target linear velocity is forced to $0.0 \text{ m/s}$.
  - Target angular velocity is forced to $0.0 \text{ rad/s}$.
  - The operating mode transitions to `IDLE_WATCHDOG_STOP`.
  - A `WATCHDOG_TRIGGERED` telemetry alert is dispatched.

---

## 3. Priority Emergency STOP (E-STOP)

### Mechanism
- Operator triggers E-STOP via the UI button, spacebar, or keyboard shortcut.
- The command bypasses any queued movement packets on the WebSocket transport and executes synchronously.
- **Actions taken:**
  1. Current linear and angular velocity instantly zeroed.
  2. Operating mode transitions to `EMERGENCY_STOPPED`.
  3. Safety latch `is_estopped = true` is set.
- **Latch Behavior:**
  - While latched, all subsequent `robot_command` messages are strictly rejected with status `e_stopped`.
  - The robot CANNOT move until an authorized operator dispatches a dedicated `reset_stop` command.

---

## 4. Collision Detection & Boundary Enforcement

### Virtual Environment Parameters
- Arena dimensions: $[-25.0 \text{ m}, +25.0 \text{ m}]$ on X and Y axes.
- Robot radius: $0.35 \text{ m}$ (standard differential-drive footprint).
- Obstacle types: Static rectangular barriers and circular pillars.

### Enforcement Logic
- Before state integration, the simulation engine calculates candidate position:
  $$p_{\text{candidate}} = p_t + v \cdot \Delta t$$
- If $p_{\text{candidate}}$ penetrates an arena perimeter wall or intersects an obstacle bounding box:
  - Velocity along the collision normal is clamped to zero.
  - A `COLLISION_DETECTED` warning flag is set in the live telemetry packet.
  - Position is projected back to the tangent contact surface, preventing tunneling.
