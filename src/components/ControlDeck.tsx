import React, { useState, useRef, useEffect } from 'react';
import { CanvasMode, ModularControls, StemTrack } from '../types';
import {
  Sliders,
  Eye,
  Volume2,
  VolumeX,
  Sparkles,
  Activity,
  Layers,
  Disc,
  RotateCw,
  Sun,
  Radio,
  Video,
  Waves,
  Wind,
  Snowflake,
  Flame,
  Droplets,
  Timer,
  Clock,
} from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface ControlDeckProps {
  canvasMode: CanvasMode;
  controls: ModularControls;
  stems: StemTrack[];
  learningTarget: { type: 'control' | 'stem_volume'; id: string } | null;
  onSetLearningTarget: (target: { type: 'control' | 'stem_volume'; id: string } | null) => void;
  onCanvasModeChange: (mode: CanvasMode) => void;
  onControlsChange: (updated: Partial<ModularControls>) => void;
  onStemChange: (stemId: string, updated: Partial<StemTrack>) => void;
  onResetControls: () => void;
  isRecording4K: boolean;
  onToggleRecording: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  canvasMode,
  controls,
  stems,
  learningTarget,
  onSetLearningTarget,
  onCanvasModeChange,
  onControlsChange,
  onStemChange,
  onResetControls,
  isRecording4K,
  onToggleRecording,
}) => {
  const tapTimesRef = useRef<number[]>([]);
  const [tapFlash, setTapFlash] = useState(false);
  const [beatPulse, setBeatPulse] = useState(false);

  // Sync BPM changes with the Web Audio synthesizer engine
  useEffect(() => {
    if (controls.bpm) {
      audioEngine.setBpm(controls.bpm);
    }
  }, [controls.bpm]);

  // Metronome visual pulse driven by current master BPM
  useEffect(() => {
    const bpm = controls.bpm || 120;
    const intervalMs = (60 / bpm) * 1000;
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 90);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [controls.bpm]);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 150);

    const history = tapTimesRef.current;
    if (history.length > 0 && now - history[history.length - 1] > 2500) {
      tapTimesRef.current = [now];
      return;
    }

    history.push(now);
    if (history.length > 8) {
      history.shift();
    }

    if (history.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < history.length; i++) {
        intervals.push(history[i] - history[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clampedBpm = Math.max(40, Math.min(240, calculatedBpm));
      onControlsChange({ bpm: clampedBpm });
    }
  };

  const handleColorPreset = (presetKey: string, hueVal: number) => {
    onControlsChange({ hue: hueVal, colorPreset: presetKey });
  };

  const handleRandomizeControls = () => {
    onControlsChange({
      hue: Math.floor(Math.random() * 361),
      speed: Number((Math.random() * 4.9 + 0.1).toFixed(1)),
      geometryDensity: Math.floor(Math.random() * 10) + 3, // 3 to 12
      bloomIntensity: Number((Math.random() * 2.5 + 0.5).toFixed(1)), // 0.5 to 3.0
      distortionRate: Number(Math.random().toFixed(2)), // 0.0 to 1.0
      overlayOpacity: Math.floor(Math.random() * 101), // 0 to 100
      wireframeOnly: Math.random() > 0.8, // 20% chance to be true
      overlayVisible: Math.random() > 0.5,
      audioReactive: Math.random() > 0.3, // 70% chance to be true
      bpm: Math.floor(Math.random() * 90) + 80, // 80 - 170 BPM
    });
  };

  const toggleLearn = (type: 'control' | 'stem_volume', id: string) => {
    if (learningTarget?.type === type && learningTarget?.id === id) {
      onSetLearningTarget(null);
    } else {
      onSetLearningTarget({ type, id });
    }
  };

  const renderLearnButton = (type: 'control' | 'stem_volume', id: string) => {
    const isLearning = learningTarget?.type === type && learningTarget?.id === id;
    return (
      <button
        onClick={() => toggleLearn(type, id)}
        title="MIDI Learn"
        className={`ml-2 p-1 rounded-full transition-all ${
          isLearning
            ? 'bg-orange-500/20 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse'
            : 'text-white/30 hover:text-white/80 hover:bg-white/10'
        }`}
      >
        <Radio className="w-3 h-3" />
      </button>
    );
  };

  const canvasModesList = [
    { id: 'plasma', label: 'Plasma Tendrils', icon: Sparkles },
    { id: 'liquid_aurora', label: 'Liquid Aurora', icon: Waves },
    { id: 'quantum_field', label: 'Quantum Field', icon: Wind },
    { id: 'ice_crystal', label: 'Ice Crystal', icon: Snowflake },
    { id: 'fire_smoke', label: 'Fire & Smoke', icon: Flame },
    { id: 'boiling_fluid', label: 'Boiling Fluid', icon: Droplets },
    { id: 'particle_swarm', label: 'Particle Swarm', icon: Activity },
    { id: 'tunnel', label: '3D Tunnel', icon: RotateCw },
    { id: 'generative_geometry', label: 'Lotus Geometry', icon: Disc },
    { id: 'video', label: 'Video Stream', icon: Layers },
  ];

  return (
    <div className="w-full rounded-2xl bg-[#111218]/90 backdrop-blur-xl border border-white/10 p-5 shadow-2xl flex flex-col gap-6">
      {/* Top Header & Canvas Mode Switcher */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#00F0FF]" />
            <h2 className="text-sm font-mono font-bold text-white tracking-wider uppercase">
              Interactive Control Deck
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
              D9 ENGINE
            </span>
            <button
              onClick={onToggleRecording}
              className={`ml-2 px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 ${
                isRecording4K
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              <Video className="w-3 h-3" />
              {isRecording4K ? 'STOP 4K REC' : 'REC 4K (1 MIN)'}
            </button>
          </div>

          {/* Master BPM & Tap Tempo Quick Header Widget */}
          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all duration-75 ${
                  beatPulse
                    ? 'bg-[#00F0FF] shadow-[0_0_12px_#00F0FF] scale-125'
                    : 'bg-cyan-900/80 scale-95'
                }`}
              />
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {controls.bpm || 120} <span className="text-[10px] text-white/60 font-normal">BPM</span>
              </span>
            </div>

            <button
              onClick={handleTapTempo}
              title="Tap in rhythm to set Master BPM tempo"
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase transition-all flex items-center gap-1 border ${
                tapFlash
                  ? 'bg-[#00F0FF] text-black border-[#00F0FF] shadow-[0_0_12px_#00F0FF] scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
              }`}
            >
              <Timer className="w-3 h-3" />
              <span>TAP</span>
            </button>
          </div>
        </div>

        {/* Canvas Mode Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 bg-black/50 p-1.5 rounded-xl border border-white/10">
          {canvasModesList.map((mode) => {
            const Icon = mode.icon;
            const isActive = canvasMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onCanvasModeChange(mode.id as CanvasMode)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                <span className="truncate">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Visual Geometry & Shader Parameters (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
              <Sun className="w-4 h-4 text-pink-400" /> Visual & Color Dynamics
            </h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRandomizeControls}
                className="text-[11px] font-mono px-2.5 py-1 rounded bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 transition-colors"
              >
                Randomize Visuals
              </button>
              <button
                onClick={onResetControls}
                className="text-[11px] font-mono text-white/40 hover:text-white/80 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-white/60 mr-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyan-400" /> Color Preset:
            </span>
            {[
              { key: 'cyan', label: 'Ocean Cyan', hue: 185, color: '#00F0FF' },
              { key: 'magenta', label: 'Cyber Magenta', hue: 310, color: '#FF007F' },
              { key: 'violet', label: 'Electric Violet', hue: 270, color: '#8A2BE2' },
              { key: 'gold', label: 'Solar Gold', hue: 45, color: '#FFB800' },
              { key: 'ice', label: 'Cryo Ice', hue: 205, color: '#A0E8FF' },
              { key: 'fire', label: 'Inferno', hue: 15, color: '#FF4500' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => handleColorPreset(p.key, p.hue)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  controls.colorPreset === p.key
                    ? 'bg-white/15 text-white border-white/40 shadow-sm'
                    : 'bg-black/30 text-white/60 hover:text-white border-white/5'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
            {/* Color Hue Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  Primary Hue: {renderLearnButton('control', 'hue')}
                </span>
                <span className="text-cyan-300 font-bold">{controls.hue}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={controls.hue}
                onChange={(e) => onControlsChange({ hue: Number(e.target.value), colorPreset: 'custom' })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
            </div>

            {/* Rotation Speed Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  Rotation Speed: {renderLearnButton('control', 'speed')}
                </span>
                <span className="text-pink-300 font-bold">{controls.speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={controls.speed}
                onChange={(e) => onControlsChange({ speed: Number(e.target.value) })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
              />
            </div>

            {/* Geometry Density Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  Symmetry / Density: {renderLearnButton('control', 'geometryDensity')}
                </span>
                <span className="text-purple-300 font-bold">{controls.geometryDensity}</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="1"
                value={controls.geometryDensity}
                onChange={(e) => onControlsChange({ geometryDensity: Number(e.target.value) })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            {/* Bloom / Glow Intensity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  Bloom Intensity: {renderLearnButton('control', 'bloomIntensity')}
                </span>
                <span className="text-cyan-300 font-bold">{controls.bloomIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={controls.bloomIntensity}
                onChange={(e) => onControlsChange({ bloomIntensity: Number(e.target.value) })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Distortion Rate Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  Chaos / Distortion: {renderLearnButton('control', 'distortionRate')}
                </span>
                <span className="text-amber-300 font-bold">{Math.round(controls.distortionRate * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={controls.distortionRate}
                onChange={(e) => onControlsChange({ distortionRate: Number(e.target.value) })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Overlay Opacity Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="flex items-center text-white/70">
                  HUD Overlay Opacity: {renderLearnButton('control', 'overlayOpacity')}
                </span>
                <span className="text-green-300 font-bold">{controls.overlayOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={controls.overlayOpacity}
                onChange={(e) => onControlsChange({ overlayOpacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-400"
              />
            </div>
          </div>

          {/* Toggle Switches Row */}
          <div className="flex items-center gap-4 flex-wrap pt-1">
            <label className="flex items-center gap-2 cursor-pointer bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={controls.wireframeOnly}
                onChange={(e) => onControlsChange({ wireframeOnly: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/80">Wireframe Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={controls.overlayVisible}
                onChange={(e) => onControlsChange({ overlayVisible: e.target.checked })}
                className="w-4 h-4 rounded accent-fuchsia-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/80">HUD Matrix Overlay</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              <input
                type="checkbox"
                checked={controls.audioReactive}
                onChange={(e) => onControlsChange({ audioReactive: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-white/80 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> Audio Spectrum Reactive
              </span>
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN: Master BPM Clock & Modular Stem / Layer Mixer (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Master BPM & Clock Sync Panel */}
          <div className="flex flex-col gap-3 bg-black/60 p-4 rounded-xl border border-cyan-500/20 shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00F0FF]" /> Master BPM & Tempo Clock
              </h3>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-75 ${
                    beatPulse ? 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]' : 'bg-white/20'
                  }`}
                />
                <span className="text-[10px] font-mono text-white/50">SYNC CLOCK</span>
              </div>
            </div>

            {/* Slider and Tap Row */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/70 flex items-center">
                  Master Tempo: {renderLearnButton('control', 'bpm')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="40"
                    max="240"
                    value={controls.bpm || 120}
                    onChange={(e) =>
                      onControlsChange({ bpm: Math.max(40, Math.min(240, Number(e.target.value) || 120)) })
                    }
                    className="w-16 bg-black/80 border border-cyan-500/40 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-right font-mono text-xs focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-cyan-400 font-bold">BPM</span>
                </div>
              </div>

              <input
                type="range"
                min="40"
                max="240"
                step="1"
                value={controls.bpm || 120}
                onChange={(e) => onControlsChange({ bpm: Number(e.target.value) })}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
              />
            </div>

            {/* Quick Nudges & Tap Tempo & Presets */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onControlsChange({ bpm: Math.max(40, (controls.bpm || 120) - 5) })}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/80"
                >
                  -5
                </button>
                <button
                  onClick={() => onControlsChange({ bpm: Math.max(40, (controls.bpm || 120) - 1) })}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/80"
                >
                  -1
                </button>
                <button
                  onClick={() => onControlsChange({ bpm: Math.min(240, (controls.bpm || 120) + 1) })}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/80"
                >
                  +1
                </button>
                <button
                  onClick={() => onControlsChange({ bpm: Math.min(240, (controls.bpm || 120) + 5) })}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/80"
                >
                  +5
                </button>
                <button
                  onClick={() => onControlsChange({ bpm: Math.max(40, Math.round((controls.bpm || 120) / 2)) })}
                  title="Half Tempo (/2)"
                  className="px-1.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/60"
                >
                  /2
                </button>
                <button
                  onClick={() => onControlsChange({ bpm: Math.min(240, Math.round((controls.bpm || 120) * 2)) })}
                  title="Double Tempo (x2)"
                  className="px-1.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[11px] font-mono text-white/60"
                >
                  x2
                </button>
              </div>

              <button
                onClick={handleTapTempo}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 border ${
                  tapFlash
                    ? 'bg-[#00F0FF] text-black border-[#00F0FF] shadow-[0_0_15px_#00F0FF] scale-105'
                    : 'bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 border-cyan-500/40'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>TAP TEMPO</span>
              </button>
            </div>

            {/* Quick Genre Tempo Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5 text-[10px] font-mono text-white/50">
              <span className="text-white/40 mr-1">Presets:</span>
              {[
                { label: '90 (Lo-Fi)', bpm: 90 },
                { label: '110 (Deep)', bpm: 110 },
                { label: '120 (House)', bpm: 120 },
                { label: '128 (Electro)', bpm: 128 },
                { label: '140 (Dubstep)', bpm: 140 },
                { label: '174 (DnB)', bpm: 174 },
              ].map((p) => (
                <button
                  key={p.bpm}
                  onClick={() => onControlsChange({ bpm: p.bpm })}
                  className={`px-1.5 py-0.5 rounded border transition-all ${
                    controls.bpm === p.bpm
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                      : 'bg-black/40 text-white/60 hover:text-white border-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modular Layer & Stem Mixer */}
          <div className="flex flex-col gap-3 bg-black/50 p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-mono font-semibold text-white/80 uppercase tracking-widest flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#00F0FF]" /> Modular Layer & Stem Mixer
              </h3>
              <span className="text-[10px] font-mono text-white/40">4 AUDIO / 3 VISUAL</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {stems.map((stem) => (
                <div
                  key={stem.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    stem.muted
                      ? 'bg-black/20 border-white/5 opacity-50'
                      : stem.solo
                      ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          stem.type === 'audio'
                            ? 'bg-cyan-400'
                            : stem.type === 'lighting'
                            ? 'bg-amber-400'
                            : 'bg-fuchsia-400'
                        }`}
                      />
                      <span className="text-xs font-mono font-semibold text-white/90">
                        {stem.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {stem.category}
                      </span>
                      {renderLearnButton('stem_volume', stem.id)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const muted = audioEngine.toggleStemMute(stem.id);
                          onStemChange(stem.id, { muted });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          stem.muted
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {stem.muted ? <VolumeX className="w-3 h-3" /> : 'MUTE'}
                      </button>
                      <button
                        onClick={() => {
                          const solo = audioEngine.toggleStemSolo(stem.id);
                          onStemChange(stem.id, { solo });
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                          stem.solo
                            ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                            : 'bg-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        SOLO
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={stem.volume}
                      onChange={(e) => {
                        const vol = Number(e.target.value);
                        audioEngine.setStemVolume(stem.id, vol);
                        onStemChange(stem.id, { volume: vol });
                      }}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
                    />
                    <span className="text-xs font-mono text-cyan-300 font-bold w-9 text-right">
                      {stem.volume}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
