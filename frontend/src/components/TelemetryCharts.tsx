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
import { Gauge, Battery, Compass, Radio, Activity } from 'lucide-react';

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
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Linear Speed</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {telemetry ? telemetry.linear_velocity.toFixed(2) : '0.00'}{' '}
            <span className="text-xs text-slate-500 font-sans font-normal">m/s</span>
          </div>
        </div>

        {/* Angular Speed */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Angular Speed</span>
            <Compass className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {telemetry ? telemetry.angular_velocity.toFixed(2) : '0.00'}{' '}
            <span className="text-xs text-slate-500 font-sans font-normal">rad/s</span>
          </div>
        </div>

        {/* Heading */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Heading</span>
            <Compass className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {headingDegrees}°
          </div>
        </div>

        {/* Battery */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Battery Level</span>
            <Battery className={`w-4 h-4 ${battery < 20 ? 'text-red-500' : 'text-emerald-600'}`} />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {battery.toFixed(1)}%
          </div>
        </div>

        {/* Round Trip Latency */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Round Trip RTT</span>
            <Radio className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {metrics ? metrics.avg_rtt_ms.toFixed(0) : '0'}{' '}
            <span className="text-xs text-slate-500 font-sans font-normal">ms</span>
          </div>
        </div>

        {/* Delivery Ratio */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-medium">
            <span>Delivery Ratio</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {metrics ? metrics.delivery_ratio_pct.toFixed(1) : '100.0'}%
          </div>
        </div>
      </div>

      {/* Synchronized Recharts Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Velocity Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Live Robot Velocity (m/s & rad/s)</span>
            <span className="text-blue-600 font-mono font-medium">v: {telemetry?.linear_velocity.toFixed(2) ?? 0}</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tick={false} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[-2, 2]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  name="Linear v (m/s)"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="angular"
                  name="Angular ω (rad/s)"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency & RTT Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Network Latency RTT & Jitter (ms)</span>
            <span className="text-indigo-600 font-mono font-medium">RTT: {metrics?.avg_rtt_ms.toFixed(0) ?? 0}ms</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tick={false} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="rtt"
                  name="RTT (ms)"
                  stroke="#7c3aed"
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
