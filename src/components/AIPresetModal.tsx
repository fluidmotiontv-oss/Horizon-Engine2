import React, { useState } from 'react';
import { Sparkles, X, Loader2, Zap, Check } from 'lucide-react';
import { ModularControls, CanvasMode } from '../types';

interface AIPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (
    presetName: string,
    canvasMode: CanvasMode,
    controls: Partial<ModularControls>
  ) => void;
}

export const AIPresetModal: React.FC<AIPresetModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPreset, setGeneratedPreset] = useState<any | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    'Cryo glacial fractal ice crystal snowflake with cyan prismatic glow and 120 BPM tempo',
    'Inferno convective fire plume with turbulent ember sparks and 140 BPM sub-bass resonance',
    'Thermal cavitation boiling fluid with rising buoyant bubbles and 110 BPM rhythm',
    'Quantum vector field and FFT-reactive particle swarm in magenta cyber glow',
    'Cyberpunk storm with hyper-speed violet wireframe tunnel and sub-bass pulse',
    'Zen sacred lotus geometry in cyan ocean glow with slow harmonic resonance',
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedPreset(null);

    try {
      const res = await fetch('/api/generate-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: activePrompt }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate preset from Gemini AI.');
      }

      setGeneratedPreset(data.preset);
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI generation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!generatedPreset) return;

    onApplyPreset(
      generatedPreset.presetName,
      generatedPreset.canvasMode as CanvasMode,
      {
        hue: generatedPreset.hue,
        speed: generatedPreset.speed,
        geometryDensity: generatedPreset.geometryDensity,
        overlayVisible: generatedPreset.overlayVisible,
        bloomIntensity: generatedPreset.bloomIntensity,
        distortionRate: generatedPreset.distortionRate,
        bpm: generatedPreset.bpm || 120,
      }
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#111218] border border-white/10 p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-white tracking-wider">
                AI SHADER & STEM SYNTHESIZER
              </h2>
              <p className="text-xs text-white/50">
                Powered by Gemini AI — generate custom canvas & audio parameters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input & Suggestions */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-mono text-white/70">
            Describe your desired visual atmosphere or mood:
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Electric cyan plasma tendrils pulsating with high speed chaos and neon glow..."
            rows={3}
            className="w-full rounded-xl bg-black/60 border border-white/10 p-3 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
          />

          {/* Quick Prompt Pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono text-white/40">Quick Ideas:</span>
            <div className="flex flex-col gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p);
                    handleGenerate(p);
                  }}
                  className="text-left text-[11px] font-mono p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white transition-all flex items-center justify-between"
                >
                  <span className="line-clamp-1">{p}</span>
                  <Zap className="w-3 h-3 text-cyan-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleGenerate()}
          disabled={isLoading || !prompt.trim()}
          className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-pink-600 text-white shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SYNTHESIZING PARAMETERS VIA GEMINI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>GENERATE CUSTOM AI PRESET</span>
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {/* Output Preview */}
        {generatedPreset && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                {generatedPreset.presetName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-400/30">
                MODE: {generatedPreset.canvasMode}
              </span>
            </div>

            <p className="text-xs text-white/80 italic">"{generatedPreset.description}"</p>

            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-black/50 p-2 rounded-lg border border-white/5">
              <div>Hue: {generatedPreset.hue}°</div>
              <div>Speed: {generatedPreset.speed}x</div>
              <div>Density: {generatedPreset.geometryDensity}</div>
              <div>Bloom: {generatedPreset.bloomIntensity}x</div>
              <div>Chaos: {Math.round(generatedPreset.distortionRate * 100)}%</div>
              <div>HUD: {generatedPreset.overlayVisible ? 'Active' : 'Off'}</div>
            </div>

            <button
              onClick={handleApply}
              className="w-full py-2 rounded-lg text-xs font-mono font-bold bg-[#00F0FF] text-black hover:bg-cyan-300 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_#00F0FF]"
            >
              <Check className="w-4 h-4" />
              <span>APPLY THIS PRESET TO ENGINE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
