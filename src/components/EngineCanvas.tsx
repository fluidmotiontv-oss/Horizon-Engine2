import React, { useEffect, useRef, useState } from 'react';
import { CanvasMode, ModularControls, TelemetryData } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { Maximize2, Camera, Activity, Radio, Cpu, RefreshCw, Maximize, Minimize, Shuffle, Video } from 'lucide-react';

interface EngineCanvasProps {
  canvasMode: CanvasMode;
  controls: ModularControls;
  episodeCode: string;
  episodeTitle: string;
  activeAssetTitle?: string;
  onControlsChange?: (updated: Partial<ModularControls>) => void;
  isRecording4K?: boolean;
  onToggleRecording?: () => void;
  onHyperRandomize?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hueOffset: number;
}

export const EngineCanvas: React.FC<EngineCanvasProps> = ({
  canvasMode,
  controls,
  episodeCode,
  episodeTitle,
  activeAssetTitle,
  isRecording4K = false,
  onToggleRecording,
  onHyperRandomize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.warn("Error attempting to enable full-screen mode:", err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    fps: 60,
    frameTimeMs: 16.6,
    activeParticles: 420,
    audioPeakDb: -24,
    syncStatus: 'D9-LOCK 100%',
  });

  const mousePosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovering: false });
  const animFrameIdRef = useRef<number | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mousePosRef.current.targetX = x;
    mousePosRef.current.targetY = y;
    mousePosRef.current.isHovering = true;
  };

  const handleMouseLeave = () => {
    mousePosRef.current.targetX = 0;
    mousePosRef.current.targetY = 0;
    mousePosRef.current.isHovering = false;
  };

  // Screenshot capture tool
  const takeScreenshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `horizon-engine-${canvasMode}-${Date.now()}.png`;
    a.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Canvas Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      
      if (isRecording4K) {
        // Force 4K resolution (3840x2160) for recording
        // We scale the context by 2x and use 1920x1080 logical coordinates 
        // to maintain consistent visual thickness for lines and shapes
        canvas.width = 3840;
        canvas.height = 2160;
        ctx.resetTransform();
        ctx.scale(2, 2);
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const TWO_PI = Math.PI * 2;
    const emptyFft = new Uint8Array(64);

    // Main Render Loop
    const render = () => {
      if (!containerRef.current || !canvas) return;
      
      let width: number;
      let height: number;
      
      if (isRecording4K) {
        // Use 1080p mathematical coordinate space, which is scaled 2x to 4K by the context
        width = 1920;
        height = 1080;
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      }

      // Smooth mouse interpolation
      mousePosRef.current.x += (mousePosRef.current.targetX - mousePosRef.current.x) * 0.08;
      mousePosRef.current.y += (mousePosRef.current.targetY - mousePosRef.current.y) * 0.08;

      // Update time step based on speed multiplier
      time += 0.015 * controls.speed;

      // Get FFT audio data if audio reactive
      let fft = emptyFft;
      let audioFactor = 1.0;
      if (controls.audioReactive) {
        fft = audioEngine.getFFTData();
        let sum = 0;
        for (let i = 0; i < 16; i++) {
          sum += fft[i];
        }
        audioFactor = 1.0 + (sum / 4080) * 1.2; // 4080 is 16 * 255
      }

      // Clear Canvas with Trail Effect
      ctx.fillStyle = `rgba(7, 7, 9, ${0.15 + (1.0 - controls.bloomIntensity / 3.0) * 0.25})`;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const primaryHue = controls.hue;
      const secondaryHue = (controls.hue + 140) % 360;

      // -----------------------------------------------------------------
      // MODE 1: LOTUS SACRED GEOMETRY
      // -----------------------------------------------------------------
      if (canvasMode === 'generative_geometry') {
        const petals = Math.max(3, Math.min(12, Math.round(controls.geometryDensity)));
        const baseRadius = Math.min(width, height) * 0.28 * audioFactor;

        ctx.save();
        ctx.translate(centerX + mousePosRef.current.x * 40, centerY + mousePosRef.current.y * 40);

        // Concentric Glowing Rings
        for (let ring = 1; ring <= 4; ring++) {
          const ringRad = baseRadius * (0.35 * ring);
          ctx.beginPath();
          ctx.arc(0, 0, ringRad, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${primaryHue + ring * 15}, 100%, 65%, ${0.25 * controls.bloomIntensity})`;
          ctx.lineWidth = ring % 2 === 0 ? 1 : 2;
          ctx.stroke();
        }

        // Petal Layers
        const layers = 3;
        for (let l = 0; l < layers; l++) {
          const layerAngle = time * (l % 2 === 0 ? 1 : -1) * (0.5 + l * 0.2) + (l * Math.PI) / petals;
          const layerRad = baseRadius * (1.1 - l * 0.25);

          ctx.save();
          ctx.rotate(layerAngle);

          for (let p = 0; p < petals; p++) {
            const angle = (p * TWO_PI) / petals;
            const x1 = Math.cos(angle) * layerRad;
            const y1 = Math.sin(angle) * layerRad;

            const cpAngle1 = angle - (0.4 / petals) * TWO_PI;
            const cpAngle2 = angle + (0.4 / petals) * TWO_PI;
            const cpx1 = Math.cos(cpAngle1) * (layerRad * 1.4);
            const cpy1 = Math.sin(cpAngle1) * (layerRad * 1.4);
            const cpx2 = Math.cos(cpAngle2) * (layerRad * 1.4);
            const cpy2 = Math.sin(cpAngle2) * (layerRad * 1.4);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x1, y1);

            if (controls.wireframeOnly) {
              ctx.strokeStyle = `hsla(${primaryHue + p * 10}, 100%, 60%, ${0.7 * controls.bloomIntensity})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            } else {
              const grad = ctx.createLinearGradient(0, 0, x1, y1);
              grad.addColorStop(0, `hsla(${primaryHue}, 100%, 50%, 0.05)`);
              grad.addColorStop(0.5, `hsla(${secondaryHue}, 100%, 60%, ${0.4 * controls.bloomIntensity})`);
              grad.addColorStop(1, `hsla(${primaryHue + 40}, 100%, 70%, 0.8)`);
              ctx.fillStyle = grad;
              ctx.fill();
              ctx.strokeStyle = `hsla(${primaryHue + p * 5}, 100%, 75%, ${0.8 * controls.bloomIntensity})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // Center Pulsing Core
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.12 * (1 + Math.sin(time * 3) * 0.2), 0, TWO_PI);
        ctx.fillStyle = `hsla(${primaryHue}, 100%, 80%, ${0.9 * controls.bloomIntensity})`;
        ctx.shadowColor = `hsla(${primaryHue}, 100%, 50%, 1)`;
        ctx.shadowBlur = 25 * controls.bloomIntensity;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 2: PLASMA TENDRILS
      // -----------------------------------------------------------------
      else if (canvasMode === 'plasma') {
        const tendrilCount = Math.max(12, Math.round(controls.geometryDensity * 4));
        const chaos = controls.distortionRate;

        ctx.save();
        ctx.translate(centerX, centerY);

        const pointerX = mousePosRef.current.x * width;
        const pointerY = mousePosRef.current.y * height;
        const maxLength = Math.min(width, height) * 0.45 * audioFactor;
        const time2 = time * 2;
        const time15 = time * 1.5;
        const sinTime30 = Math.sin(time) * 30;

        for (let i = 0; i < tendrilCount; i++) {
          const baseAngle = (i * TWO_PI) / tendrilCount + time * 0.3;
          ctx.beginPath();
          ctx.moveTo(0, 0);

          let px = 0;
          let py = 0;
          const segments = 18;

          for (let s = 1; s <= segments; s++) {
            const frac = s / segments;
            const dist = maxLength * frac;

            const noise1 = Math.sin(time2 + s * 0.4 + i) * (20 * chaos);
            const noise2 = Math.cos(time15 - s * 0.6 + i) * (20 * chaos);

            // Pull towards cursor
            const pullX = pointerX * frac * 0.35;
            const pullY = pointerY * frac * 0.35;

            px = Math.cos(baseAngle) * dist + noise1 + pullX;
            py = Math.sin(baseAngle) * dist + noise2 + pullY;

            ctx.lineTo(px, py);
          }

          const h = (primaryHue + i * 8 + sinTime30) % 360;
          ctx.strokeStyle = `hsla(${h}, 100%, 65%, ${0.5 * controls.bloomIntensity})`;
          ctx.lineWidth = 1.5 + (i % 3) * 0.8;
          
          if (controls.bloomIntensity > 0.5) {
            ctx.shadowColor = `hsla(${h}, 100%, 50%, 0.8)`;
            ctx.shadowBlur = 12 * controls.bloomIntensity;
          }
          
          ctx.stroke();
          ctx.shadowBlur = 0;

          // End Arc Spark
          ctx.beginPath();
          ctx.arc(px, py, 3 + (i % 3), 0, TWO_PI);
          ctx.fillStyle = `hsla(${h}, 100%, 85%, 0.9)`;
          ctx.fill();
        }
        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 3: NEON TUNNEL LOOP
      // -----------------------------------------------------------------
      else if (canvasMode === 'tunnel') {
        const rings = Math.max(8, Math.round(controls.geometryDensity * 2.5));
        const sides = Math.max(4, Math.round(controls.geometryDensity));

        ctx.save();
        ctx.translate(centerX + mousePosRef.current.x * 60, centerY + mousePosRef.current.y * 60);

        for (let r = rings; r >= 1; r--) {
          const zProgress = ((time * 2 + r * 0.5) % rings) / rings;
          const radius = Math.pow(zProgress, 1.8) * (Math.min(width, height) * 0.6) * audioFactor;
          const alpha = Math.sin(zProgress * Math.PI) * 0.8 * controls.bloomIntensity;

          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const angle = (s * TWO_PI) / sides + time * 0.2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();

          const ringHue = (primaryHue + r * 12) % 360;
          if (controls.wireframeOnly) {
            ctx.strokeStyle = `hsla(${ringHue}, 100%, 65%, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.strokeStyle = `hsla(${ringHue}, 100%, 70%, ${alpha})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            if (r % 2 === 0) {
              ctx.fillStyle = `hsla(${ringHue}, 100%, 50%, ${alpha * 0.15})`;
              ctx.fill();
            }
          }

          // Tunnel Perspective Connecting Lines
          if (r === rings) {
            ctx.beginPath();
            for (let s = 0; s < sides; s++) {
              const angle = (s * TWO_PI) / sides + time * 0.2;
              const xEnd = Math.cos(angle) * radius;
              const yEnd = Math.sin(angle) * radius;
              ctx.moveTo(0, 0);
              ctx.lineTo(xEnd, yEnd);
            }
            ctx.strokeStyle = `hsla(${primaryHue}, 100%, 60%, ${0.2 * controls.bloomIntensity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 4: VIDEO STREAM
      // -----------------------------------------------------------------
      else if (canvasMode === 'video') {
        // High-tech Video Stream Canvas Simulation
        ctx.save();

        // Background animated grid
        const gridSize = 40;
        ctx.strokeStyle = `hsla(${primaryHue}, 80%, 50%, 0.08)`;
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Simulated CRT Scanline
        const scanY = (time * 120) % height;
        ctx.fillStyle = `hsla(${primaryHue}, 100%, 70%, 0.15)`;
        ctx.fillRect(0, scanY, width, 4);

        // Simulated video frame HUD graphics
        ctx.translate(centerX, centerY);

        ctx.strokeStyle = `hsla(${primaryHue}, 100%, 60%, 0.8)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-width * 0.35, -height * 0.3, width * 0.7, height * 0.6);

        // Corner Target Reticles
        const frameW = width * 0.35;
        const frameH = height * 0.3;
        const cLen = 20;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(-frameW, -frameH + cLen);
        ctx.lineTo(-frameW, -frameH);
        ctx.lineTo(-frameW + cLen, -frameH);
        // Top Right
        ctx.moveTo(frameW - cLen, -frameH);
        ctx.lineTo(frameW, -frameH);
        ctx.lineTo(frameW, -frameH + cLen);
        // Bottom Right
        ctx.moveTo(frameW, frameH - cLen);
        ctx.lineTo(frameW, frameH);
        ctx.lineTo(frameW - cLen, frameH);
        // Bottom Left
        ctx.moveTo(-frameW + cLen, frameH);
        ctx.lineTo(-frameW, frameH);
        ctx.lineTo(-frameW, frameH - cLen);

        ctx.strokeStyle = `hsla(${secondaryHue}, 100%, 75%, 1)`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 5: PARTICLE SWARM
      // -----------------------------------------------------------------
      else if (canvasMode === 'particle_swarm') {
        const maxParticles = Math.floor(controls.geometryDensity * 100);
        
        // Spawn particles based on FFT data
        if (controls.audioReactive) {
          const spawnCount = Math.floor((fft[2] + fft[4] + fft[6]) / 150);
          for (let i = 0; i < spawnCount && particlesRef.current.length < maxParticles; i++) {
            const angle = Math.random() * TWO_PI;
            const speedMultiplier = (fft[0] / 255) * 4 + 1;
            particlesRef.current.push({
              x: centerX,
              y: centerY,
              vx: Math.cos(angle) * (Math.random() * 2 + 1) * speedMultiplier,
              vy: Math.sin(angle) * (Math.random() * 2 + 1) * speedMultiplier,
              life: 1.0,
              maxLife: Math.random() * 0.02 + 0.005,
              size: Math.random() * 3 + 1,
              hueOffset: Math.random() * 60 - 30,
            });
          }
        } else {
          // Auto spawn
          for (let i = 0; i < 3 && particlesRef.current.length < maxParticles; i++) {
            const angle = Math.random() * TWO_PI;
            particlesRef.current.push({
              x: centerX + (Math.random() - 0.5) * 50,
              y: centerY + (Math.random() - 0.5) * 50,
              vx: Math.cos(angle) * (Math.random() * 3 + 1),
              vy: Math.sin(angle) * (Math.random() * 3 + 1),
              life: 1.0,
              maxLife: Math.random() * 0.015 + 0.005,
              size: Math.random() * 4 + 1,
              hueOffset: Math.random() * 60 - 30,
            });
          }
        }

        ctx.save();
        
        // Pull particles toward mouse
        const pointerX = centerX + mousePosRef.current.x * width;
        const pointerY = centerY + mousePosRef.current.y * height;
        
        const windX = Math.sin(time) * 0.5;
        const windY = Math.cos(time * 0.8) * 0.5;
        
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          
          p.life -= p.maxLife * controls.speed;
          if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
          
          // Physics update
          p.vx += windX;
          p.vy += windY;
          
          // Mouse attraction
          if (mousePosRef.current.isHovering) {
            const dx = pointerX - p.x;
            const dy = pointerY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 300) {
              p.vx += (dx / dist) * 0.5;
              p.vy += (dy / dist) * 0.5;
            }
          }
          
          // Apply friction
          p.vx *= 0.98;
          p.vy *= 0.98;
          
          p.x += p.vx * controls.speed;
          p.y += p.vy * controls.speed;
          
          // Draw
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
          const h = (primaryHue + p.hueOffset + (1 - p.life) * 100) % 360;
          ctx.fillStyle = `hsla(${h}, 100%, 70%, ${p.life * controls.bloomIntensity})`;
          
          if (controls.bloomIntensity > 1.0) {
            ctx.shadowColor = `hsla(${h}, 100%, 50%, ${p.life})`;
            ctx.shadowBlur = p.size * 3 * controls.bloomIntensity;
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Optional wireframe lines connecting close particles
          if (controls.wireframeOnly && i % 3 === 0 && i > 0) {
            const prev = particlesRef.current[i - 1];
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            if (dx * dx + dy * dy < 4000) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(prev.x, prev.y);
              ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${p.life * 0.5})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
        
        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 6: LIQUID AURORA
      // -----------------------------------------------------------------
      else if (canvasMode === 'liquid_aurora') {
        const bands = Math.max(3, Math.floor(controls.geometryDensity));
        ctx.save();
        
        // Use a slight mouse displacement
        const pointerX = mousePosRef.current.isHovering ? (centerX + mousePosRef.current.x * width) : -1000;
        const pointerY = mousePosRef.current.isHovering ? (centerY + mousePosRef.current.y * height) : -1000;

        for (let i = 0; i < bands; i++) {
          ctx.beginPath();
          // Distribute bands vertically
          const yBase = height * 0.2 + (height * 0.6 * (i / bands));
          
          for (let x = 0; x <= width; x += 20) {
            // Complex multi-sine wave interference
            const wave1 = Math.sin(x * 0.002 + time * controls.speed + i) * 50 * audioFactor;
            const wave2 = Math.cos(x * 0.005 - time * (controls.speed * 0.5) + i * 2) * 30 * audioFactor;
            const wave3 = Math.sin(x * 0.001 + time * controls.speed * 1.5) * 80;
            
            // Mouse gravity well distortion
            let dx = x - pointerX;
            let mousePullY = 0;
            if (mousePosRef.current.isHovering) {
               mousePullY = Math.exp(-(dx * dx) / 30000) * (mousePosRef.current.y * 200 * controls.distortionRate);
            }

            const y = yBase + wave1 + wave2 + wave3 + mousePullY;
            
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          
          const h = (primaryHue + i * 20 + time * 15) % 360;
          ctx.strokeStyle = `hsla(${h}, 100%, 65%, ${0.7 * controls.bloomIntensity})`;
          ctx.lineWidth = (bands - i + 2) * controls.bloomIntensity;
          
          if (controls.bloomIntensity > 0.5) {
            ctx.shadowColor = `hsla(${h}, 100%, 50%, 0.8)`;
            ctx.shadowBlur = 25 * controls.bloomIntensity;
          }
          
          ctx.stroke();
          
          // Fill underneath for aurora veil effect
          if (!controls.wireframeOnly) {
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();
            
            const grad = ctx.createLinearGradient(0, yBase - 150, 0, height);
            grad.addColorStop(0, `hsla(${h}, 100%, 60%, ${0.15 * controls.bloomIntensity})`);
            grad.addColorStop(1, `hsla(${h}, 100%, 10%, 0)`);
            ctx.fillStyle = grad;
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 7: QUANTUM FIELD
      // -----------------------------------------------------------------
      else if (canvasMode === 'quantum_field') {
        const density = Math.max(10, Math.floor(controls.geometryDensity * 4));
        const stepX = width / density;
        const stepY = height / density;
        
        ctx.save();
        const chaos = controls.distortionRate;
        const t = time * controls.speed * 0.5;
        
        const pointerX = centerX + mousePosRef.current.x * width;
        const pointerY = centerY + mousePosRef.current.y * height;
        
        for (let x = 0; x <= width; x += stepX) {
          for (let y = 0; y <= height; y += stepY) {
            // Calculate vector field angle using Perlin-like trig functions
            const noiseAngle = Math.sin(x * 0.005 + t) * Math.cos(y * 0.005 - t) * TWO_PI * chaos;
            
            // Mouse warp influence
            let dx = x - pointerX;
            let dy = y - pointerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            let mouseAngle = 0;
            let influence = 0;
            if (dist < 400 && mousePosRef.current.isHovering) {
               mouseAngle = Math.atan2(dy, dx) + TWO_PI * 0.25; // swirling perpendicular to center
               influence = (1 - dist / 400);
            }
            
            const finalAngle = noiseAngle * (1 - influence) + mouseAngle * influence;
            const length = stepX * 1.5 * audioFactor * (0.5 + 0.5 * Math.sin(x * 0.01 + y * 0.01 + t * 2));
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            const endX = x + Math.cos(finalAngle) * length;
            const endY = y + Math.sin(finalAngle) * length;
            ctx.lineTo(endX, endY);
            
            const h = (primaryHue + (x / width) * 60 + (y / height) * 60 + t * 20) % 360;
            ctx.strokeStyle = `hsla(${h}, 100%, 65%, ${0.5 * controls.bloomIntensity})`;
            ctx.lineWidth = 1.5;
            
            if (!controls.wireframeOnly && controls.bloomIntensity > 0.8) {
               ctx.shadowColor = `hsla(${h}, 100%, 50%, 0.6)`;
               ctx.shadowBlur = 8 * controls.bloomIntensity;
            }
            
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Draw energy head point
            if (!controls.wireframeOnly) {
               ctx.beginPath();
               ctx.arc(endX, endY, 1.5 * controls.bloomIntensity, 0, TWO_PI);
               ctx.fillStyle = `hsla(${h}, 100%, 80%, 0.9)`;
               ctx.fill();
            }
          }
        }
        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 8: ICE CRYSTAL (Fractal Dendritic Snowflake & Prism Lattice)
      // -----------------------------------------------------------------
      else if (canvasMode === 'ice_crystal') {
        ctx.save();
        ctx.translate(centerX, centerY);

        const arms = Math.max(6, Math.floor(controls.geometryDensity) * 2); // 6, 8, 10, 12-fold symmetry
        const baseRadius = Math.min(width, height) * 0.38;
        const bpmTempo = (controls.bpm || 120) / 60;
        const beatPulse = Math.pow(Math.sin((time * bpmTempo * Math.PI)), 4) * 0.3;
        const crystalScale = (1.0 + (audioFactor - 1.0) * 0.5 + beatPulse);
        const rotationAngle = time * controls.speed * 0.15 + mousePosRef.current.x * 0.5;

        ctx.rotate(rotationAngle);

        // Interactive mouse frost seed influence
        const mouseDistFromCenter = Math.sqrt(
          mousePosRef.current.x * mousePosRef.current.x + mousePosRef.current.y * mousePosRef.current.y
        );

        for (let a = 0; a < arms; a++) {
          const armAngle = (a * TWO_PI) / arms;
          ctx.save();
          ctx.rotate(armAngle);

          // Draw main dendritic spine
          const armLength = baseRadius * crystalScale;
          const armHue = (primaryHue + (a / arms) * 40 + time * 10) % 360;

          ctx.strokeStyle = `hsla(${armHue}, 90%, 75%, ${0.85 * controls.bloomIntensity})`;
          ctx.lineWidth = controls.wireframeOnly ? 1 : 2.5 * controls.bloomIntensity;
          if (!controls.wireframeOnly && controls.bloomIntensity > 1.0) {
            ctx.shadowColor = `hsla(${armHue}, 100%, 70%, 0.8)`;
            ctx.shadowBlur = 12 * controls.bloomIntensity;
          }

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(armLength, 0);
          ctx.stroke();

          // Draw secondary & tertiary crystal branches
          const branches = 6;
          for (let b = 1; b <= branches; b++) {
            const bx = (armLength * b) / (branches + 1);
            const branchLen = (baseRadius * 0.32) * (1 - (b / (branches + 1)) * 0.6) * (1 + controls.distortionRate * 0.5);

            // 60-degree hexagonal branching
            const branchAngles = [Math.PI / 3, -Math.PI / 3];
            for (const bAngle of branchAngles) {
              const ex = bx + Math.cos(bAngle) * branchLen;
              const ey = Math.sin(bAngle) * branchLen;

              ctx.beginPath();
              ctx.moveTo(bx, 0);
              ctx.lineTo(ex, ey);
              ctx.stroke();

              // Sub-branch (tertiary crystal needle)
              const subLen = branchLen * 0.45;
              const sex = ex + Math.cos(bAngle - Math.PI / 3) * subLen;
              const sey = ey + Math.sin(bAngle - Math.PI / 3) * subLen;

              ctx.beginPath();
              ctx.moveTo(ex, ey);
              ctx.lineTo(sex, sey);
              ctx.stroke();

              // Diamond crystal tips / faceted plate
              if (!controls.wireframeOnly) {
                ctx.beginPath();
                ctx.arc(ex, ey, 2.5 * controls.bloomIntensity, 0, TWO_PI);
                ctx.fillStyle = `hsla(${(armHue + 30) % 360}, 100%, 90%, 0.9)`;
                ctx.fill();

                // Prismatic refraction facet fill
                if (b % 2 === 0) {
                  ctx.beginPath();
                  ctx.moveTo(bx, 0);
                  ctx.lineTo(ex, ey);
                  ctx.lineTo(bx + branchLen * 0.5, 0);
                  ctx.closePath();
                  ctx.fillStyle = `hsla(${armHue}, 90%, 80%, ${0.08 * controls.bloomIntensity})`;
                  ctx.fill();
                }
              }
            }
          }

          // Center faceted crystal hexagon core
          ctx.beginPath();
          const coreR = 25 * crystalScale;
          for (let c = 0; c < 6; c++) {
            const ca = (c * TWO_PI) / 6;
            const cx = Math.cos(ca) * coreR;
            const cy = Math.sin(ca) * coreR;
            if (c === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          }
          ctx.closePath();
          ctx.strokeStyle = `hsla(${primaryHue}, 100%, 85%, 0.9)`;
          ctx.stroke();
          if (!controls.wireframeOnly) {
            ctx.fillStyle = `hsla(${(primaryHue + 40) % 360}, 100%, 75%, 0.12)`;
            ctx.fill();
          }

          ctx.restore();
        }

        // Floating Diamond Frost Glitters
        if (!controls.wireframeOnly) {
          const glitterCount = 24;
          for (let g = 0; g < glitterCount; g++) {
            const gAngle = (g * TWO_PI) / glitterCount + time * 0.2;
            const gDist = baseRadius * (0.3 + 0.7 * Math.abs(Math.sin(time * 0.5 + g * 1.5)));
            const gx = Math.cos(gAngle) * gDist;
            const gy = Math.sin(gAngle) * gDist;
            const gSize = (1.5 + Math.sin(time * 4 + g * 2) * 1.0) * controls.bloomIntensity;
            const gHue = (primaryHue + g * 15) % 360;

            ctx.beginPath();
            ctx.arc(gx, gy, Math.max(0.5, gSize), 0, TWO_PI);
            ctx.fillStyle = `hsla(${gHue}, 100%, 95%, 0.95)`;
            ctx.shadowColor = `hsla(${gHue}, 100%, 80%, 1)`;
            ctx.shadowBlur = 10 * controls.bloomIntensity;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 9: FIRE & SMOKE (Convective Thermal Flame Column & Embers)
      // -----------------------------------------------------------------
      else if (canvasMode === 'fire_smoke') {
        ctx.save();

        const baseBottomY = height * 0.92;
        const flameWidth = width * 0.45;
        const columns = Math.max(12, Math.floor(controls.geometryDensity * 3));
        const flameHeight = height * 0.75 * audioFactor;
        const pointerX = centerX + mousePosRef.current.x * width;
        const mouseSway = mousePosRef.current.x * 120 * controls.distortionRate;

        // Draw multiple convective layers of turbulent flame
        const flameLayers = [
          { speedMod: 1.0, widthMod: 1.0, alpha: 0.25, hueShift: 0, blur: 25 }, // Outer smoke / dark orange
          { speedMod: 1.3, widthMod: 0.75, alpha: 0.45, hueShift: 15, blur: 18 }, // Mid flame tongue
          { speedMod: 1.8, widthMod: 0.5, alpha: 0.75, hueShift: 35, blur: 12 }, // Inner fire
          { speedMod: 2.2, widthMod: 0.25, alpha: 0.95, hueShift: 55, blur: 8 },  // White-hot core
        ];

        for (let l = 0; l < flameLayers.length; l++) {
          const layer = flameLayers[l];
          const t = time * controls.speed * layer.speedMod;
          const currentHue = (primaryHue + layer.hueShift) % 360;

          ctx.beginPath();
          ctx.moveTo(centerX - (flameWidth * layer.widthMod) / 2, baseBottomY);

          // Left side rising turbulent curl
          for (let y = baseBottomY; y >= baseBottomY - flameHeight; y -= 15) {
            const progress = (baseBottomY - y) / flameHeight; // 0 at bottom, 1 at tip
            const taper = Math.pow(1 - progress, 0.7);
            const turb1 = Math.sin(y * 0.02 - t * 3 + l) * 25 * (1 + controls.distortionRate);
            const turb2 = Math.cos(y * 0.05 + t * 4) * 12;
            const wind = mouseSway * progress;
            const x = centerX - (flameWidth * layer.widthMod * taper) / 2 + turb1 + turb2 + wind;
            ctx.lineTo(x, y);
          }

          // Tip of the flame
          const tipTurb = Math.sin(t * 5 + l) * 20;
          ctx.lineTo(centerX + mouseSway + tipTurb, baseBottomY - flameHeight * (1 - l * 0.12));

          // Right side falling edge
          for (let y = baseBottomY - flameHeight; y <= baseBottomY; y += 15) {
            const progress = (baseBottomY - y) / flameHeight;
            const taper = Math.pow(1 - progress, 0.7);
            const turb1 = Math.cos(y * 0.02 - t * 3.5 + l * 2) * 25 * (1 + controls.distortionRate);
            const turb2 = Math.sin(y * 0.045 + t * 3.2) * 12;
            const wind = mouseSway * progress;
            const x = centerX + (flameWidth * layer.widthMod * taper) / 2 + turb1 + turb2 + wind;
            ctx.lineTo(x, y);
          }

          ctx.closePath();

          if (controls.wireframeOnly) {
            ctx.strokeStyle = `hsla(${currentHue}, 100%, 65%, ${layer.alpha * controls.bloomIntensity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            const grad = ctx.createLinearGradient(centerX, baseBottomY, centerX, baseBottomY - flameHeight);
            grad.addColorStop(0, `hsla(${currentHue}, 100%, 75%, ${layer.alpha * controls.bloomIntensity})`);
            grad.addColorStop(0.5, `hsla(${currentHue}, 100%, 55%, ${layer.alpha * 0.8 * controls.bloomIntensity})`);
            grad.addColorStop(1, `hsla(${(currentHue - 20 + 360) % 360}, 100%, 30%, 0)`);

            ctx.fillStyle = grad;
            if (controls.bloomIntensity > 0.8) {
              ctx.shadowColor = `hsla(${currentHue}, 100%, 50%, 0.7)`;
              ctx.shadowBlur = layer.blur * controls.bloomIntensity;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Rising Smoke & Ember Particles
        const emberCount = Math.floor(controls.geometryDensity * 12);
        for (let e = 0; e < emberCount; e++) {
          const eSeed = e * 137.5;
          const eProgress = ((time * (controls.speed * 0.4) + e * 0.08) % 1.0);
          const ey = baseBottomY - eProgress * flameHeight * 1.3;
          const exTaper = Math.sin(eProgress * Math.PI) * (flameWidth * 0.4);
          const eSway = Math.sin(ey * 0.015 + time * 3 + e) * 35 + mouseSway * eProgress;
          const ex = centerX + Math.sin(eSeed) * exTaper + eSway;
          const eSize = (1 - eProgress) * 3.5 * controls.bloomIntensity;
          const eHue = (primaryHue + 40 - eProgress * 50 + 360) % 360;

          ctx.beginPath();
          ctx.arc(ex, ey, Math.max(0.5, eSize), 0, TWO_PI);
          ctx.fillStyle = `hsla(${eHue}, 100%, 80%, ${(1 - eProgress) * controls.bloomIntensity})`;
          if (!controls.wireframeOnly && controls.bloomIntensity > 1.0) {
            ctx.shadowColor = `hsla(${eHue}, 100%, 50%, 0.9)`;
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      }

      // -----------------------------------------------------------------
      // MODE 10: BOILING FLUID (Thermal Cavitation, Meniscus & Bubbles)
      // -----------------------------------------------------------------
      else if (canvasMode === 'boiling_fluid') {
        ctx.save();

        const liquidSurfaceY = height * 0.35;
        const liquidFloorY = height;
        const fluidColumns = Math.max(20, Math.floor(controls.geometryDensity * 8));
        const bpmTempo = (controls.bpm || 120) / 60;
        const heatWave = Math.sin(time * bpmTempo * TWO_PI) * 15 * audioFactor;

        // 1. Draw Liquid Body with Convective Rayleigh-Bénard Roll Gradient
        const fluidGrad = ctx.createLinearGradient(0, liquidSurfaceY, 0, liquidFloorY);
        fluidGrad.addColorStop(0, `hsla(${primaryHue}, 85%, 35%, 0.3)`);
        fluidGrad.addColorStop(0.7, `hsla(${(primaryHue + 25) % 360}, 95%, 45%, 0.6)`);
        fluidGrad.addColorStop(1, `hsla(${(primaryHue + 50) % 360}, 100%, 60%, 0.9)`); // Luminous boiling floor

        ctx.beginPath();
        ctx.moveTo(0, liquidFloorY);

        // Turbulent Boiling Surface Meniscus
        for (let x = 0; x <= width; x += 10) {
          const wave1 = Math.sin(x * 0.02 + time * (controls.speed * 3)) * 12 * audioFactor;
          const wave2 = Math.cos(x * 0.04 - time * (controls.speed * 2)) * 6;
          const mouseDist = Math.abs(x - (centerX + mousePosRef.current.x * width));
          const mouseDisplace = Math.exp(-(mouseDist * mouseDist) / 8000) * 30 * controls.distortionRate;
          const y = liquidSurfaceY + wave1 + wave2 + mouseDisplace + heatWave * 0.3;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, liquidFloorY);
        ctx.closePath();

        if (!controls.wireframeOnly) {
          ctx.fillStyle = fluidGrad;
          ctx.fill();
        }

        // Draw Meniscus Surface Line
        ctx.strokeStyle = `hsla(${primaryHue}, 100%, 75%, ${0.9 * controls.bloomIntensity})`;
        ctx.lineWidth = controls.wireframeOnly ? 1 : 3 * controls.bloomIntensity;
        if (!controls.wireframeOnly && controls.bloomIntensity > 0.8) {
          ctx.shadowColor = `hsla(${primaryHue}, 100%, 60%, 0.8)`;
          ctx.shadowBlur = 15 * controls.bloomIntensity;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 2. Rising & Cavitating Boiling Bubbles
        const bubbleCount = Math.floor(controls.geometryDensity * 16);
        for (let b = 0; b < bubbleCount; b++) {
          const bSeed = b * 93.7;
          const bSpeed = 0.2 + (b % 5) * 0.15;
          const bProgress = (time * (controls.speed * bSpeed) + b * 0.06) % 1.0;
          const by = liquidFloorY - bProgress * (liquidFloorY - liquidSurfaceY);
          
          // Horizontal buoyancy wobble & thermal eddy currents
          const bxWobble = Math.sin(by * 0.03 + time * 4 + b) * 20 * (1 + controls.distortionRate);
          const bxBase = ((bSeed * 17) % width);
          const bx = bxBase + bxWobble;

          // Bubble grows larger as it rises due to decreasing hydrostatic pressure
          const bRadius = (3 + bProgress * 14 + (b % 4) * 2) * controls.bloomIntensity * (0.8 + (audioFactor - 1.0));
          const bHue = (primaryHue + (1 - bProgress) * 40) % 360;

          ctx.beginPath();
          // Slightly oblong wobble shape under surface tension
          const stretch = 1.0 + Math.sin(time * 8 + b) * 0.2;
          ctx.ellipse(bx, by, bRadius, bRadius * (2 - stretch), 0, 0, TWO_PI);

          if (controls.wireframeOnly) {
            ctx.strokeStyle = `hsla(${bHue}, 100%, 75%, 0.8)`;
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // Shiny liquid bubble gradient
            const bGrad = ctx.createRadialGradient(
              bx - bRadius * 0.3,
              by - bRadius * 0.3,
              bRadius * 0.1,
              bx,
              by,
              bRadius
            );
            bGrad.addColorStop(0, `hsla(0, 0%, 100%, 0.95)`);
            bGrad.addColorStop(0.4, `hsla(${bHue}, 100%, 80%, 0.6)`);
            bGrad.addColorStop(1, `hsla(${bHue}, 100%, 50%, 0.1)`);

            ctx.fillStyle = bGrad;
            ctx.fill();

            ctx.strokeStyle = `hsla(${bHue}, 100%, 85%, 0.75)`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Bubble burst splash when reaching surface
          if (bProgress > 0.92 && !controls.wireframeOnly) {
            const burstProgress = (bProgress - 0.92) / 0.08;
            ctx.beginPath();
            ctx.arc(bx, liquidSurfaceY, bRadius * (1 + burstProgress * 2.5), 0, TWO_PI);
            ctx.strokeStyle = `hsla(${bHue}, 100%, 90%, ${(1 - burstProgress) * 0.8})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      // -----------------------------------------------------------------
      // OVERLAY LAYER: CODE & UI WIREFRAME MATRIX
      // -----------------------------------------------------------------
      if (controls.overlayVisible) {
        ctx.save();
        const opacity = controls.overlayOpacity / 100;

        // Center Reticle
        ctx.strokeStyle = `hsla(${primaryHue}, 100%, 65%, ${0.6 * opacity})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, TWO_PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, TWO_PI);
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - 80, centerY);
        ctx.lineTo(centerX - 40, centerY);
        ctx.moveTo(centerX + 40, centerY);
        ctx.lineTo(centerX + 80, centerY);
        ctx.moveTo(centerX, centerY - 80);
        ctx.lineTo(centerX, centerY - 40);
        ctx.moveTo(centerX, centerY + 40);
        ctx.lineTo(centerX, centerY + 80);
        ctx.stroke();

        // Matrix Stream Text (Corner) - Optimized
        ctx.font = '10px "JetBrains Mono", monospace, sans-serif';
        ctx.fillStyle = `hsla(${primaryHue}, 100%, 70%, ${0.7 * opacity})`;

        let hexStr = '';
        for (let i = 0; i < 5; i++) {
          hexStr += Math.floor(Math.abs(Math.sin(time + i)) * 0xffffff)
            .toString(16)
            .toUpperCase()
            .padStart(6, '0') + ' ';
        }

        ctx.fillText(`SYS.RESONANCE // ${hexStr}`, 20, 30);
        ctx.fillText(`EPISODE: ${episodeCode} [${episodeTitle.toUpperCase()}]`, 20, 48);
        if (activeAssetTitle) {
          ctx.fillText(`ACTIVE ASSET: ${activeAssetTitle.toUpperCase()}`, 20, 66);
        }

        ctx.restore();
      }

      // Telemetry calculation
      fpsCounterRef.current.frames++;
      const now = performance.now();
      if (now - fpsCounterRef.current.lastTime >= 500) {
        const computedFps = Math.round((fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastTime));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;

        setTelemetry({
          fps: Math.min(60, computedFps),
          frameTimeMs: Number((1000 / Math.max(1, computedFps)).toFixed(1)),
          activeParticles: Math.round(controls.geometryDensity * 45 + controls.speed * 80),
          audioPeakDb: audioEngine.getAudioPeakDb(),
          syncStatus: 'D9-SYNC 100%',
        });
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [canvasMode, controls, episodeCode, episodeTitle, activeAssetTitle, isRecording4K]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full aspect-video min-h-[380px] max-h-[640px] rounded-xl overflow-hidden bg-[#070709] border border-white/10 shadow-[0_0_50px_rgba(0,240,255,0.15)] group transition-all"
    >
      {/* Live Canvas */}
      <canvas ref={canvasRef} id="engine-canvas" className="w-full h-full block" />

      {/* Top Floating Viewport HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
          <span className="text-cyan-300 font-bold tracking-wider">{episodeCode}</span>
          <span className="text-white/40">|</span>
          <span className="text-white/80 uppercase tracking-wider">{canvasMode.replace('_', ' ')}</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {controls.audioReactive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">AUDIO REACTIVE</span>
            </div>
          )}

          {onToggleRecording && (
            <button
              onClick={onToggleRecording}
              title={isRecording4K ? "Stop 4K Recording" : "Start 4K Recording"}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                isRecording4K
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-black/60 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              {isRecording4K && <span className="text-[10px] font-bold pr-1">REC</span>}
            </button>
          )}

          {onHyperRandomize && (
            <button
              onClick={onHyperRandomize}
              title="Hyper Randomizer"
              className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 border border-white/10 text-[#00F0FF]/70 hover:text-[#00F0FF] hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={takeScreenshot}
            title="Take Screenshot"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 text-[11px] font-mono">
        <div className="flex items-center gap-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white/70">
          <div className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>FPS:</span>
            <span className="text-cyan-300 font-bold">{telemetry.fps}</span>
          </div>
          <span className="text-white/20">|</span>
          <div>
            <span>TIME:</span> <span className="text-white/90">{telemetry.frameTimeMs}ms</span>
          </div>
          <span className="text-white/20">|</span>
          <div>
            <span>NODES:</span> <span className="text-white/90">{telemetry.activeParticles}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-cyan-500/30 text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_8px_#00F0FF]" />
            <span className="font-bold">{controls.bpm || 120} BPM</span>
            <span className="text-[9px] text-white/50">SYNC</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-white/70">
            <Radio className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
            <span>PEAK DB:</span>
            <span className="text-pink-300 font-bold">{telemetry.audioPeakDb} dB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
