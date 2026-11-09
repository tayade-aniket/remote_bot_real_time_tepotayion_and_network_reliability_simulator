import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldAlert, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Key, Lock, Unlock } from 'lucide-react';

interface RobotControlsProps {
  onSendCommand: (linear: number, angular: number) => void;
  onEmergencyStop: () => void;
  onResetStop: () => void;
  onRequestLease: () => void;
  onReleaseLease: () => void;
  isEstopped: boolean;
  leaseActive: boolean;
  leaseHolder: string | null;
  currentOperator: string;
}

export const RobotControls: React.FC<RobotControlsProps> = ({
  onSendCommand,
  onEmergencyStop,
  onResetStop,
  onRequestLease,
  onReleaseLease,
  isEstopped,
  leaseActive,
  leaseHolder,
  currentOperator,
}) => {
  const [linearSpeedLimit, setLinearSpeedLimit] = useState<number>(0.8);
  const [angularSpeedLimit, setAngularSpeedLimit] = useState<number>(1.2);
  const [activeKeys, setActiveKeys] = useState<{ [key: string]: boolean }>({});
  
  const isHoldingLease = leaseHolder === currentOperator && leaseActive;

  // Track key combinations using ref to avoid stale closures in interval
  const keysRef = useRef<{ [key: string]: boolean }>({});
  keysRef.current = activeKeys;

  // Keyboard command loop: continuously sends movement commands while keys are held down (20 Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = keysRef.current;
      if (isEstopped) return;

      let targetV = 0.0;
      let targetW = 0.0;

      if (keys['w'] || keys['W'] || keys['ArrowUp']) targetV += linearSpeedLimit;
      if (keys['s'] || keys['S'] || keys['ArrowDown']) targetV -= linearSpeedLimit;
      if (keys['a'] || keys['A'] || keys['ArrowLeft']) targetW += angularSpeedLimit;
      if (keys['d'] || keys['D'] || keys['ArrowRight']) targetW -= angularSpeedLimit;

      if (targetV !== 0.0 || targetW !== 0.0) {
        onSendCommand(targetV, targetW);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [linearSpeedLimit, angularSpeedLimit, isEstopped, onSendCommand]);

  // Global keydown / keyup handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        onEmergencyStop();
        return;
      }

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        setActiveKeys((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      
      setActiveKeys((prev) => {
        const next = { ...prev };
        delete next[e.key.toLowerCase()];
        return next;
      });

      // Send a single stop command when key is released
      onSendCommand(0.0, 0.0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onEmergencyStop, onSendCommand]);

  // On-screen manual button push helpers
  const handlePadPress = (v: number, w: number) => {
    onSendCommand(v * linearSpeedLimit, w * angularSpeedLimit);
  };

  const handlePadRelease = () => {
    onSendCommand(0.0, 0.0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-sky-400" />
          <h2 className="font-semibold text-slate-100 text-base">Teleoperation Controls</h2>
        </div>
        
        {/* Lease Controller */}
        <div className="flex items-center gap-2">
          {isHoldingLease ? (
            <button
              onClick={onReleaseLease}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900/60 flex items-center gap-1.5 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              Controls Active (Release)
            </button>
          ) : (
            <button
              onClick={onRequestLease}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow"
            >
              <Lock className="w-3.5 h-3.5" />
              {leaseHolder ? `Acquired by ${leaseHolder} (Override)` : 'Request Control Lease'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Direction Pad */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-slate-400 mb-2 font-medium">Virtual D-Pad (or W, A, S, D)</div>
          <div className="grid grid-cols-3 gap-2 w-36 h-36">
            <div></div>
            <button
              onMouseDown={() => handlePadPress(1, 0)}
              onMouseUp={handlePadRelease}
              onTouchStart={() => handlePadPress(1, 0)}
              onTouchEnd={handlePadRelease}
              className={`flex items-center justify-center rounded-lg border transition ${
                activeKeys['w'] || activeKeys['arrowup']
                  ? 'bg-sky-500 text-white border-sky-400 scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div></div>

            <button
              onMouseDown={() => handlePadPress(0, 1)}
              onMouseUp={handlePadRelease}
              onTouchStart={() => handlePadPress(0, 1)}
              onTouchEnd={handlePadRelease}
              className={`flex items-center justify-center rounded-lg border transition ${
                activeKeys['a'] || activeKeys['arrowleft']
                  ? 'bg-sky-500 text-white border-sky-400 scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => onSendCommand(0, 0)}
              className="flex items-center justify-center rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >
              Halt
            </button>

            <button
              onMouseDown={() => handlePadPress(0, -1)}
              onMouseUp={handlePadRelease}
              onTouchStart={() => handlePadPress(0, -1)}
              onTouchEnd={handlePadRelease}
              className={`flex items-center justify-center rounded-lg border transition ${
                activeKeys['d'] || activeKeys['arrowright']
                  ? 'bg-sky-500 text-white border-sky-400 scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div></div>
            <button
              onMouseDown={() => handlePadPress(-1, 0)}
              onMouseUp={handlePadRelease}
              onTouchStart={() => handlePadPress(-1, 0)}
              onTouchEnd={handlePadRelease}
              className={`flex items-center justify-center rounded-lg border transition ${
                activeKeys['s'] || activeKeys['arrowdown']
                  ? 'bg-sky-500 text-white border-sky-400 scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <div></div>
          </div>
        </div>

        {/* Speed Limits Configuration */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Linear Target Speed</span>
              <span className="font-mono text-sky-400 font-semibold">{linearSpeedLimit.toFixed(2)} m/s</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={linearSpeedLimit}
              onChange={(e) => setLinearSpeedLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">Angular Turning Speed</span>
              <span className="font-mono text-sky-400 font-semibold">{angularSpeedLimit.toFixed(2)} rad/s</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="3.0"
              step="0.1"
              value={angularSpeedLimit}
              onChange={(e) => setAngularSpeedLimit(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Kinematic limits clamped server-side with max accel.
          </div>
        </div>

        {/* Priority Emergency STOP Section */}
        <div className="flex flex-col items-center justify-center border-l border-slate-800/80 pl-4 space-y-3">
          <button
            onClick={onEmergencyStop}
            className={`w-full py-5 rounded-xl font-black text-lg tracking-wider uppercase transition shadow-2xl flex items-center justify-center gap-2.5 ${
              isEstopped
                ? 'bg-red-600 text-white ring-4 ring-red-500/40 animate-pulse'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <ShieldAlert className="w-6 h-6" />
            EMERGENCY STOP
          </button>

          {isEstopped ? (
            <button
              onClick={onResetStop}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Safety Latch
            </button>
          ) : (
            <div className="text-xs text-slate-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">SPACE</kbd> anytime to activate E-STOP
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
