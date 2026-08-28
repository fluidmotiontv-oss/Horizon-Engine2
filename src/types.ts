export type CanvasMode =
  | 'video'
  | 'generative_geometry'
  | 'plasma'
  | 'tunnel'
  | 'particle_swarm'
  | 'liquid_aurora'
  | 'quantum_field'
  | 'ice_crystal'
  | 'fire_smoke'
  | 'boiling_fluid';

export interface ModularControls {
  hue: number; // 0 - 360
  speed: number; // 0.1 - 5.0
  geometryDensity: number; // 3 - 12
  overlayVisible: boolean; // boolean
  overlayOpacity: number; // 0 - 100%
  bloomIntensity: number; // 0.5 - 3.0
  distortionRate: number; // 0.0 - 1.0
  audioReactive: boolean;
  wireframeOnly: boolean;
  colorPreset: string; // 'cyan' | 'magenta' | 'violet' | 'gold' | 'custom'
  bpm: number; // 40 - 240 BPM (Master tempo)
}

export interface StemTrack {
  id: string;
  name: string;
  type: 'visual' | 'lighting' | 'wireframe' | 'audio';
  category: string;
  volume: number; // 0 - 100
  muted: boolean;
  solo: boolean;
  frequency?: number; // for audio synth pitch
}

export interface Episode {
  id: string;
  code: string; // e.g. 'EP. 01'
  title: string;
  subtitle: string;
  description: string;
  defaultMode: CanvasMode;
  defaultControls: ModularControls;
  colorAccent: string; // hex color or tailwind class
  badgeText: string;
  tags: string[];
  duration: string;
  videoUrl?: string;
  thumbnailGradient: string;
}

export interface ModularAsset {
  id: string;
  title: string;
  code: string;
  category: 'Plasma' | 'Tunnel' | 'Geometry' | 'Grid' | 'Matrix' | 'Flare' | 'Crystalline' | 'Fluid' | 'Particle';
  description: string;
  preset: {
    canvasMode: CanvasMode;
    controls: Partial<ModularControls>;
  };
  complexity: string;
  fpsTarget: number;
  tags: string[];
  gradientBg: string;
}

export interface SavedPreset {
  id: string;
  name: string;
  createdAt: string;
  canvasMode: CanvasMode;
  controls: ModularControls;
  episodeId: string;
}

export interface TelemetryData {
  fps: number;
  frameTimeMs: number;
  activeParticles: number;
  audioPeakDb: number;
  syncStatus: string;
}

export interface MidiMapping {
  cc: number;
  channel: number;
  targetType: 'control' | 'stem_volume';
  targetId: keyof ModularControls | string;
}
