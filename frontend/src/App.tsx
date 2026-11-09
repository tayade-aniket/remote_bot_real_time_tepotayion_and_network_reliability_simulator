import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RobotInfo,
  TelemetryData,
  NetworkConfig,
  NetworkMetrics,
  EnvironmentData,
  DiagnosticLog,
} from './types';
import { Header } from './components/Header';
import { SimulationViewport } from './components/SimulationViewport';
import { RobotControls } from './components/RobotControls';
import { NetworkSimulatorPanel } from './components/NetworkSimulatorPanel';
import { TelemetryCharts } from './components/TelemetryCharts';
import { SessionRecorder } from './components/SessionRecorder';
import { ReplayViewer } from './components/ReplayViewer';
import { DiagnosticsLog } from './components/DiagnosticsLog';

export const App: React.FC = () => {
  // Fleet & Selection State
  const [robots, setRobots] = useState<RobotInfo[]>([]);
  const [selectedRobotId, setSelectedRobotId] = useState<string>('robot_alpha');
  const [operator, setOperator] = useState<string>('operator_alice');
  const [environment, setEnvironment] = useState<EnvironmentData | null>(null);

  // Live Telemetry & Metrics
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    robot_id: 'robot_alpha',
    latency_ms: 0,
    jitter_ms: 0,
    packet_loss_pct: 0,
    bandwidth_limit_kbps: 10000,
    simulated_disconnect: false,
  });

  // Telemetry History for Charts (Last 30 points)
  const [history, setHistory] = useState<
    Array<{ time: string; speed: number; angular: number; rtt: number; battery: number }>
  >([]);

  // Diagnostics & Raw Logs
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('CONNECTING');
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  // Recording & Replay State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

  // WebSocket Ref & Sequence Tracking
  const wsRef = useRef<WebSocket | null>(null);
  const sequenceRef = useRef<number>(1);
  const reconnectTimeoutRef = useRef<any>(null);

  // Keep latest operator and metrics in refs to avoid reconnect loops when state updates
  const operatorRef = useRef(operator);
  operatorRef.current = operator;

  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  // Log append helper
  const addLog = useCallback(
    (direction: 'UP' | 'DOWN', type: string, details: string, status?: string) => {
      setLogs((prev) => [
        ...prev.slice(-99),
        {
          timestamp: Date.now(),
          direction,
          type,
          details,
          status,
        },
      ]);
    },
    []
  );

  // 1. Fetch Fleet & Arena Environment
  const loadInitialData = async () => {
    try {
      const [rRes, envRes] = await Promise.all([
        fetch('/api/robots'),
        fetch('/api/simulation/environment'),
      ]);
      if (rRes.ok) {
        const rData = await rRes.json();
        setRobots(rData);
      }
      if (envRes.ok) {
        const envData = await envRes.json();
        setEnvironment(envData);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. WebSocket Connection Lifecycle
  const connectWebSocket = useCallback(() => {
    // Clear any pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Cleanly detach event handlers from previous socket to prevent spurious error/close events
    if (wsRef.current) {
      const prevWs = wsRef.current;
      prevWs.onopen = null;
      prevWs.onmessage = null;
      prevWs.onerror = null;
      prevWs.onclose = null;
      if (prevWs.readyState === WebSocket.OPEN || prevWs.readyState === WebSocket.CONNECTING) {
        prevWs.close();
      }
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/robots/${selectedRobotId}?token=demo`;

    setConnectionStatus('CONNECTING');
    addLog('UP', 'WS_CONNECT', `Connecting to ${selectedRobotId}...`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (e) {
      console.warn('Failed to construct WebSocket:', e);
      return;
    }

    ws.onopen = () => {
      if (wsRef.current !== ws) return;

      setConnectionStatus('CONNECTED');
      setReconnectAttempts(0);
      addLog('DOWN', 'WS_OPEN', `WebSocket connected to ${selectedRobotId}`);

      // Request control lease on open
      ws.send(
        JSON.stringify({
          type: 'lease_request',
          robot_id: selectedRobotId,
          operator_id: operatorRef.current,
        })
      );
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'telemetry') {
          const telem = data as TelemetryData;
          setTelemetry(telem);

          // Update chart history
          setHistory((prev) => [
            ...prev.slice(-30),
            {
              time: new Date().toLocaleTimeString(),
              speed: telem.linear_velocity,
              angular: telem.angular_velocity,
              rtt: metricsRef.current ? metricsRef.current.avg_rtt_ms : 0,
              battery: telem.battery_level,
            },
          ]);
        } else if (data.type === 'command_ack') {
          addLog(
            'DOWN',
            'command_ack',
            `Cmd ${data.command_id} seq #${data.sequence} - RTT: ${data.rtt_ms ?? 0}ms`,
            data.status
          );
        } else if (data.type === 'lease_status') {
          addLog('DOWN', 'lease_status', `Holder: ${data.lease_holder}, Active: ${data.lease_active}`);
        } else if (data.type === 'pong') {
          // Heartbeat response
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setConnectionStatus('DISCONNECTED');
      addLog('DOWN', 'WS_CLOSE', `Disconnected from ${selectedRobotId}. Reconnecting in 2s...`);

      // Automatic reconnection with backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempts((prev) => prev + 1);
        connectWebSocket();
      }, 2000);
    };

    ws.onerror = (err) => {
      if (wsRef.current !== ws) return;
      console.warn('WebSocket connection event:', err);
    };
  }, [selectedRobotId, addLog]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const activeWs = wsRef.current;
        activeWs.onopen = null;
        activeWs.onmessage = null;
        activeWs.onerror = null;
        activeWs.onclose = null;
        if (activeWs.readyState === WebSocket.OPEN || activeWs.readyState === WebSocket.CONNECTING) {
          activeWs.close();
        }
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // 3. Periodic Ping & Network Metrics Polling
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ping',
            timestamp: Date.now() / 1000,
            sequence: sequenceRef.current++,
          })
        );
      }
    }, 1000);

    const metricsInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/robots/${selectedRobotId}/network`);
        if (res.ok) {
          const mData = await res.json();
          setMetrics(mData);
        }
      } catch (e) {}
    }, 1500);

    return () => {
      clearInterval(pingInterval);
      clearInterval(metricsInterval);
    };
  }, [selectedRobotId]);

  // 4. Send Movement Command
  const sendMovementCommand = useCallback(
    (linear: number, angular: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const seq = sequenceRef.current++;
      const cmdId = `cmd_${seq}`;
      const payload = {
        type: 'robot_command',
        robot_id: selectedRobotId,
        command_id: cmdId,
        sequence: seq,
        timestamp: Date.now() / 1000,
        operator_id: operator,
        linear_velocity: linear,
        angular_velocity: angular,
      };

      wsRef.current.send(JSON.stringify(payload));
      addLog('UP', 'robot_command', `seq #${seq}: v=${linear.toFixed(2)} w=${angular.toFixed(2)}`);
    },
    [selectedRobotId, operator, addLog]
  );

  // 5. Emergency STOP
  const handleEmergencyStop = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const seq = sequenceRef.current++;
    const payload = {
      type: 'emergency_stop',
      robot_id: selectedRobotId,
      command_id: `estop_${seq}`,
      sequence: seq,
      timestamp: Date.now() / 1000,
      operator_id: operator,
      reason: 'Operator Emergency Stop pressed',
    };
    wsRef.current.send(JSON.stringify(payload));
    addLog('UP', 'emergency_stop', 'Priority Emergency STOP dispatched!', 'e_stopped');
  }, [selectedRobotId, operator, addLog]);

  // 6. Reset Emergency STOP
  const handleResetStop = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const seq = sequenceRef.current++;
    const payload = {
      type: 'reset_stop',
      robot_id: selectedRobotId,
      sequence: seq,
      timestamp: Date.now() / 1000,
      operator_id: operator,
    };
    wsRef.current.send(JSON.stringify(payload));
    addLog('UP', 'reset_stop', 'Reset Safety Latch dispatched');
  }, [selectedRobotId, operator, addLog]);

  // 7. Update Network Configuration
  const handleUpdateNetworkConfig = useCallback(
    async (newConfig: NetworkConfig) => {
      setNetworkConfig(newConfig);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'network_config',
            ...newConfig,
          })
        );
      }
      addLog(
        'UP',
        'network_config',
        `Lat: ${newConfig.latency_ms}ms, Loss: ${newConfig.packet_loss_pct}%, Disconnect: ${newConfig.simulated_disconnect}`
      );
    },
    [addLog]
  );

  // 8. Lease Actions
  const handleRequestLease = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'lease_request',
          robot_id: selectedRobotId,
          operator_id: operator,
        })
      );
      addLog('UP', 'lease_request', `Requested exclusive control by ${operator}`);
    }
  }, [selectedRobotId, operator, addLog]);

  const handleReleaseLease = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'lease_release',
          robot_id: selectedRobotId,
          operator_id: operator,
        })
      );
      addLog('UP', 'lease_release', `Released control lease for ${selectedRobotId}`);
    }
  }, [selectedRobotId, operator, addLog]);

  // 9. Mission Recording Actions
  const handleStartRecording = async (title: string) => {
    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          robot_id: selectedRobotId,
          operator_id: operator,
          title,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecordingSessionId(data.session_id);
        setIsRecording(true);
        addLog('UP', 'MISSION_REC_START', `Started mission recording ${data.session_id}`);
      }
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const handleStopRecording = async () => {
    if (!recordingSessionId) return;
    try {
      const res = await fetch(`/api/sessions/${recordingSessionId}/stop`, { method: 'POST' });
      if (res.ok) {
        setIsRecording(false);
        setRecordingSessionId(null);
        addLog('UP', 'MISSION_REC_STOP', 'Stopped mission recording and persisted to DB');
      }
    } catch (e) {
      console.error('Failed to stop recording:', e);
    }
  };

  // 10. Reset Robot Position
  const handleResetRobot = async () => {
    try {
      await fetch(`/api/robots/${selectedRobotId}/reset`, { method: 'POST' });
      addLog('UP', 'ROBOT_RESET', `Reset position and safety state for ${selectedRobotId}`);
    } catch (e) {}
  };

  const currentRobot = robots.find((r) => r.id === selectedRobotId);

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800">
      {/* Top Navigation & Fleet Bar */}
      <Header
        robots={robots}
        selectedRobotId={selectedRobotId}
        onSelectRobot={(id) => {
          setSelectedRobotId(id);
          setHistory([]);
        }}
        operator={operator}
        onSwitchOperator={setOperator}
        onResetRobot={handleResetRobot}
      />

      {/* Main Operations Grid */}
      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto space-y-5">
        {/* Top Split: 2D Simulation Viewport + Teleoperation & Network Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Virtual Environment 2D Canvas */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <SimulationViewport
              telemetry={telemetry}
              environment={environment}
              robotName={currentRobot?.name || selectedRobotId}
            />
          </div>

          {/* Right: Controls & Network Condition Simulator */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            <RobotControls
              onSendCommand={sendMovementCommand}
              onEmergencyStop={handleEmergencyStop}
              onResetStop={handleResetStop}
              onRequestLease={handleRequestLease}
              onReleaseLease={handleReleaseLease}
              isEstopped={telemetry?.operating_mode === 'EMERGENCY_STOPPED'}
              leaseActive={telemetry?.lease_active ?? false}
              leaseHolder={telemetry?.lease_holder ?? null}
              currentOperator={operator}
            />

            <NetworkSimulatorPanel
              config={networkConfig}
              onUpdateConfig={handleUpdateNetworkConfig}
            />
          </div>
        </div>

        {/* Real-time Telemetry & Performance Charts */}
        <TelemetryCharts
          telemetry={telemetry}
          metrics={metrics}
          history={history}
        />

        {/* Bottom Split: Mission Recording & Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SessionRecorder
            activeRobotId={selectedRobotId}
            currentOperator={operator}
            isRecording={isRecording}
            recordingSessionId={recordingSessionId}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onSelectReplaySession={(sId) => setReplaySessionId(sId)}
          />

          <DiagnosticsLog
            logs={logs}
            onClearLogs={() => setLogs([])}
            connectionStatus={connectionStatus}
            reconnectAttempts={reconnectAttempts}
          />
        </div>
      </main>

      {/* Telemetry Replay Modal */}
      {replaySessionId && (
        <ReplayViewer
          sessionId={replaySessionId}
          onClose={() => setReplaySessionId(null)}
        />
      )}
    </div>
  );
};
export default App;
