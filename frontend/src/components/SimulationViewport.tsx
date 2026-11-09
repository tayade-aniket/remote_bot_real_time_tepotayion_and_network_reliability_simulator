import React, { useRef, useEffect } from 'react';
import { TelemetryData, EnvironmentData } from '../types';

interface SimulationViewportProps {
  telemetry: TelemetryData | null;
  environment: EnvironmentData | null;
  robotName: string;
}

export const SimulationViewport: React.FC<SimulationViewportProps> = ({
  telemetry,
  environment,
  robotName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Coordinate transforms: Map arena [-15, 15] to canvas space
    // Arena is 30m x 30m. Add margin -> 34m span
    const arenaSpan = 34.0;
    const scale = Math.min(width, height) / arenaSpan;
    const centerX = width / 2;
    const centerY = height / 2;

    const toCanvasX = (worldX: number) => centerX + worldX * scale;
    const toCanvasY = (worldY: number) => centerY - worldY * scale; // Invert Y for cartesian

    // 1. Draw Grid Lines (every 2.5 meters)
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    for (let x = -15; x <= 15; x += 2.5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(x), toCanvasY(-15));
      ctx.lineTo(toCanvasX(x), toCanvasY(15));
      ctx.stroke();
    }
    for (let y = -15; y <= 15; y += 2.5) {
      ctx.beginPath();
      ctx.moveTo(toCanvasX(-15), toCanvasY(y));
      ctx.lineTo(toCanvasX(15), toCanvasY(y));
      ctx.stroke();
    }

    // 2. Draw Arena Boundaries
    ctx.strokeStyle = '#38bdf8'; // sky-400
    ctx.lineWidth = 2.5;
    const bMinX = toCanvasX(-15);
    const bMaxX = toCanvasX(15);
    const bMinY = toCanvasY(15); // flipped Y
    const bMaxY = toCanvasY(-15);
    ctx.strokeRect(bMinX, bMinY, bMaxX - bMinX, bMaxY - bMinY);

    // 3. Draw Static Obstacles
    if (environment && environment.obstacles) {
      for (const obs of environment.obstacles) {
        if (obs.type === 'circle' && obs.radius) {
          ctx.beginPath();
          ctx.arc(toCanvasX(obs.x), toCanvasY(obs.y), obs.radius * scale, 0, Math.PI * 2);
          ctx.fillStyle = '#334155'; // slate-700
          ctx.fill();
          ctx.strokeStyle = '#64748b'; // slate-500
          ctx.lineWidth = 2;
          ctx.stroke();

          // Obstacle label
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obs.name, toCanvasX(obs.x), toCanvasY(obs.y) + 4);
        } else if (obs.type === 'rect' && obs.width && obs.height) {
          const rx = toCanvasX(obs.x);
          const ry = toCanvasY(obs.y + obs.height);
          const rw = obs.width * scale;
          const rh = obs.height * scale;

          ctx.fillStyle = '#334155';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx, ry, rw, rh);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obs.name, rx + rw / 2, ry + rh / 2 + 4);
        }
      }
    }

    // 4. Draw Robot Movement Trail
    if (telemetry && telemetry.trail && telemetry.trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // cyan translucent
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < telemetry.trail.length; i++) {
        const pt = telemetry.trail[i];
        const tx = toCanvasX(pt[0]);
        const ty = toCanvasY(pt[1]);
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.setLineDash([]); // reset line dash
    }

    // 5. Draw Robot Entity
    const robX = telemetry ? telemetry.position.x : -3.0;
    const robY = telemetry ? telemetry.position.y : -3.0;
    const robHeading = telemetry ? telemetry.heading : 0.0;
    const robotRadius = 0.35; // meters
    const rPix = robotRadius * scale;

    const cx = toCanvasX(robX);
    const cy = toCanvasY(robY);

    // Collision warning halo
    if (telemetry?.collision_warning) {
      ctx.beginPath();
      ctx.arc(cx, cy, rPix * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.fill();
    }

    // Chassis body
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-robHeading); // Inverted due to canvas Y

    // Robot body circle
    ctx.beginPath();
    ctx.arc(0, 0, rPix, 0, Math.PI * 2);
    ctx.fillStyle = telemetry?.operating_mode === 'EMERGENCY_STOPPED' ? '#ef4444' : '#2563eb';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Wheels (Differential drive wheels on left & right)
    const wheelW = rPix * 0.4;
    const wheelH = rPix * 0.9;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-wheelW / 2, -rPix - 2, wheelW, 4); // Left wheel
    ctx.fillRect(-wheelW / 2, rPix - 2, wheelW, 4);  // Right wheel

    // Heading Arrow pointer
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rPix * 1.4, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Arrow tip
    ctx.beginPath();
    ctx.moveTo(rPix * 1.4, 0);
    ctx.lineTo(rPix * 1.0, -rPix * 0.4);
    ctx.lineTo(rPix * 1.0, rPix * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // Robot Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(robotName, cx, cy - rPix - 8);

    // Coordinates HUD
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`X: ${robX.toFixed(2)}m  Y: ${robY.toFixed(2)}m  θ: ${((robHeading * 180) / Math.PI).toFixed(1)}°`, 12, height - 12);

    // Scale Indicator in bottom right
    const scaleMeters = 5.0;
    const scalePix = scaleMeters * scale;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width - 20 - scalePix, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${scaleMeters}m`, width - 20 - scalePix / 2, height - 25);

  }, [telemetry, environment, robotName]);

  return (
    <div className="relative w-full h-[540px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={720}
        height={540}
        className="w-full h-full object-contain cursor-crosshair"
      />
      {telemetry?.collision_warning && (
        <div className="absolute top-4 left-4 bg-red-600/90 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white"></span>
          COLLISION DETECTED — REVERSE OR ROTATE
        </div>
      )}
      {telemetry?.operating_mode === 'EMERGENCY_STOPPED' && (
        <div className="absolute top-4 right-4 bg-red-700/90 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2">
          SAFETY LATCH ACTIVE (E-STOP)
        </div>
      )}
    </div>
  );
};
