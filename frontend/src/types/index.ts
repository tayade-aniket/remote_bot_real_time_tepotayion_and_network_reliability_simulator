export interface RobotInfo {
  id: string;
  name: string;
  status: string;
  battery_level: number;
  position: { x: number; y: number };
  heading: number;
  linear_velocity: number;
  angular_velocity: number;
  is_estopped: boolean;
  lease_holder: string | null;
  lease_active: boolean;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface TelemetryData {
  type: string;
  robot_id: string;
  sequence: number;
  server_timestamp: number;
  position: Position2D;
  heading: number;
  linear_velocity: number;
  angular_velocity: number;
  target_linear_velocity: number;
  target_angular_velocity: number;
  battery_level: number;
  operating_mode: string;
  collision_warning: boolean;
  last_command_id: string | null;
  last_command_sequence: number | null;
  lease_holder: string | null;
  lease_active: boolean;
  trail?: [number, number][];
}

export interface NetworkConfig {
  robot_id: string;
  latency_ms: number;
  jitter_ms: number;
  packet_loss_pct: number;
  bandwidth_limit_kbps: number;
  simulated_disconnect: boolean;
  random_seed?: number;
}

export interface NetworkMetrics {
  robot_id: string;
  sent_commands: number;
  received_acks: number;
  dropped_commands: number;
  sent_telemetry: number;
  dropped_telemetry: number;
  delivery_ratio_pct: number;
  estimated_loss_pct: number;
  avg_rtt_ms: number;
  min_rtt_ms: number;
  max_rtt_ms: number;
  p95_rtt_ms: number;
  jitter_ms: number;
  reconnections_count: number;
  connection_status: 'CONNECTED' | 'DEGRADED' | 'DISCONNECTED';
}

export interface Obstacle {
  type: 'rect' | 'circle';
  name: string;
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
}

export interface EnvironmentData {
  bounds: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
  };
  obstacles: Obstacle[];
}

export interface SessionSummary {
  id: string;
  robot_id: string;
  operator_id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  duration_sec: number;
  total_commands: number;
  total_telemetry_ticks: number;
  avg_latency_ms: number;
  packet_loss_pct: number;
}

export interface CommandAck {
  type: 'command_ack';
  robot_id: string;
  command_id: string;
  sequence: number;
  status: 'accepted' | 'rejected' | 'e_stopped' | 'unauthorized';
  rtt_ms?: number;
  reason?: string;
  server_timestamp: number;
}

export interface DiagnosticLog {
  timestamp: number;
  direction: 'UP' | 'DOWN';
  type: string;
  status?: string;
  details: string;
}
