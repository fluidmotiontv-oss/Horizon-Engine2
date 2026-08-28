/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { EngineCanvas } from './components/EngineCanvas';
import { ControlDeck } from './components/ControlDeck';
import { EpisodeSelector } from './components/EpisodeSelector';
import { AssetGrid } from './components/AssetGrid';
import { AIPresetModal } from './components/AIPresetModal';
import { PresetManager } from './components/PresetManager';
import { AudioVisualizerBar } from './components/AudioVisualizerBar';
import { EPISODES } from './data/episodes';
import { MODULAR_ASSETS } from './data/assets';
import { CanvasMode, ModularControls, StemTrack, Episode, ModularAsset, SavedPreset, MidiMapping } from './types';
import { midiEngine } from './lib/midiEngine';
import { audioEngine } from './lib/audioEngine';

export default function App() {
  // Ep. 02 Future Art is Active Default
  const defaultEp = EPISODES.find((e) => e.id === 'ep-02') || EPISODES[0];

  const [activeEpisode, setActiveEpisode] = useState<Episode>(defaultEp);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(defaultEp.defaultMode);
  const [controls, setControls] = useState<ModularControls>(defaultEp.defaultControls);
  const [activeAssetTitle, setActiveAssetTitle] = useState<string | undefined>('Plasma Ball Tendril #1');
  const [activeAssetId, setActiveAssetId] = useState<string | undefined>('asset-01');

  // Stems initial state
  const [stems, setStems] = useState<StemTrack[]>([
    { id: 'visual_layer', name: 'Visual Geometry Layer', type: 'visual', category: 'Canvas', volume: 100, muted: false, solo: false },
    { id: 'lighting_overlay', name: 'Lighting Overlay', type: 'lighting', category: 'Pulse', volume: 100, muted: false, solo: false },
    { id: 'code_wireframe', name: 'Code & HUD Overlay', type: 'wireframe', category: 'HUD', volume: 100, muted: false, solo: false },
    { id: 'geometry_drone', name: 'Geometry Drone Synth', type: 'audio', category: 'Drone', volume: 100, muted: false, solo: false },
    { id: 'sub_synth', name: 'Sub-Bass Engine', type: 'audio', category: 'Sub', volume: 100, muted: false, solo: false },
    { id: 'plasma_pulse', name: 'Plasma Pulse Osc', type: 'audio', category: 'Pulse', volume: 100, muted: false, solo: false },
    { id: 'glitch_arp', name: 'Glitch Arpeggiator', type: 'audio', category: 'Arp', volume: 100, muted: false, solo: false },
  ]);

  // Modals state
  const [isAIPresetOpen, setIsAIPresetOpen] = useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

  // MIDI state
  const [mappings, setMappings] = useState<MidiMapping[]>([]);
  const [learningTarget, setLearningTarget] = useState<{ type: 'control' | 'stem_volume', id: string } | null>(null);

  // Recording State
  const [isRecording4K, setIsRecording4K] = useState(false);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);

  useEffect(() => {
    midiEngine.init();

    const handleMidi = (cc: number, value: number, channel: number) => {
      if (learningTarget) {
        setMappings(prev => {
          // Remove existing mapping for this CC, add new one
          const updated = prev.filter(m => m.cc !== cc && !(m.targetType === learningTarget.type && m.targetId === learningTarget.id));
          return [...updated, { cc, channel, targetType: learningTarget.type, targetId: learningTarget.id }];
        });
        setLearningTarget(null);
        return;
      }

      setMappings(prevMappings => {
        const mapping = prevMappings.find(m => m.cc === cc);
        if (mapping) {
          const normalizedValue = value / 127;
          
          if (mapping.targetType === 'control') {
            setControls(prevControls => {
              const id = mapping.targetId as keyof ModularControls;
              let newVal: any = prevControls[id];
              
              if (id === 'hue') newVal = Math.floor(normalizedValue * 360);
              else if (id === 'speed') newVal = Number((normalizedValue * 4.9 + 0.1).toFixed(1));
              else if (id === 'geometryDensity') newVal = Math.floor(normalizedValue * 9) + 3;
              else if (id === 'bloomIntensity') newVal = Number((normalizedValue * 2.5 + 0.5).toFixed(1));
              else if (id === 'distortionRate') newVal = Number(normalizedValue.toFixed(2));
              else if (id === 'overlayOpacity') newVal = Math.floor(normalizedValue * 100);

              return { ...prevControls, [id]: newVal };
            });
          } else if (mapping.targetType === 'stem_volume') {
            const vol = Math.floor(normalizedValue * 100);
            audioEngine.setStemVolume(mapping.targetId, vol);
            setStems(prevStems => prevStems.map(s => s.id === mapping.targetId ? { ...s, volume: vol } : s));
          }
        }
        return prevMappings;
      });
    };

    midiEngine.addListener(handleMidi);
    return () => midiEngine.removeListener(handleMidi);
  }, [learningTarget]);

  // Handlers
  const handleControlsChange = (updated: Partial<ModularControls>) => {
    setControls((prev) => ({ ...prev, ...updated }));
  };

  const handleStemChange = (stemId: string, updated: Partial<StemTrack>) => {
    setStems((prev) =>
      prev.map((s) => (s.id === stemId ? { ...s, ...updated } : s))
    );
  };

  const handleSelectEpisode = (ep: Episode) => {
    setActiveEpisode(ep);
    setCanvasMode(ep.defaultMode);
    setControls(ep.defaultControls);
    setActiveAssetTitle(undefined);
    setActiveAssetId(undefined);
  };

  const handleSelectAsset = (asset: ModularAsset) => {
    setActiveAssetId(asset.id);
    setActiveAssetTitle(asset.title);
    setCanvasMode(asset.preset.canvasMode);
    setControls((prev) => ({
      ...prev,
      ...asset.preset.controls,
    }));
  };

  const handleResetControls = () => {
    setCanvasMode(activeEpisode.defaultMode);
    setControls(activeEpisode.defaultControls);
  };

  const handleApplyAIPreset = (
    presetName: string,
    mode: CanvasMode,
    ctrls: Partial<ModularControls>
  ) => {
    setCanvasMode(mode);
    setControls((prev) => ({
      ...prev,
      ...ctrls,
    }));
    setActiveAssetTitle(`AI: ${presetName}`);
  };

  const handleLoadSavedPreset = (saved: SavedPreset) => {
    setCanvasMode(saved.canvasMode);
    setControls(saved.controls);
    const ep = EPISODES.find((e) => e.id === saved.episodeId);
    if (ep) setActiveEpisode(ep);
    setIsPresetManagerOpen(false);
  };

  const handleToggleRecording = () => {
    if (isRecordingRef.current) {
      // STOP Recording
      isRecordingRef.current = false;
      setIsRecording4K(false);
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      // START Recording
      isRecordingRef.current = true;
      setIsRecording4K(true);

      // Wait for React to apply 4K resolution state to canvas
      setTimeout(() => {
        const canvas = document.getElementById('engine-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        // @ts-ignore
        const videoStream = canvas.captureStream(60);
        const audioStream = audioEngine.getAudioStream();
        
        const tracks = [...videoStream.getVideoTracks()];
        if (audioStream) {
          tracks.push(...audioStream.getAudioTracks());
        }
        
        const combinedStream = new MediaStream(tracks);
        
        // Find best supported format for 4K high quality
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.640033,mp4a.40.2')) { // High Profile H.264
          mimeType = 'video/mp4;codecs=avc1.640033,mp4a.40.2';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4'; 
        } else {
          mimeType = 'video/webm;codecs=vp8';
        }

        const recordNextChunk = () => {
          if (!isRecordingRef.current) return;

          const recorder = new MediaRecorder(combinedStream, { 
            mimeType, 
            videoBitsPerSecond: 50000000 // 50Mbps for pristine 4K WebM
          });
          
          let chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          
          recorder.onstop = () => {
            if (chunks.length === 0) return;
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `resonance-4k-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };

          recorder.start();
          mediaRecorderRef.current = recorder;

          // Record exactly 60 seconds (1 minute), then chunk
          recordingTimerRef.current = setTimeout(() => {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            recordNextChunk();
          }, 60000);
        };

        recordNextChunk();
      }, 300); // 300ms delay to ensure layout shifts are complete
    }
  };

  const handleHyperRandomize = () => {
    setControls(prev => ({
      ...prev,
      hue: Math.floor(Math.random() * 360),
      speed: Number((Math.random() * 4.9 + 0.1).toFixed(1)),
      geometryDensity: Math.floor(Math.random() * 15) + 3,
      bloomIntensity: Number((Math.random() * 4.0 + 0.5).toFixed(1)),
      distortionRate: Number(Math.random().toFixed(2)),
      overlayOpacity: Math.floor(Math.random() * 100),
    }));
    
    setStems(prev => prev.map(s => ({
      ...s,
      volume: Math.floor(Math.random() * 100)
    })));

    const modes: CanvasMode[] = ['generative_geometry', 'plasma', 'tunnel', 'video', 'particle_swarm', 'liquid_aurora', 'quantum_field'];
    setCanvasMode(modes[Math.floor(Math.random() * modes.length)]);
  };

  return (
    <div className="min-h-screen w-full bg-[#070709] text-white font-sans antialiased selection:bg-[#00F0FF] selection:text-black p-3 sm:p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* 1. Header Navigation Bar */}
      <Header
        onOpenAIPreset={() => setIsAIPresetOpen(true)}
        onOpenPresetManager={() => setIsPresetManagerOpen(true)}
      />

      {/* 2. Main Stage Viewport (Real-Time Interactive Canvas) */}
      <main className="w-full flex flex-col gap-4">
        <EngineCanvas
          canvasMode={canvasMode}
          controls={controls}
          episodeCode={activeEpisode.code}
          episodeTitle={activeEpisode.title}
          activeAssetTitle={activeAssetTitle}
          isRecording4K={isRecording4K}
          onToggleRecording={handleToggleRecording}
          onHyperRandomize={handleHyperRandomize}
        />

        {/* Audio Visualizer Spectrum Bar */}
        <AudioVisualizerBar />
      </main>

      {/* 3. Interactive Control Deck (Sliders & Stem Mixer) */}
      <ControlDeck
        canvasMode={canvasMode}
        controls={controls}
        stems={stems}
        learningTarget={learningTarget}
        onSetLearningTarget={setLearningTarget}
        onCanvasModeChange={setCanvasMode}
        onControlsChange={handleControlsChange}
        onStemChange={handleStemChange}
        onResetControls={handleResetControls}
        isRecording4K={isRecording4K}
        onToggleRecording={handleToggleRecording}
      />

      {/* 4. Series & Episode Controller */}
      <EpisodeSelector
        episodes={EPISODES}
        activeEpisodeId={activeEpisode.id}
        onSelectEpisode={handleSelectEpisode}
      />

      {/* 5. Dynamic Asset Inspector (Modular Grid) */}
      <AssetGrid
        assets={MODULAR_ASSETS}
        activeAssetId={activeAssetId}
        onSelectAsset={handleSelectAsset}
      />

      {/* Footer Branding */}
      <footer className="w-full py-4 text-center border-t border-white/10 text-xs font-mono text-white/40 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>THE HORIZON ENGINE © 2026 • D9 SYNC ENGINE CORE</div>
        <div className="flex items-center gap-3">
          <span className="text-cyan-400">#00F0FF CYAN PULSE</span>
          <span>•</span>
          <span className="text-pink-400">#FF007F MAGENTA NEON</span>
          <span>•</span>
          <span className="text-purple-400">#8A2BE2 VIOLET GLOW</span>
        </div>
      </footer>

      {/* AI Synthesizer Modal */}
      <AIPresetModal
        isOpen={isAIPresetOpen}
        onClose={() => setIsAIPresetOpen(false)}
        onApplyPreset={handleApplyAIPreset}
      />

      {/* Preset Export / Import Manager Modal */}
      <PresetManager
        isOpen={isPresetManagerOpen}
        onClose={() => setIsPresetManagerOpen(false)}
        canvasMode={canvasMode}
        controls={controls}
        episodeId={activeEpisode.id}
        onLoadPreset={handleLoadSavedPreset}
      />
    </div>
  );
}
