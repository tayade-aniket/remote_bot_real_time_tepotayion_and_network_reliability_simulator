# RemoteBot — Real-Time Robot Teleoperation & Network Reliability Simulator

## Architecture & System Design Document

### 1. High-Level Architecture Overview

RemoteBot is a production-grade, distributed virtual robotics platform engineered for low-latency teleoperation, continuous telemetry streaming, and deterministic network reliability simulation.

```
+-------------------------------------------------------------------------+
|                              OPERATOR CLIENT                            |
|  +-------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript + Vite                      |  |
|  |  +---------------------+  +-----------------+  +---------------+  |  |
|  |  | HTML5 2D Simulation |  | Keyboard / Pad  |  | Live Telemetry|  |  |
|  |  | Canvas Viewport     |  | Control Manager |  | Recharts      |  |  |
|  |  +---------------------+  +-----------------+  +---------------+  |  |
|  |  +---------------------+  +-----------------+  +---------------+  |  |
|  |  | Network Condition   |  | Session Record  |  | Engineering   |  |  |
|  |  | Simulator Panel     |  | & Replay Engine |  | Diagnostics   |  |  |
|  |  +---------------------+  +-----------------+  +---------------+  |  |
|  +-----------------------------------|-------------------------------+  |
|                                      |                                  |
|                             WebSocket & HTTP REST                       |
+--------------------------------------|----------------------------------+
                                       |
+--------------------------------------v----------------------------------+
|                            FASTAPI BACKEND                              |
|                                                                         |
|  [ FastApi REST Gateway ] <----------> [ JWT / Session Auth & RBAC ]    |
|  - Robot CRUD & Fleet State             - Operator Ownership & Leases   |
|  - Recording & Replay API                                               |
|                                                                         |
|  [ WebSocket Connection Gateway ] <--> [ Network Simulation Layer ]     |
|  - Heartbeat & Ping/Pong                - Latency Delay Pipeline        |
|  - Sequence Tracking & De-dupe          - Jitter Gaussian Distribution  |
|  - Command ACK Generation               - Packet Drop Engine            |
|                                         - Disconnection Injection       |
|                                                                         |
|  [ Safety & Fail-Safe Watchdog ]                                        |
|  - Priority Emergency STOP                                              |
|  - Dead-Man's Watchdog (< 500ms heartbeat/command timeout)              |
|  - Boundary & Obstacle Collision Enforcer                               |
|                                                                         |
|  [ Differential-Drive Simulation Engine ] (10 - 50 Hz Async Loop)      |
|  - Forward/Inverse Kinematics (v, omega -> wheel velocities)            |
|  - Acceleration & Velocity Clamping                                     |
|  - Battery Depletion Dynamics                                           |
|  - Environment Physics & Trail Historian                                |
|                                                                         |
|  [ Buffered Session Recording Engine ]                                  |
|  - Non-blocking async queue for high-frequency telemetry                |
|  - SQLite / PostgreSQL via SQLAlchemy                                   |
+-------------------------------------------------------------------------+
```

### 2. Differential-Drive Kinematics Model

A mobile robot with differential drive has two fixed driven wheels sharing a common axis with distance $L$ (wheel base) and radius $R$.
Given right wheel speed $v_r$ and left wheel speed $v_l$:
- Linear Velocity: $v = \frac{v_r + v_l}{2}$
- Angular Velocity: $\omega = \frac{v_r - v_l}{L}$

Given target $(v, \omega)$, wheel velocities are computed via inverse kinematics:
- $v_r = v + \frac{\omega \cdot L}{2}$
- $v_l = v - \frac{\omega \cdot L}{2}$

Discrete State Transition over simulation timestep $\Delta t$:
- $\theta_{t+1} = \theta_t + \omega \cdot \Delta t$
- $x_{t+1} = x_t + v \cdot \cos(\theta_t) \cdot \Delta t$
- $y_{t+1} = y_t + v \cdot \sin(\theta_t) \cdot \Delta t$

### 3. Network Simulation Mechanics

The Network Simulation Layer sits between the raw WebSocket transport and the Robot Simulation Engine.
Impairment parameters:
- `latency_ms`: Minimum round-trip propagation delay.
- `jitter_ms`: Random variance applied to latency: $\Delta t_{delay} = \max(0, \text{latency} + \mathcal{N}(0, \text{jitter}^2))$.
- `packet_loss_pct`: Probability $P(\text{drop}) \in [0, 100]$ that any command or telemetry packet is dropped.
- `disconnection`: Simulated physical or transport link cut.

### 4. Safety Architecture & Watchdog
- **Emergency STOP (E-STOP)**:
  - Takes priority over any queued movement command.
  - Transitions robot state to `EMERGENCY_STOPPED`.
  - Velocity immediately forced to $(0, 0)$.
  - Movement commands are rejected with `SAFETY_LATCH_ACTIVE` until explicit operator reset.
- **Server-Side Watchdog**:
  - Independent timer evaluating elapsed time since last valid movement command.
  - If $\Delta t_{cmd} > \tau_{watchdog}$ (default: 600ms), velocity is automatically decelerated to 0 and robot status transitions to `IDLE_TIMEOUT`.
- **Collision Protection**:
  - Continuous circle-to-box & circle-to-circle collision detection against environment obstacles and arena perimeter walls $[-25, 25]$ meters.

### 5. Multi-Robot Isolation & Control Leases
- Each robot runs an isolated simulation loop and maintains independent network impairment parameters.
- Exclusive Control Lease: A robot can have multiple read-only observers, but only one authenticated operator holding an active `lease_token`.
- Leases automatically expire after 30 seconds of inactivity unless refreshed by heartbeat.
