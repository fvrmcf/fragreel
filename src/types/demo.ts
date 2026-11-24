export type TeamSide = 'CT' | 'T';

export type WeaponName =
  | 'AK-47'
  | 'M4A1-S'
  | 'M4A4'
  | 'AWP'
  | 'Desert Eagle'
  | 'USP-S'
  | 'Glock-18'
  | 'MP9'
  | 'Galil AR'
  | 'FAMAS';

export type HighlightCategory = 'ACE' | '4K' | '3K' | 'CLUTCH' | 'AWP' | 'DEAGLE';

export type ActiveTab = 'highlights' | 'timeline' | 'demo-info' | 'script';

export type AccentTheme = 'gold' | 'crimson' | 'steel' | 'mono';

export interface DemoPlayer {
  id: string;
  name: string;
  steamId: string;
  team: TeamSide;
  kills: number;
  deaths: number;
  assists: number;
  adr: number;
  hsPct: number;
  multiKills: number;
  clutchesWon: number;
}

export interface KillEvent {
  id: string;
  tick: number;
  /** Seconds from the start of the highlight action window (excluding pre-roll slate) */
  timeOffset: number;
  attackerName: string;
  attackerTeam: TeamSide;
  victimName: string;
  victimTeam: TeamSide;
  weapon: WeaponName;
  headshot: boolean;
  wallbang: boolean;
  throughSmoke: boolean;
  noScope: boolean;
  attackerBlind: boolean;
  /** Radar coordinates in 0..1000 normalized map space */
  attackerPos: [number, number];
  victimPos: [number, number];
  callout: string;
}

export interface UtilityEvent {
  id: string;
  type: 'smoke' | 'flash' | 'molotov' | 'he';
  timeOffset: number;
  duration: number;
  pos: [number, number];
}

export interface Waypoint {
  time: number;
  x: number;
  y: number;
  /** View angle in radians */
  angle: number;
  alive: boolean;
  hp: number;
}

export interface PlayerPath {
  playerName: string;
  team: TeamSide;
  isStar: boolean;
  waypoints: Waypoint[];
}

export interface HighlightClip {
  id: string;
  title: string;
  category: HighlightCategory;
  roundNumber: number;
  ctScore: number;
  tScore: number;
  playerName: string;
  playerTeam: TeamSide;
  primaryWeapon: WeaponName;
  startTick: number;
  endTick: number;
  /** Base action duration in seconds before user pre/post trim overrides */
  actionDurationSec: number;
  kills: KillEvent[];
  utilities: UtilityEvent[];
  paths: PlayerPath[];
  preRollSec: number;
  postRollSec: number;
  includedInReel: boolean;
  bombPlantedAt?: 'A' | 'B';
  clutchVs?: number;
  /** Optional offset in seconds if synced with an external uploaded gameplay video */
  videoSyncOffsetSec: number;
}

export interface ParsedDemo {
  id: string;
  fileName: string;
  source: 'sample' | 'uploaded';
  format: 'PBDEMS2' | 'HL2DEMO' | 'DEMO_JSON';
  mapName: string;
  serverName: string;
  clientName: string;
  matchDate: string;
  matchLabel: string;
  scoreCT: number;
  scoreT: number;
  tickRate: number;
  totalTicks: number;
  durationSec: number;
  fileSizeBytes: number;
  players: DemoPlayer[];
  highlights: HighlightClip[];
  parseNotes: string[];
}

export interface OverlaySettings {
  visualMode: 'tactical' | 'video';
  showIntroCard: boolean;
  showKillfeed: boolean;
  showScoreboard: boolean;
  showPlayerHud: boolean;
  showStreakBanner: boolean;
  showCinemaBars: boolean;
  enableAudio: boolean;
  slowMoFinalKill: boolean;
  accentTheme: AccentTheme;
}

export interface ExportSettings {
  scope: 'selected' | 'reel';
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p';
  fps: 30 | 60;
  format: 'auto-mp4' | 'webm-vp9' | 'webm-vp8';
  bitrateMbps: 6 | 12 | 20;
}

export interface ExportProgress {
  phase: 'idle' | 'preparing' | 'rendering' | 'finalizing' | 'complete' | 'error';
  progress: number;
  currentClipIndex: number;
  totalClips: number;
  currentClipTitle: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
  errorMessage?: string;
}

export interface ExportedVideoResult {
  blob: Blob;
  url: string;
  fileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  clipCount: number;
}
