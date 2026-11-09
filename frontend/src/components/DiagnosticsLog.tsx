import React, { useState } from 'react';
import { DiagnosticLog } from '../types';
import { Terminal, Download, Trash2 } from 'lucide-react';

interface DiagnosticsLogProps {
  logs: DiagnosticLog[];
  onClearLogs: () => void;
  connectionStatus: string;
  reconnectAttempts: number;
}

export const DiagnosticsLog: React.FC<DiagnosticsLogProps> = ({
  logs,
  onClearLogs,
  connectionStatus,
  reconnectAttempts,
}) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    if (filter === 'COMMANDS') return l.type.includes('command');
    if (filter === 'ALERTS') return l.status === 'e_stopped' || l.status === 'rejected';
    return true;
  });

  const downloadLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toISOString()}] [${l.direction}] [${l.type}] ${
            l.status ? `(Status: ${l.status})` : ''
          } - ${l.details}`
      )
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remotebot_diagnostics_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-800">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-base">Engineering Diagnostics & Raw Stream</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
              connectionStatus === 'CONNECTED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : connectionStatus === 'DEGRADED'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            WS: {connectionStatus} ({reconnectAttempts} retries)
          </span>

          <button
            onClick={downloadLogs}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition shadow-xs"
            title="Download Logs (.log)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClearLogs}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition shadow-xs"
            title="Clear Stream"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-3 text-xs">
        {['ALL', 'COMMANDS', 'ALERTS'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded transition font-medium ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 h-52 overflow-y-auto font-mono text-[11px] space-y-1.5 text-slate-200">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 italic">No message stream events recorded yet.</div>
        ) : (
          filteredLogs.slice(-60).map((log, index) => (
            <div key={index} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-500">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                  log.direction === 'UP' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'
                }`}
              >
                {log.direction}
              </span>
              <span className="text-slate-400 font-semibold">{log.type}</span>
              {log.status && (
                <span
                  className={`font-semibold ${
                    log.status === 'accepted'
                      ? 'text-emerald-400'
                      : log.status === 'e_stopped'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }`}
                >
                  [{log.status}]
                </span>
              )}
              <span className="text-slate-300 truncate">{log.details}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
