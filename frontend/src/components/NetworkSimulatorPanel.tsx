import React, { useState } from 'react';
import { NetworkConfig } from '../types';
import { Wifi, WifiOff, Activity, Sliders, Zap } from 'lucide-react';

interface NetworkSimulatorPanelProps {
  config: NetworkConfig;
  onUpdateConfig: (newConfig: NetworkConfig) => void;
}

export const NetworkSimulatorPanel: React.FC<NetworkSimulatorPanelProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [localConfig, setLocalConfig] = useState<NetworkConfig>(config);

  const applyPreset = (preset: {
    latency: number;
    jitter: number;
    loss: number;
    disconnect: boolean;
  }) => {
    const updated: NetworkConfig = {
      ...localConfig,
      latency_ms: preset.latency,
      jitter_ms: preset.jitter,
      packet_loss_pct: preset.loss,
      simulated_disconnect: preset.disconnect,
    };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const handleSliderChange = (field: keyof NetworkConfig, value: any) => {
    const updated = { ...localConfig, [field]: value };
    setLocalConfig(updated);
    onUpdateConfig(updated);
  };

  const triggerTemporaryBlackout = () => {
    // Cut link immediately
    const severed = { ...localConfig, simulated_disconnect: true };
    setLocalConfig(severed);
    onUpdateConfig(severed);

    // Auto recover after 5 seconds
    setTimeout(() => {
      const recovered = { ...severed, simulated_disconnect: false };
      setLocalConfig(recovered);
      onUpdateConfig(recovered);
    }, 5000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-800">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-base">Network Condition Simulator</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border">
          {localConfig.simulated_disconnect ? (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              <WifiOff className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span className="font-medium">Link Severed</span>
            </div>
          ) : localConfig.packet_loss_pct > 10 || localConfig.latency_ms > 200 ? (
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium">Impaired</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">Nominal</span>
            </div>
          )}
        </div>
      </div>

      {/* Preset Profiles */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
          Impairment Profiles
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => applyPreset({ latency: 15, jitter: 2, loss: 0, disconnect: false })}
            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-emerald-700 border border-slate-200 transition shadow-xs text-slate-700"
          >
            ⚡ Excellent (15ms)
          </button>
          <button
            onClick={() => applyPreset({ latency: 60, jitter: 12, loss: 1, disconnect: false })}
            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-blue-700 border border-slate-200 transition shadow-xs text-slate-700"
          >
            📶 Normal 4G (60ms)
          </button>
          <button
            onClick={() => applyPreset({ latency: 220, jitter: 65, loss: 8, disconnect: false })}
            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-amber-700 border border-slate-200 transition shadow-xs text-slate-700"
          >
            ⚠️ Poor (220ms, 8%)
          </button>
          <button
            onClick={() => applyPreset({ latency: 480, jitter: 180, loss: 22, disconnect: false })}
            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-orange-700 border border-slate-200 transition shadow-xs text-slate-700"
          >
            🌪️ Unstable (22% loss)
          </button>
          <button
            onClick={() => applyPreset({ latency: 0, jitter: 0, loss: 100, disconnect: true })}
            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition shadow-xs"
          >
            🚫 Offline Link
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex justify-between text-xs mb-1 font-medium">
            <span className="text-slate-600">Added Latency (RTT Base)</span>
            <span className="font-mono text-blue-600 font-semibold">{localConfig.latency_ms} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="1200"
            step="10"
            value={localConfig.latency_ms}
            onChange={(e) => handleSliderChange('latency_ms', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Jitter */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex justify-between text-xs mb-1 font-medium">
            <span className="text-slate-600">Random Jitter (Variance)</span>
            <span className="font-mono text-blue-600 font-semibold">±{localConfig.jitter_ms} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="300"
            step="5"
            value={localConfig.jitter_ms}
            onChange={(e) => handleSliderChange('jitter_ms', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Packet Loss */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex justify-between text-xs mb-1 font-medium">
            <span className="text-slate-600">Simulated Packet Loss</span>
            <span className="font-mono text-red-600 font-semibold">{localConfig.packet_loss_pct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={localConfig.packet_loss_pct}
            onChange={(e) => handleSliderChange('packet_loss_pct', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
          />
        </div>

        {/* Bandwidth Limiter */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div className="flex justify-between text-xs mb-1 font-medium">
            <span className="text-slate-600">Bandwidth Throttle</span>
            <span className="font-mono text-amber-600 font-semibold">{localConfig.bandwidth_limit_kbps} Kbps</span>
          </div>
          <input
            type="range"
            min="16"
            max="10000"
            step="128"
            value={localConfig.bandwidth_limit_kbps}
            onChange={(e) => handleSliderChange('bandwidth_limit_kbps', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
        </div>
      </div>

      {/* Fault Injection Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={triggerTemporaryBlackout}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1.5 transition shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            Inject 5s Signal Blackout
          </button>
          <button
            onClick={() => handleSliderChange('simulated_disconnect', !localConfig.simulated_disconnect)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-xs ${
              localConfig.simulated_disconnect
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            {localConfig.simulated_disconnect ? 'Restore Link' : 'Sever Link Permanently'}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          *Applied in real time at WebSocket application transport pipeline.
        </div>
      </div>
    </div>
  );
};
