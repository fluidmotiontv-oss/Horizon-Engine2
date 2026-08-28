import React, { useEffect, useState } from 'react';
import { Radio, Volume2, VolumeX, Sparkles, Download, Clock } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface HeaderProps {
  onOpenAIPreset: () => void;
  onOpenPresetManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAIPreset,
  onOpenPresetManager,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isAudioStarted, setIsAudioStarted] = useState<boolean>(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAudio = async () => {
    if (!isAudioStarted) {
      const ok = await audioEngine.initAudio();
      if (ok) setIsAudioStarted(true);
    } else {
      const muted = audioEngine.toggleMute();
      setIsAudioMuted(muted);
    }
  };

  return (
    <header className="w-full rounded-2xl bg-[#070709]/80 backdrop-blur-xl border border-white/10 px-5 py-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left: Logo & Sync Badge */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-fuchsia-600 to-purple-800 p-0.5 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
          <div className="w-full h-full bg-[#070709] rounded-[10px] flex items-center justify-center font-bold font-mono text-cyan-400 text-lg">
            H
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-mono font-extrabold text-white tracking-widest uppercase">
              THE HORIZON ENGINE
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold shadow-sm">
              MODULAR CORE
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white/60">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="font-bold tracking-wider">D9 SYNC ONLINE</span>
            </div>
            <span>•</span>
            <span className="text-white/40">STUDIO LAYER v2.4</span>
          </div>
        </div>
      </div>

      {/* Right: Actions & Clock */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Dynamic UTC Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-white/70">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{timeStr}</span>
        </div>

        {/* Audio Mute / Start Toggle */}
        <button
          onClick={handleToggleAudio}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            !isAudioStarted
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              : isAudioMuted
              ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
          }`}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>
            {!isAudioStarted ? 'START AUDIO SYNTH' : isAudioMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE'}
          </span>
        </button>

        {/* AI Preset Generator Button */}
        <button
          onClick={onOpenAIPreset}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_15px_rgba(255,0,127,0.4)] transition-all"
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" />
          <span>AI SYNTH PRESET</span>
        </button>

        {/* Preset Export / Import */}
        <button
          onClick={onOpenPresetManager}
          title="Save & Export Presets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">PRESETS</span>
        </button>
      </div>
    </header>
  );
};
