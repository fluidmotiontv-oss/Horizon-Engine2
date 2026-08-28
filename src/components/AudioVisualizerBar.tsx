import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../lib/audioEngine';

export const AudioVisualizerBar: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const fft = audioEngine.getFFTData();
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barCount = 32;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = fft[i * 2] || 0;
        const barHeight = (val / 255) * height;

        const hue = 180 + (i / barCount) * 140;
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
      <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider shrink-0">
        LIVE FFT SPECTRUM:
      </span>
      <canvas ref={canvasRef} width={280} height={20} className="w-full h-5 rounded block" />
    </div>
  );
};
