import React, { useState } from 'react';
import { ModularAsset } from '../types';
import { Grid, Sparkles, Zap, Filter, ArrowUpRight } from 'lucide-react';

interface AssetGridProps {
  assets: ModularAsset[];
  activeAssetId?: string;
  onSelectAsset: (asset: ModularAsset) => void;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  activeAssetId,
  onSelectAsset,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Plasma', 'Tunnel', 'Geometry', 'Grid', 'Matrix', 'Flare'];

  const filteredAssets =
    selectedCategory === 'ALL'
      ? assets
      : assets.filter((a) => a.category.toUpperCase() === selectedCategory.toUpperCase());

  return (
    <div className="w-full flex flex-col gap-4 rounded-2xl bg-[#111218]/90 backdrop-blur-xl border border-white/10 p-5 shadow-2xl">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Grid className="w-5 h-5 text-[#FF007F]" />
          <div>
            <h2 className="text-sm font-mono font-bold text-white tracking-wider uppercase">
              Dynamic Asset Inspector (Modular Grid)
            </h2>
            <p className="text-xs text-white/50">
              Click any modular visual asset to inject into the central viewport
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/40 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-bold shadow-md'
                  : 'bg-black/40 text-white/60 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => {
          const isActive = asset.id === activeAssetId;

          return (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset)}
              className={`relative group rounded-xl p-4 cursor-pointer transition-all border flex flex-col justify-between overflow-hidden bg-gradient-to-b ${asset.gradientBg} ${
                isActive
                  ? 'border-[#FF007F] shadow-[0_0_25px_rgba(255,0,127,0.35)] ring-1 ring-[#FF007F]/60 scale-[1.02]'
                  : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-2 z-10">
                  <span className="text-xs font-mono font-bold text-pink-300">{asset.code}</span>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-black/60 border border-white/10 text-white/80">
                    {asset.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors mb-1">
                  {asset.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
                  {asset.description}
                </p>
              </div>

              {/* Footer info & Inject Action */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10 mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>{asset.complexity}</span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Zap className="w-3 h-3" /> {asset.fpsTarget} FPS
                  </span>
                </div>

                <button
                  className={`w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-[#FF007F] text-white shadow-[0_0_12px_#FF007F]'
                      : 'bg-white/10 text-white group-hover:bg-white/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isActive ? 'INJECTED PRESET' : 'INJECT TO ENGINE'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
