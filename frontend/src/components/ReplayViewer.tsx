import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, FastForward, Clock } from 'lucide-react';

interface ReplayViewerProps {
  sessionId: string;
  onClose: () => void;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({ sessionId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [replayData, setReplayData] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load replay data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/sessions/${sessionId}/replay`);
        if (res.ok) {
          const data = await res.json();
          setReplayData(data);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Error fetching replay data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  // Playback timer
  useEffect(() => {
    let interval: any;
    if (isPlaying && replayData && replayData.telemetry.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= replayData.telemetry.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 50 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, replayData, playbackSpeed]);

  // Render canvas at current tick
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !replayData || !replayData.telemetry[currentIndex]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width, height) / 34.0;
    const cx = width / 2;
    const cy = height / 2;
    const toCanvasX = (x: number) => cx + x * scale;
    const toCanvasY = (y: number) => cy - y * scale;

    // Arena boundary
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(toCanvasX(-15), toCanvasY(15), 30 * scale, 30 * scale);

    // Trail up to current index
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= currentIndex; i++) {
      const t = replayData.telemetry[i];
      const px = toCanvasX(t.position.x);
      const py = toCanvasY(t.position.y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Robot body
    const curTelem = replayData.telemetry[currentIndex];
    const rx = toCanvasX(curTelem.position.x);
    const ry = toCanvasY(curTelem.position.y);
    const heading = curTelem.heading;
    const rPix = 0.35 * scale;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(-heading);

    ctx.beginPath();
    ctx.arc(0, 0, rPix, 0, Math.PI * 2);
    ctx.fillStyle = '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rPix * 1.3, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }, [replayData, currentIndex]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-slate-200">
          Loading replay mission data...
        </div>
      </div>
    );
  }

  const currentTick = replayData?.telemetry[currentIndex];
  const totalTicks = replayData?.telemetry?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl text-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-400" />
              Replay: {replayData?.session?.title || sessionId}
            </h2>
            <div className="text-xs text-slate-400">
              Robot: <span className="text-sky-300 font-mono">{replayData?.session?.robot_id}</span> | Duration: {replayData?.session?.duration_sec}s | Samples: {totalTicks}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport & Telemetry HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center h-80">
            <canvas ref={canvasRef} width={500} height={320} className="w-full h-full object-contain" />
          </div>

          {/* Telemetry at current tick */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 text-xs font-mono">
            <div className="text-slate-400 font-sans font-semibold border-b border-slate-800 pb-1">
              Sample #{currentIndex + 1} / {totalTicks}
            </div>
            <div>
              <span className="text-slate-500 font-sans">Position: </span>
              <span className="text-slate-200">
                X: {currentTick?.position?.x?.toFixed(2)}m, Y: {currentTick?.position?.y?.toFixed(2)}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Linear Speed: </span>
              <span className="text-sky-400">{currentTick?.linear_velocity?.toFixed(2)} m/s</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Angular Speed: </span>
              <span className="text-sky-400">{currentTick?.angular_velocity?.toFixed(2)} rad/s</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Battery: </span>
              <span className="text-emerald-400">{currentTick?.battery_level?.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Operating Mode: </span>
              <span className="text-amber-400">{currentTick?.operating_mode}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Recorded Latency: </span>
              <span className="text-indigo-400">{currentTick?.rtt_ms?.toFixed(0)} ms</span>
            </div>
          </div>
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalTicks - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsPlaying(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 mr-1">Speed:</span>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    playbackSpeed === speed
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
