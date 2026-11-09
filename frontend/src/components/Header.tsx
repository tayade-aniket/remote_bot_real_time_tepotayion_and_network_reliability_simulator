import React from 'react';
import { RobotInfo } from '../types';
import { Bot, User, Cpu, RotateCcw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  robots: RobotInfo[];
  selectedRobotId: string;
  onSelectRobot: (id: string) => void;
  operator: string;
  onSwitchOperator: (name: string) => void;
  onResetRobot: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  robots,
  selectedRobotId,
  onSelectRobot,
  operator,
  onSwitchOperator,
  onResetRobot,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-md">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-100 text-lg tracking-tight">RemoteBot</h1>
            <span className="text-[10px] font-semibold bg-blue-950 text-blue-400 border border-blue-800/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Simulation Gateway v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-Time Teleoperation & Network Reliability Simulator
          </p>
        </div>
      </div>

      {/* Fleet Robot Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Active Robot:</span>
        </div>
        <select
          value={selectedRobotId}
          onChange={(e) => onSelectRobot(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          {robots.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id}) — {r.status}
            </option>
          ))}
        </select>

        <button
          onClick={onResetRobot}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
          title="Reset Robot Pose and Arena"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Reset Pose</span>
        </button>
      </div>

      {/* Operator Session Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Operator:</span>
          <select
            value={operator}
            onChange={(e) => onSwitchOperator(e.target.value)}
            className="bg-transparent font-semibold text-sky-400 focus:outline-none cursor-pointer"
          >
            <option value="operator_alice">operator_alice (Admin)</option>
            <option value="operator_bob">operator_bob (Pilot)</option>
            <option value="viewer_guest">viewer_guest (Observer)</option>
          </select>
        </div>
      </div>
    </header>
  );
};
