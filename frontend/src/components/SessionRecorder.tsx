import React, { useState, useEffect } from 'react';
import { SessionSummary } from '../types';
import { CircleDot, Square, Play, Pause, RotateCcw, Download, History, Check } from 'lucide-react';

interface SessionRecorderProps {
  activeRobotId: string;
  currentOperator: string;
  isRecording: boolean;
  recordingSessionId: string | null;
  onStartRecording: (title: string) => void;
  onStopRecording: () => void;
  onSelectReplaySession: (sessionId: string) => void;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({
  activeRobotId,
  currentOperator,
  isRecording,
  recordingSessionId,
  onStartRecording,
  onStopRecording,
  onSelectReplaySession,
}) => {
  const [missionTitle, setMissionTitle] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Fetch past recordings from REST API
  const refreshSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, [isRecording]);

  // Elapsed timer when recording
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      setElapsedSec(0);
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStart = () => {
    const title = missionTitle.trim() || `Mission ${activeRobotId}`;
    onStartRecording(title);
    setMissionTitle('');
  };

  const exportSessionJson = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/replay`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `remotebot_${sessionId}_report.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-400" />
          <h2 className="font-semibold text-slate-100 text-base">Mission Recording & Telemetry Replay</h2>
        </div>

        {isRecording ? (
          <div className="flex items-center gap-2 text-xs text-red-400 font-mono bg-red-950/60 px-3 py-1 rounded-full border border-red-800/80 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            REC: {Math.floor(elapsedSec / 60)}:{(elapsedSec % 60).toString().padStart(2, '0')}
          </div>
        ) : (
          <span className="text-xs text-slate-500">Persistent SQLite Storage</span>
        )}
      </div>

      {/* Recording Action Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {!isRecording ? (
          <>
            <input
              type="text"
              placeholder="Mission Title (e.g. Navigation Stress Test #4)"
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleStart}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition shadow"
            >
              <CircleDot className="w-4 h-4" />
              Start Recording
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full bg-slate-950 p-3 rounded-lg border border-red-900/60">
            <div className="text-xs text-slate-300">
              Actively recording teleoperation telemetry, commands, and network events to database...
            </div>
            <button
              onClick={onStopRecording}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition"
            >
              <Square className="w-4 h-4 text-red-400" />
              Stop & Save Mission
            </button>
          </div>
        )}
      </div>

      {/* Past Sessions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3">Mission Title</th>
              <th className="py-2.5 px-3">Robot</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Commands</th>
              <th className="py-2.5 px-3">Avg RTT</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                  No recorded mission sessions found. Start a recording above to capture telemetry.
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-200">{s.title || s.id}</td>
                  <td className="py-2.5 px-3 text-slate-400">{s.robot_id}</td>
                  <td className="py-2.5 px-3 font-mono">{s.duration_sec.toFixed(1)}s</td>
                  <td className="py-2.5 px-3 font-mono">{s.total_commands}</td>
                  <td className="py-2.5 px-3 font-mono text-sky-400">{s.avg_latency_ms.toFixed(0)} ms</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onSelectReplaySession(s.id)}
                        className="px-2.5 py-1 rounded bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/60 transition flex items-center gap-1 text-[11px]"
                      >
                        <Play className="w-3 h-3" />
                        Replay
                      </button>
                      <button
                        onClick={() => exportSessionJson(s.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                        title="Download JSON Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
