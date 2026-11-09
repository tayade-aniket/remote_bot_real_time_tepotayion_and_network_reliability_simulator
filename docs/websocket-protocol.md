# RemoteBot WebSocket Message Protocol Specification

Version: 1.0.0
Transport: WebSocket (RFC 6455)
Encoding: JSON UTF-8
Endpoint: `/ws/robots/{robot_id}`

---

## 1. Overview
The RemoteBot protocol is a bi-directional, sequenced, timestamped JSON protocol supporting real-time teleoperation, live telemetry streaming, network condition configuration, safety events, and control lease management.

---

## 2. Client-to-Server Messages (Upstream)

### 2.1 Movement Command (`robot_command`)
Sent by the operator to control the robot's linear and angular velocity.
```json
{
  "type": "robot_command",
  "robot_id": "robot_alpha",
  "command_id": "cmd_0001",
  "sequence": 142,
  "timestamp": 1715428912.450,
  "operator_id": "operator_alice",
  "linear_velocity": 0.85,
  "angular_velocity": 0.40
}
```
Validation rules:
- `robot_id` must match connected endpoint.
- `sequence` must strictly increase; duplicate or older sequences are rejected.
- `timestamp` must be within 2.0s of server wall-clock (stale command rejection).
- Operator must hold valid control lease.
- Robot must NOT be in `EMERGENCY_STOPPED` state.

### 2.2 Emergency STOP (`emergency_stop`)
Immediate safety override.
```json
{
  "type": "emergency_stop",
  "robot_id": "robot_alpha",
  "command_id": "cmd_estop_99",
  "timestamp": 1715428913.100,
  "operator_id": "operator_alice",
  "reason": "Operator manual emergency stop"
}
```

### 2.3 Reset Emergency STOP (`reset_stop`)
Clears the safety latch after an E-STOP.
```json
{
  "type": "reset_stop",
  "robot_id": "robot_alpha",
  "timestamp": 1715428920.000,
  "operator_id": "operator_alice"
}
```

### 2.4 Heartbeat Ping (`ping`)
Periodic heartbeat message sent every 1000ms.
```json
{
  "type": "ping",
  "timestamp": 1715428921.150,
  "sequence": 45
}
```

### 2.5 Network Condition Configuration (`network_config`)
Updates the simulated network impairment parameters for this session/robot.
```json
{
  "type": "network_config",
  "robot_id": "robot_alpha",
  "latency_ms": 120.0,
  "jitter_ms": 25.0,
  "packet_loss_pct": 5.0,
  "bandwidth_limit_kbps": 256.0,
  "simulated_disconnect": false
}
```

### 2.6 Control Lease Request / Release (`lease_request` / `lease_release`)
```json
{
  "type": "lease_request",
  "robot_id": "robot_alpha",
  "operator_id": "operator_alice"
}
```

---

## 3. Server-to-Client Messages (Downstream)

### 3.1 Telemetry Packet (`telemetry`)
Streamed periodically (10-20 Hz) to all connected clients.
```json
{
  "type": "telemetry",
  "robot_id": "robot_alpha",
  "sequence": 8420,
  "server_timestamp": 1715428912.500,
  "position": {
    "x": 2.45,
    "y": -1.12
  },
  "heading": 1.25,
  "linear_velocity": 0.85,
  "angular_velocity": 0.40,
  "target_linear_velocity": 0.85,
  "target_angular_velocity": 0.40,
  "battery_level": 94.8,
  "operating_mode": "MANUAL_CONTROL",
  "collision_warning": false,
  "last_command_id": "cmd_0001",
  "last_command_sequence": 142,
  "lease_holder": "operator_alice",
  "lease_active": true
}
```

### 3.2 Command Acknowledgement (`command_ack`)
Sent in response to each command processed or rejected.
```json
{
  "type": "command_ack",
  "robot_id": "robot_alpha",
  "command_id": "cmd_0001",
  "sequence": 142,
  "status": "accepted",
  "rtt_ms": 24.5,
  "reason": null,
  "server_timestamp": 1715428912.474
}
```
Possible statuses:
- `accepted`: Processed and applied to simulation controller.
- `rejected`: Validation failed (out-of-bounds velocity, duplicate sequence, stale timestamp).
- `e_stopped`: Movement rejected because emergency stop latch is active.
- `unauthorized`: Operator does not hold exclusive control lease.

### 3.3 Heartbeat Pong (`pong`)
```json
{
  "type": "pong",
  "client_timestamp": 1715428921.150,
  "server_timestamp": 1715428921.170,
  "sequence": 45
}
```

### 3.4 Connection & Safety Alerts (`system_alert`)
```json
{
  "type": "system_alert",
  "robot_id": "robot_alpha",
  "level": "WARNING",
  "code": "WATCHDOG_TIMEOUT",
  "message": "Movement commands timed out (>600ms). Robot halted safely.",
  "timestamp": 1715428930.200
}
```
