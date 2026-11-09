import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Clock } from 'lucide-react';

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

  // Render canvas at current tick (Light theme)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !replayData || !replayData.telemetry[currentIndex]) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(width, height) / 34.0;
    const cx = width / 2;
    const cy = height / 2;
    const toCanvasX = (x: number) => cx + x * scale;
    const toCanvasY = (y: number) => cy - y * scale;

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = -15; x <= 15; x += 5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), toCanvasY(-15));
      ctx.lineTo(toCanvasX(x), toCanvasY(15));
      ctx.stroke();
    }
    for (let y = -15; y <= 15; y += 5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-15), toCanvasY(y));
      ctx.lineTo(toCanvasX(15), toCanvasY(y));
      ctx.stroke();
    }

    // Arena boundary
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(toCanvasX(-15), toCanvasY(15), 30 * scale, 30 * scale);

    // Trail up to current index
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
    ctx.lineWidth = 2.5;
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
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rPix * 1.35, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }, [replayData, currentIndex]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-800 shadow-xl">
          Loading replay mission data...
        </div>
      </div>
    );
  }

  const currentTick = replayData?.telemetry[currentIndex];
  const totalTicks = replayData?.telemetry?.length || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-6 shadow-2xl text-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Replay: {replayData?.session?.title || sessionId}
            </h2>
            <div className="text-xs text-slate-500">
              Robot: <span className="text-blue-600 font-mono font-semibold">{replayData?.session?.robot_id}</span> | Duration: {replayData?.session?.duration_sec}s | Samples: {totalTicks}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport & Telemetry HUD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center h-80 shadow-inner">
            <canvas ref={canvasRef} width={500} height={320} className="w-full h-full object-contain" />
          </div>

          {/* Telemetry at current tick */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs font-mono">
            <div className="text-slate-700 font-sans font-semibold border-b border-slate-200 pb-1">
              Sample #{currentIndex + 1} / {totalTicks}
            </div>
            <div>
              <span className="text-slate-500 font-sans">Position: </span>
              <span className="text-slate-900 font-semibold">
                X: {currentTick?.position?.x?.toFixed(2)}m, Y: {currentTick?.position?.y?.toFixed(2)}m
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Linear Speed: </span>
              <span className="text-blue-600 font-semibold">{currentTick?.linear_velocity?.toFixed(2)} m/s</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Angular Speed: </span>
              <span className="text-blue-600 font-semibold">{currentTick?.angular_velocity?.toFixed(2)} rad/s</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Battery: </span>
              <span className="text-emerald-600 font-semibold">{currentTick?.battery_level?.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Operating Mode: </span>
              <span className="text-amber-600 font-semibold">{currentTick?.operating_mode}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans">Recorded Latency: </span>
              <span className="text-purple-600 font-semibold">{currentTick?.rtt_ms?.toFixed(0)} ms</span>
            </div>
          </div>
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <input
            type="range"
            min="0"
            max={Math.max(0, totalTicks - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsPlaying(false);
                }}
                className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="text-slate-500 mr-1">Speed:</span>
              {[0.5, 1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border ${
                    playbackSpeed === speed
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
