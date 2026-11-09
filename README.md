# RemoteBot — Real-Time Robot Teleoperation & Network Reliability Simulator

[![RemoteBot CI](https://github.com/your-username/remote-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/remote-bot/actions/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **RemoteBot** is a production-grade, distributed virtual robotics platform engineered to demonstrate real-time mobile robot teleoperation, continuous low-latency telemetry streaming, deterministic software-defined network condition impairment, server-side fail-safe watchdogs, exclusive multi-operator lease management, and mission recording with timeline replay.

---

## 📑 Table of Contents
1. [Core Features](#-core-features)
2. [System Architecture](#-system-architecture)
3. [Kinematics & Differential Drive Math](#-kinematics--differential-drive-math)
4. [Safety & Fail-Safe Architecture](#-safety--fail-safe-architecture)
5. [Network Impairment Simulation Layer](#-network-impairment-simulation-layer)
6. [Acceptance Criteria Certification](#-acceptance-criteria-certification)
7. [Getting Started & Local Development](#-getting-started--local-development)
8. [Docker & Deployment](#-docker--deployment)
9. [Automated Testing Suite](#-automated-testing-suite)
10. [REST API & WebSocket Documentation](#-rest-api--websocket-documentation)

---

## 🚀 Core Features

- **Real-Time WebSocket Gateway:** Sequenced, timestamped bidirectional JSON command-response protocol operating at 20–50 Hz.
- **Differential-Drive Physics Simulation:** Realistic mobile robot kinematics with wheel velocities ($v_l, v_r$), acceleration ramp limiters, battery discharge dynamics, and arena collision boundaries.
- **Network Impairment Simulator:** Live operator controls for latency (0–1200ms), random Gaussian jitter, packet loss (0–100%), bandwidth throttling, and temporary signal blackouts.
- **Defense-in-Depth Safety:**
  - **Server-Side Movement Watchdog:** Automatically halts motion if commands or heartbeats lapse for > 600ms.
  - **Emergency STOP (E-STOP):** High-priority override latches safety state and blocks motion until explicit authorized reset.
  - **Collision Prevention:** Continuous bounding box and circular column collision detection.
- **Multi-Robot Fleet & Multi-Operator Leases:** Independent simulation states for `robot_alpha`, `robot_beta`, and `robot_gamma`. Exclusive control lease tokens prevent command conflict between operators.
- **Session Recording & Replay Engine:** Asynchronous non-blocking buffered persistence to SQLite/PostgreSQL with interactive timeline scrubber and diagnostic JSON report exports.
- **High-Performance UI Dashboard:** Built with React 18, TypeScript, Tailwind CSS, Lucide icons, Recharts live metric charts, and an HTML5 2D canvas simulation arena.

---

## 🏛️ System Architecture

```
+-------------------------------------------------------------------------+
|                              OPERATOR CLIENT                            |
|  +-------------------------------------------------------------------+  |
|  |                 React 18 + TypeScript + Vite                      |  |
|  |  +---------------------+  +-----------------+  +---------------+  |  |
|  |  | HTML5 2D Simulation |  | Keyboard (WASD) |  | Live Telemetry|  |  |
|  |  | Canvas Viewport     |  | Direction D-Pad |  | Recharts      |  |  |
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
|  - Priority Emergency STOP (E-STOP)                                     |
|  - Dead-Man's Watchdog (< 600ms command timeout)                        |
|  - Boundary & Obstacle Collision Enforcer                               |
|                                                                         |
|  [ Differential-Drive Simulation Engine ] (50 Hz Async Loop)           |
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

---

## 📐 Kinematics & Differential Drive Math

The robot features two driven wheels with wheel base $L = 0.5\text{ m}$ and radius $R = 0.1\text{ m}$.

### 1. Forward Kinematics
Given wheel linear speeds $v_r$ and $v_l$:
$$v = \frac{v_r + v_l}{2}$$
$$\omega = \frac{v_r - v_l}{L}$$

### 2. Inverse Kinematics
Given requested body linear velocity $v$ and angular turning rate $\omega$:
$$v_r = v + \frac{\omega \cdot L}{2}$$
$$v_l = v - \frac{\omega \cdot L}{2}$$

### 3. Discrete State Integration (Midpoint Runge-Kutta)
$$\theta_{t+1} = \theta_t + \omega \cdot \Delta t$$
$$\theta_{\text{mid}} = \theta_t + \frac{\omega \cdot \Delta t}{2}$$
$$x_{t+1} = x_t + v \cdot \cos(\theta_{\text{mid}}) \cdot \Delta t$$
$$y_{t+1} = y_t + v \cdot \sin(\theta_{\text{mid}}) \cdot \Delta t$$

---

## 🛡️ Safety & Fail-Safe Architecture

> [!IMPORTANT]
> **DISCLAIMER:** RemoteBot is strictly a software teleoperation simulator designed for research, testing, and portfolio demonstrations. It is not rated for controlling physical safety-critical hardware.

1. **Emergency STOP (E-STOP):**
   - Transmitted with priority, bypassing any queued movement commands.
   - Sets body linear and angular velocities to $(0, 0)$.
   - Latches `is_estopped = true` and rejects all incoming movement commands with status `e_stopped` until explicitly reset.
2. **Server-Side Watchdog (Dead-Man's Switch):**
   - Evaluates elapsed time since last valid movement command.
   - If $\Delta t > 600\text{ ms}$, automatically decelerates velocities to zero and sets mode to `WATCHDOG_STOPPED`.
3. **Collision Detection & Boundaries:**
   - Arena bounds $[-15\text{ m}, +15\text{ m}]$.
   - Circular columns and rectangular barriers.
   - Detects boundary contact and prevents penetration while allowing rotational steering recovery.

---

## 🌐 Network Impairment Simulation Layer

The Network Simulation Layer allows forward deployed engineers to stress-test robot responsiveness under realistic degraded wireless links:

| Preset | Latency | Jitter | Packet Loss | Link Status |
|---|---|---|---|---|
| **⚡ Excellent** | 15 ms | ±2 ms | 0% | Nominal Local Link |
| **📶 Normal 4G** | 60 ms | ±12 ms | 1% | Standard Wireless Broadband |
| **⚠️ Poor Network** | 220 ms | ±65 ms | 8% | Congested Cellular / Fringe Wi-Fi |
| **🌪️ Unstable Network** | 480 ms | ±180 ms | 22% | Satellite / Extreme Interference |
| **🚫 Offline** | 0 ms | 0 ms | 100% | Complete Signal Blackout |

---

## 🏆 Acceptance Criteria Certification

| Scenario | Requirement | Verification Method | Status |
|---|---|---|:---:|
| **SCENARIO 1** | Operator connects via WebSocket and teleoperates robot via W/A/S/D | End-to-end WebSocket integration test + UI D-Pad | ✅ PASS |
| **SCENARIO 2** | Live updates for position, velocity, heading, battery, and comms | 20 Hz telemetry broadcaster & Recharts live chart | ✅ PASS |
| **SCENARIO 3** | Adjusting network latency and loss updates live communication metrics | Real-time slider update + RTT & loss metric calculation | ✅ PASS |
| **SCENARIO 4** | Connection severed while moving triggers watchdog safe halt | Server watchdog timeout test (`test_server_watchdog_timeout`) | ✅ PASS |
| **SCENARIO 5** | Reconnection restores telemetry and requires fresh command before moving | State sync + auto-reconnect backoff loop | ✅ PASS |
| **SCENARIO 6** | E-STOP immediately halts motion and prevents movement until reset | E-STOP priority test (`test_emergency_stop_priority`) | ✅ PASS |
| **SCENARIO 7** | Multiple robots operate independently without crosstalk | Multi-instance `FleetManager` isolation | ✅ PASS |
| **SCENARIO 8** | Mission session recording and playback without sending motion commands | SQLite buffered recording + `ReplayViewer` | ✅ PASS |
| **SCENARIO 9** | Starts locally and via Docker Compose with passing tests | 16/16 Pytest tests passing in 1.75s + Vite build 0 errors | ✅ PASS |
| **SCENARIO 10**| Diagnostics panel pinpoints validation, ACK drops, or disconnections | Raw message event inspector with filters | ✅ PASS |

---

## 💻 Getting Started & Local Development

### Prerequisites
- Python 3.12+ (or 3.14+)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/remote-bot.git
cd remote-bot

# Install Python requirements
python -m pip install -r backend/requirements.txt

# Run automated tests
python -m pytest backend/tests -v

# Start FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🐳 Docker & Deployment

To launch the complete platform (backend + frontend reverse proxy) with one command:
```bash
docker compose up --build
```
- Frontend Dashboard: `http://localhost:3000`
- Backend REST & Swagger UI: `http://localhost:8000/docs`
- Healthcheck Endpoint: `http://localhost:8000/api/health`

---

## 🧪 Automated Testing Suite

RemoteBot includes a comprehensive automated test suite covering kinematics, safety latches, watchdog timers, network impairment, REST APIs, and WebSockets:

```bash
python -m pytest backend/tests -v
```

Output:
```
backend/tests/test_api.py::test_health_endpoint PASSED
backend/tests/test_api.py::test_list_robots_endpoint PASSED
backend/tests/test_api.py::test_environment_endpoint PASSED
backend/tests/test_api.py::test_auth_login PASSED
backend/tests/test_kinematics.py::test_inverse_forward_kinematics PASSED
backend/tests/test_kinematics.py::test_acceleration_limits PASSED
backend/tests/test_kinematics.py::test_pose_integration PASSED
backend/tests/test_network_impairment.py::test_packet_drop_behavior PASSED
backend/tests/test_network_impairment.py::test_deterministic_seed PASSED
backend/tests/test_network_impairment.py::test_network_metrics_tracker PASSED
backend/tests/test_recording.py::test_mission_recording_lifecycle PASSED
backend/tests/test_safety.py::test_emergency_stop_priority PASSED
backend/tests/test_safety.py::test_server_watchdog_timeout PASSED
backend/tests/test_safety.py::test_collision_detection PASSED
backend/tests/test_safety.py::test_battery_depletion PASSED
backend/tests/test_websocket.py::test_websocket_teleoperation_flow PASSED

============================= 16 passed in 1.75s ==============================
```

---

## 📖 REST API & WebSocket Documentation

Interactive Swagger documentation is automatically generated by FastAPI at:
`http://localhost:8000/docs`

For detailed protocol specifications, see:
- [WebSocket Protocol Specification](docs/websocket-protocol.md)
- [Architecture & System Design](docs/architecture.md)
- [Safety & Fail-Safe Architecture](docs/safety.md)
- [Network Simulation Documentation](docs/network-simulation.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
