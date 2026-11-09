import React from 'react';
import { RobotInfo } from '../types';
import { Bot, User, Cpu, RotateCcw } from 'lucide-react';

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
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-900 text-lg tracking-tight">RemoteBot</h1>
            <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Simulation Gateway v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-Time Robot Teleoperation & Network Reliability Simulator
          </p>
        </div>
      </div>

      {/* Fleet Robot Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Active Robot:</span>
        </div>
        <select
          value={selectedRobotId}
          onChange={(e) => onSelectRobot(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-sm transition"
        >
          {robots.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.id}) — {r.status}
            </option>
          ))}
        </select>

        <button
          onClick={onResetRobot}
          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition text-xs font-medium flex items-center gap-1.5 shadow-sm"
          title="Reset Robot Pose and Arena"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Reset Arena</span>
        </button>
      </div>

      {/* Operator Session Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs shadow-sm">
          <User className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 font-medium">Operator:</span>
          <select
            value={operator}
            onChange={(e) => onSwitchOperator(e.target.value)}
            className="bg-transparent font-semibold text-blue-600 focus:outline-none cursor-pointer"
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
