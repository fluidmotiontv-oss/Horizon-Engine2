import React from 'react';
import { Episode } from '../types';
import { Play, CheckCircle2, Tv } from 'lucide-react';

interface EpisodeSelectorProps {
  episodes: Episode[];
  activeEpisodeId: string;
  onSelectEpisode: (episode: Episode) => void;
}

export const EpisodeSelector: React.FC<EpisodeSelectorProps> = ({
  episodes,
  activeEpisodeId,
  onSelectEpisode,
}) => {
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-[#00F0FF]" />
          <h2 className="text-xs font-mono font-bold text-white tracking-widest uppercase">
            Series & Episode Controller
          </h2>
        </div>
        <span className="text-[11px] font-mono text-white/40">SELECT ENVIRONMENT PRESET</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {episodes.map((ep) => {
          const isActive = ep.id === activeEpisodeId;

          return (
            <div
              key={ep.id}
              onClick={() => onSelectEpisode(ep)}
              className={`relative group rounded-xl p-4 cursor-pointer transition-all border flex flex-col justify-between overflow-hidden bg-gradient-to-b ${ep.thumbnailGradient} ${
                isActive
                  ? 'border-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.3)] ring-1 ring-[#00F0FF]/50 scale-[1.02]'
                  : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
              }`}
            >
              {/* Top Row Header */}
              <div className="flex items-center justify-between mb-2 z-10">
                <span className="text-xs font-mono font-bold text-white/90">{ep.code}</span>
                <span
                  className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-white/20 text-white shadow-sm"
                  style={{ backgroundColor: `${ep.colorAccent}33`, borderColor: ep.colorAccent }}
                >
                  {ep.badgeText}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="z-10 mb-3">
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {ep.title}
                </h3>
                <p className="text-xs text-white/60 line-clamp-1">{ep.subtitle}</p>
              </div>

              {/* Description */}
              <p className="text-[11px] text-white/50 line-clamp-2 mb-4 leading-relaxed z-10">
                {ep.description}
              </p>

              {/* Tags & Action Button */}
              <div className="z-10 flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ep.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/5"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-1 pt-1">
                  <span className="text-[10px] font-mono text-white/40">{ep.duration}</span>

                  <div
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      isActive
                        ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_#00F0FF]'
                        : 'bg-white/10 text-white group-hover:bg-white/20'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>SYNC</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtle background glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                style={{ backgroundColor: ep.colorAccent }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
