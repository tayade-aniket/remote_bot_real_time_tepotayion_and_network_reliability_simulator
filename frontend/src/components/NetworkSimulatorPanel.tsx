import React, { useState } from 'react';
import { NetworkConfig } from '../types';
import { Wifi, WifiOff, Activity, Sliders, Zap, RefreshCw } from 'lucide-react';

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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-sky-400" />
          <h2 className="font-semibold text-slate-100 text-base">Network Condition Simulator</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          {localConfig.simulated_disconnect ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="text-red-400 font-medium">Link Severed</span>
            </>
          ) : localConfig.packet_loss_pct > 10 || localConfig.latency_ms > 200 ? (
            <>
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-medium">Impaired</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Nominal</span>
            </>
          )}
        </div>
      </div>

      {/* Preset Profiles */}
      <div className="mb-5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
          Environment Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            onClick={() => applyPreset({ latency: 15, jitter: 2, loss: 0, disconnect: false })}
            className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 border border-slate-700 transition"
          >
            ⚡ Excellent (15ms)
          </button>
          <button
            onClick={() => applyPreset({ latency: 60, jitter: 12, loss: 1, disconnect: false })}
            className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-sky-400 border border-slate-700 transition"
          >
            📶 Normal 4G (60ms)
          </button>
          <button
            onClick={() => applyPreset({ latency: 220, jitter: 65, loss: 8, disconnect: false })}
            className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-amber-400 border border-slate-700 transition"
          >
            ⚠️ Poor (220ms, 8%)
          </button>
          <button
            onClick={() => applyPreset({ latency: 480, jitter: 180, loss: 22, disconnect: false })}
            className="px-2.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-orange-400 border border-slate-700 transition"
          >
            🌪️ Unstable (22% loss)
          </button>
          <button
            onClick={() => applyPreset({ latency: 0, jitter: 0, loss: 100, disconnect: true })}
            className="px-2.5 py-2 text-xs font-medium rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 transition"
          >
            🚫 Offline
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Added Latency (RTT Base)</span>
            <span className="font-mono text-sky-400 font-semibold">{localConfig.latency_ms} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="1200"
            step="10"
            value={localConfig.latency_ms}
            onChange={(e) => handleSliderChange('latency_ms', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Jitter */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Random Jitter (Variance)</span>
            <span className="font-mono text-sky-400 font-semibold">±{localConfig.jitter_ms} ms</span>
          </div>
          <input
            type="range"
            min="0"
            max="300"
            step="5"
            value={localConfig.jitter_ms}
            onChange={(e) => handleSliderChange('jitter_ms', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Packet Loss */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Simulated Packet Loss</span>
            <span className="font-mono text-red-400 font-semibold">{localConfig.packet_loss_pct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={localConfig.packet_loss_pct}
            onChange={(e) => handleSliderChange('packet_loss_pct', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400"
          />
        </div>

        {/* Bandwidth Limiter */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Bandwidth Throttle</span>
            <span className="font-mono text-amber-400 font-semibold">{localConfig.bandwidth_limit_kbps} Kbps</span>
          </div>
          <input
            type="range"
            min="16"
            max="10000"
            step="128"
            value={localConfig.bandwidth_limit_kbps}
            onChange={(e) => handleSliderChange('bandwidth_limit_kbps', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* Fault Injection Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={triggerTemporaryBlackout}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/50 flex items-center gap-1.5 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            Inject 5s Signal Blackout
          </button>
          <button
            onClick={() => handleSliderChange('simulated_disconnect', !localConfig.simulated_disconnect)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              localConfig.simulated_disconnect
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-red-950 text-red-300 border-red-800'
            }`}
          >
            {localConfig.simulated_disconnect ? 'Reconnect Link' : 'Sever Link Permanently'}
          </button>
        </div>

        <div className="text-[11px] text-slate-500 italic">
          *Impairments are injected directly into application-layer WebSocket queues.
        </div>
      </div>
    </div>
  );
};
