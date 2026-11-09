# RemoteBot Network Impairment Simulation Layer

## 1. Concept and Purpose
In real-world field robotics, forward deployed engineers must ensure teleoperated robots handle poor connectivity: high packet loss, unpredictable cellular jitter, satellite delays, and temporary signal blackouts.

RemoteBot incorporates a software-defined network condition emulator directly in the message processing loop, allowing deterministic stress testing of operator control under adverse conditions.

---

## 2. Simulated Network Impairment Parameters

| Parameter | Unit | Range | Description |
|-----------|------|-------|-------------|
| `latency_ms` | Milliseconds | 0 – 2000 ms | Base propagation delay applied to incoming commands and outgoing telemetry. |
| `jitter_ms` | Milliseconds | 0 – 500 ms | Random Gaussian variation around the base latency ($\mu = \text{latency}, \sigma = \text{jitter}$). Clamped to $\ge 0$. |
| `packet_loss_pct`| Percentage | 0% – 100% | Probability of dropping a command or telemetry packet entirely. |
| `bandwidth_limit_kbps` | Kbps | 8 – 10000 Kbps | Rate limiting / packet queue throttler. |
| `simulated_disconnect` | Boolean | True / False | Force drops the transport link, triggering client reconnect and server watchdog. |

---

## 3. Presets

1. **Excellent Network (Local / Fiber Wi-Fi)**
   - Latency: 15 ms
   - Jitter: 2 ms
   - Packet Loss: 0%

2. **Normal Network (Standard 4G / Broadband)**
   - Latency: 60 ms
   - Jitter: 12 ms
   - Packet Loss: 1%

3. **Poor Network (Congested 4G / Fringe Wi-Fi)**
   - Latency: 220 ms
   - Jitter: 65 ms
   - Packet Loss: 8%

4. **Unstable Network (Satellite / Severe Interference)**
   - Latency: 480 ms
   - Jitter: 180 ms
   - Packet Loss: 22%

5. **Offline / Disconnected**
   - Simulated Disconnect: Active
   - Packet Loss: 100%

---

## 4. Communication Health Metrics
- **Round-Trip Time (RTT)**: Command send timestamp to acknowledgement arrival time.
- **Packet Delivery Ratio (PDR)**:
  $$\text{Delivery Ratio} = \frac{\text{Received ACKs}}{\text{Sent Commands}} \times 100\%$$
- **Application-Level Packet Loss**:
  $$\text{Loss Rate} = 100\% - \text{Delivery Ratio}$$
- **Jitter Variance**: Running standard deviation of RTT samples.
