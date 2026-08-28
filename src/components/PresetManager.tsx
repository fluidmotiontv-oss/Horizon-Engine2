import React, { useState, useEffect } from 'react';
import { Download, Upload, Save, X, Trash2, Check, Copy, Share2 } from 'lucide-react';
import { CanvasMode, ModularControls, SavedPreset } from '../types';

interface PresetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  canvasMode: CanvasMode;
  controls: ModularControls;
  episodeId: string;
  onLoadPreset: (preset: SavedPreset) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  isOpen,
  onClose,
  canvasMode,
  controls,
  episodeId,
  onLoadPreset,
}) => {
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const local = localStorage.getItem('horizon_saved_presets');
    if (local) {
      try {
        setSavedPresets(JSON.parse(local));
      } catch (e) {
        console.warn('Failed to parse saved presets:', e);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!newPresetName.trim()) return;

    const newPreset: SavedPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      createdAt: new Date().toLocaleDateString(),
      canvasMode,
      controls: { ...controls },
      episodeId,
    };

    const updated = [newPreset, ...savedPresets];
    setSavedPresets(updated);
    localStorage.setItem('horizon_saved_presets', JSON.stringify(updated));
    setNewPresetName('');
  };

  const handleDelete = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    localStorage.setItem('horizon_saved_presets', JSON.stringify(updated));
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedPresets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `horizon-engine-presets-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const merged = [...parsed, ...savedPresets];
            setSavedPresets(merged);
            localStorage.setItem('horizon_saved_presets', JSON.stringify(merged));
          }
        } catch (err) {
          alert('Invalid preset JSON file');
        }
      };
    }
  };

  const copyConfigCode = (preset: SavedPreset) => {
    const code = JSON.stringify(preset, null, 2);
    navigator.clipboard.writeText(code);
    setCopiedId(preset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#111218] border border-white/10 p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-mono font-bold text-white tracking-wider">
              PRESET MANAGER & EXPORTER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current State */}
        <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-white/5">
          <label className="text-xs font-mono text-white/70">Save Current State as Preset:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="e.g. Electric Hypercube #4"
              className="flex-1 rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSaveCurrent}
              disabled={!newPresetName.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE</span>
            </button>
          </div>
        </div>

        {/* Import / Export Controls */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleExportJSON}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT ALL (JSON)</span>
          </button>

          <label className="flex-1 py-2 px-3 rounded-lg text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-pink-400" />
            <span>IMPORT JSON</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        {/* Saved List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          <span className="text-xs font-mono text-white/50">Saved Presets ({savedPresets.length}):</span>

          {savedPresets.length === 0 ? (
            <div className="p-4 rounded-xl bg-black/30 text-center text-xs font-mono text-white/40">
              No custom presets saved yet. Create one above!
            </div>
          ) : (
            savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-white">{preset.name}</div>
                  <div className="text-[10px] text-white/40">
                    Mode: {preset.canvasMode} • Hue: {preset.controls.hue}° • {preset.createdAt}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onLoadPreset(preset)}
                    className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-bold"
                  >
                    LOAD
                  </button>

                  <button
                    onClick={() => copyConfigCode(preset)}
                    title="Copy Config JSON"
                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                  >
                    {copiedId === preset.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1 rounded bg-red-950/40 text-red-400 hover:bg-red-900/60"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
