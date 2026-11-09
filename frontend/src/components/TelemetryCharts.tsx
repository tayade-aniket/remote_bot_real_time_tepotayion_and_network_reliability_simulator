import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TelemetryData, NetworkMetrics } from '../types';
import { Gauge, Battery, Compass, Radio, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

interface TelemetryChartsProps {
  telemetry: TelemetryData | null;
  metrics: NetworkMetrics | null;
  history: Array<{
    time: string;
    speed: number;
    angular: number;
    rtt: number;
    battery: number;
  }>;
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  telemetry,
  metrics,
  history,
}) => {
  const headingDegrees = telemetry ? Math.round((telemetry.heading * 180) / Math.PI) : 0;
  const battery = telemetry ? telemetry.battery_level : 100;

  return (
    <div className="space-y-4">
      {/* Real-time KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Speed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Linear Speed</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {telemetry ? telemetry.linear_velocity.toFixed(2) : '0.00'}{' '}
            <span className="text-xs text-slate-400 font-sans">m/s</span>
          </div>
        </div>

        {/* Angular Speed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Angular Speed</span>
            <Compass className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {telemetry ? telemetry.angular_velocity.toFixed(2) : '0.00'}{' '}
            <span className="text-xs text-slate-400 font-sans">rad/s</span>
          </div>
        </div>

        {/* Heading */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Heading</span>
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {headingDegrees}°
          </div>
        </div>

        {/* Battery */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Battery Level</span>
            <Battery className={`w-4 h-4 ${battery < 20 ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {battery.toFixed(1)}%
          </div>
        </div>

        {/* Round Trip Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Round Trip RTT</span>
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {metrics ? metrics.avg_rtt_ms.toFixed(0) : '0'}{' '}
            <span className="text-xs text-slate-400 font-sans">ms</span>
          </div>
        </div>

        {/* Delivery Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Delivery Ratio</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {metrics ? metrics.delivery_ratio_pct.toFixed(1) : '100.0'}%
          </div>
        </div>
      </div>

      {/* Synchronized Recharts Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Velocity Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Live Robot Velocity (m/s & rad/s)</span>
            <span className="text-sky-400 font-mono">v: {telemetry?.linear_velocity.toFixed(2) ?? 0}</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tick={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[-2, 2]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  name="Linear v (m/s)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="angular"
                  name="Angular ω (rad/s)"
                  stroke="#818cf8"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency & RTT Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Network Latency RTT & Jitter (ms)</span>
            <span className="text-indigo-400 font-mono">RTT: {metrics?.avg_rtt_ms.toFixed(0) ?? 0}ms</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tick={false} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rtt"
                  name="RTT (ms)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
