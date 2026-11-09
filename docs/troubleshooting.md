# RemoteBot Troubleshooting Guide

## 1. WebSocket Connection Failures
- **Symptom:** UI displays "Disconnected — Reconnecting in X ms..."
- **Checks:**
  1. Verify the backend is running (`http://localhost:8000/api/health`).
  2. Inspect browser console for WebSocket close codes:
     - `1006`: Abnormal closure (backend crashed or network port blocked).
     - `4001`: Unauthorized / invalid token.
     - `4004`: Robot ID not found in active fleet registry.
  3. Ensure no local firewall or antivirus blocks localhost WebSockets on port 8000.

## 2. Robot Movement Commands Ignored
- **Symptom:** Keys W/A/S/D are pressed, but the canvas robot does not move.
- **Checks:**
  1. Check **Emergency Stop Latch**: Look at the E-STOP indicator. If red, press **Reset Emergency Stop**.
  2. Check **Control Lease**: RemoteBot enforces exclusive operator leases. Click **Request Control Lease** in the header.
  3. Check **Watchdog / Latency**: If simulated packet loss is set to 100%, commands are dropped by the simulator before reaching the engine.
  4. Check **Battery Level**: If battery is depleted (0%), robot enters `DEPLETED` state. Reset simulation in the top bar.

## 3. High CPU Usage or Simulation Lag
- **Optimization:**
  - Telemetry streaming frequency can be tuned between 10 Hz and 50 Hz in the backend configuration (`TELEMETRY_HZ`).
  - Session recording buffers high-frequency state updates in memory before periodic batch flush to SQLite.
