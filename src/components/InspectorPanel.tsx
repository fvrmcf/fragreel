import React, { useRef, useState } from 'react';
import { Download, Film, Sliders, Trash2, Upload } from 'lucide-react';
import {
  AccentTheme,
  ExportSettings,
  HighlightClip,
  OverlaySettings,
} from '../types/demo';
import { getClipTotalDuration } from '../utils/canvasRenderer';
import { isMp4NativelySupported, resolveRecorderMime } from '../utils/videoExporter';

interface InspectorPanelProps {
  activeClip: HighlightClip | null;
  reelClips: HighlightClip[];
  overlay: OverlaySettings;
  onChangeOverlay: (patch: Partial<OverlaySettings>) => void;
  exportSettings: ExportSettings;
  onChangeExportSettings: (patch: Partial<ExportSettings>) => void;
  onUpdateClipTrim: (clipId: string, patch: Partial<Pick<HighlightClip, 'preRollSec' | 'postRollSec' | 'videoSyncOffsetSec'>>) => void;
  gameplayVideoName: string | null;
  onAttachGameplayVideo: (file: File) => void;
  onClearGameplayVideo: () => void;
  onStartExport: () => void;
}

const ACCENT_OPTIONS: Array<{ id: AccentTheme; label: string; swatch: string }> = [
  { id: 'gold', label: 'Gold', swatch: '#E5A93B' },
  { id: 'crimson', label: 'Major Red', swatch: '#EF4444' },
  { id: 'steel', label: 'CT Steel', swatch: '#5B9BD5' },
  { id: 'mono', label: 'Mono', swatch: '#F1F5F9' },
];

export function InspectorPanel({
  activeClip,
  reelClips,
  overlay,
  onChangeOverlay,
  exportSettings,
  onChangeExportSettings,
  onUpdateClipTrim,
  gameplayVideoName,
  onAttachGameplayVideo,
  onClearGameplayVideo,
  onStartExport,
}: InspectorPanelProps) {
  const [tab, setTab] = useState<'overlay' | 'export'>('overlay');
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mp4Supported = isMp4NativelySupported();
  const resolvedFormat = resolveRecorderMime(exportSettings.format);

  const targetClips =
    exportSettings.scope === 'selected'
      ? activeClip
        ? [activeClip]
        : []
      : reelClips;

  const estimatedDurationSec = targetClips.reduce(
    (sum, c) => sum + getClipTotalDuration(c, overlay),
    0
  );
  const estimatedSizeMb = ((estimatedDurationSec * exportSettings.bitrateMbps) / 8).toFixed(1);

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAttachGameplayVideo(file);
      e.target.value = '';
    }
  };

  return (
    <aside className="w-full lg:w-[310px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#10151E] flex flex-col min-h-0">
      {/* Inspector Mode Tabs */}
      <div className="p-3 border-b border-white/[0.08]">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setTab('overlay')}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
              tab === 'overlay'
                ? 'bg-[#1D2534] text-[#F8FAFC]'
                : 'text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Overlay & Trim
          </button>
          <button
            type="button"
            onClick={() => setTab('export')}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
              tab === 'export'
                ? 'bg-[#1D2534] text-[#F8FAFC]'
                : 'text-[#94A3B8] hover:text-[#E2E8F0]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Video Export
          </button>
        </div>
      </div>

      {/* Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {tab === 'overlay' ? (
          <>
            {/* Visual Source Mode */}
            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Visual Source</h2>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onChangeOverlay({ visualMode: 'tactical' })}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    overlay.visualMode === 'tactical'
                      ? 'bg-[#1D2534] text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  Tactical Radar
                </button>
                <button
                  type="button"
                  onClick={() => onChangeOverlay({ visualMode: 'video' })}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    overlay.visualMode === 'video'
                      ? 'bg-[#1D2534] text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  Video + HUD
                </button>
              </div>

              {/* Optional Gameplay Video Uploader */}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mkv"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              {gameplayVideoName ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[#141B27] border border-white/[0.08]">
                  <span className="text-xs text-[#E2E8F0] truncate">{gameplayVideoName}</span>
                  <button
                    type="button"
                    onClick={onClearGameplayVideo}
                    aria-label="Remove attached gameplay video"
                    className="p-1 text-[#94A3B8] hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#141B27] hover:bg-[#1B2434] border border-white/[0.1] text-xs font-medium text-[#CBD5E1] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Attach Gameplay Clip (.mp4 / .webm)
                </button>
              )}

              {overlay.visualMode === 'video' && activeClip && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Video Sync Offset</span>
                    <span className="font-mono-tabular text-[#F1F5F9]">
                      {activeClip.videoSyncOffsetSec.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={0.5}
                    value={activeClip.videoSyncOffsetSec}
                    onChange={(e) =>
                      onUpdateClipTrim(activeClip.id, { videoSyncOffsetSec: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              )}
            </div>

            {/* Clip Padding & Trim Controls */}
            {activeClip && (
              <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                <h2 className="text-xs font-semibold text-[#CBD5E1]">Clip Trim Padding</h2>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Pre-Roll before 1st Kill</span>
                    <span className="font-mono-tabular text-[#F1F5F9]">{activeClip.preRollSec.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={5.0}
                    step={0.2}
                    value={activeClip.preRollSec}
                    onChange={(e) =>
                      onUpdateClipTrim(activeClip.id, { preRollSec: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">Post-Roll after Last Kill</span>
                    <span className="font-mono-tabular text-[#F1F5F9]">{activeClip.postRollSec.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={5.0}
                    step={0.2}
                    value={activeClip.postRollSec}
                    onChange={(e) =>
                      onUpdateClipTrim(activeClip.id, { postRollSec: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            )}

            {/* Broadcast HUD Toggles */}
            <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Broadcast Overlays</h2>
              <div className="space-y-2">
                {(
                  [
                    ['showIntroCard', 'Intro Title Slate'],
                    ['showKillfeed', 'CS2 Killfeed'],
                    ['showScoreboard', 'Top Scoreboard Bug'],
                    ['showPlayerHud', 'Player Stats Card'],
                    ['showStreakBanner', 'Multi-Kill & Ace Banner'],
                    ['slowMoFinalKill', 'Slow-Mo Final Kill (0.5x)'],
                    ['showCinemaBars', 'Cinema Letterbox (2.35:1)'],
                    ['enableAudio', 'Weapon & Headshot Audio'],
                  ] as const
                ).map(([key, label]) => {
                  const checked = overlay[key];
                  return (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none"
                    >
                      <span className="text-xs text-[#CBD5E1]">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => onChangeOverlay({ [key]: !checked })}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
                          checked ? 'bg-[#E5A93B]' : 'bg-[#222B3B]'
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-[#0B0E14] transition-transform ${
                            checked ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Accent Palette */}
            <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Broadcast Accent</h2>
              <div className="grid grid-cols-2 gap-2">
                {ACCENT_OPTIONS.map((opt) => {
                  const selected = overlay.accentTheme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeOverlay({ accentTheme: opt.id })}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs font-medium transition-colors ${
                        selected
                          ? 'bg-[#182030] border-[#E5A93B] text-[#F8FAFC]'
                          : 'bg-[#141B27] border-white/[0.08] text-[#94A3B8] hover:text-[#E2E8F0]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: opt.swatch }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Export Scope */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Export Scope</h2>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => onChangeExportSettings({ scope: 'selected' })}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    exportSettings.scope === 'selected'
                      ? 'bg-[#1D2534] text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  Current Clip
                </button>
                <button
                  type="button"
                  onClick={() => onChangeExportSettings({ scope: 'reel' })}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    exportSettings.scope === 'reel'
                      ? 'bg-[#1D2534] text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  Full Reel ({reelClips.length})
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Aspect Ratio</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['16:9', 'YouTube'],
                    ['9:16', 'Shorts'],
                    ['1:1', 'Square'],
                  ] as const
                ).map(([ratio, sub]) => {
                  const active = exportSettings.aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => onChangeExportSettings({ aspectRatio: ratio })}
                      className={`py-2 px-2 rounded-md border text-center transition-colors ${
                        active
                          ? 'bg-[#182030] border-[#E5A93B] text-[#F8FAFC]'
                          : 'bg-[#141B27] border-white/[0.08] text-[#94A3B8] hover:text-[#E2E8F0]'
                      }`}
                    >
                      <div className="font-mono-tabular text-xs font-semibold">{ratio}</div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution & FPS */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06]">
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-[#CBD5E1]">Resolution</h2>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
                  {(['720p', '1080p'] as const).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => onChangeExportSettings({ resolution: res })}
                      className={`py-1.5 rounded text-xs font-mono-tabular transition-colors ${
                        exportSettings.resolution === res
                          ? 'bg-[#1D2534] text-[#F8FAFC] font-medium'
                          : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-[#CBD5E1]">Frame Rate</h2>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => onChangeExportSettings({ fps })}
                      className={`py-1.5 rounded text-xs font-mono-tabular transition-colors ${
                        exportSettings.fps === fps
                          ? 'bg-[#1D2534] text-[#F8FAFC] font-medium'
                          : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                      }`}
                    >
                      {fps} fps
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Container Format */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Video Container</h2>
              <div className="space-y-1.5">
                {(
                  [
                    ['auto-mp4', mp4Supported ? 'MP4 (H.264 / AAC)' : 'Auto Best (WebM VP9)'],
                    ['webm-vp9', 'WebM (VP9 High Efficiency)'],
                    ['webm-vp8', 'WebM (VP8 Universal)'],
                  ] as const
                ).map(([fmt, label]) => {
                  const active = exportSettings.format === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => onChangeExportSettings({ format: fmt })}
                      className={`w-full px-3 py-2 rounded-md border text-left text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#182030] border-[#E5A93B] text-[#F8FAFC]'
                          : 'bg-[#141B27] border-white/[0.08] text-[#94A3B8] hover:text-[#E2E8F0]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bitrate Quality */}
            <div className="space-y-2 pt-3 border-t border-white/[0.06]">
              <h2 className="text-xs font-semibold text-[#CBD5E1]">Encoding Bitrate</h2>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
                {([6, 12, 20] as const).map((mbps) => (
                  <button
                    key={mbps}
                    type="button"
                    onClick={() => onChangeExportSettings({ bitrateMbps: mbps })}
                    className={`py-1.5 rounded text-xs font-mono-tabular transition-colors ${
                      exportSettings.bitrateMbps === mbps
                        ? 'bg-[#1D2534] text-[#F8FAFC] font-medium'
                        : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                    }`}
                  >
                    {mbps} Mbps
                  </button>
                ))}
              </div>
            </div>

            {/* Output Summary */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1.5 text-xs">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Output Format</span>
                <span className="font-mono-tabular text-[#F1F5F9]">{resolvedFormat.label}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Clips to Render</span>
                <span className="font-mono-tabular text-[#F1F5F9]">{targetClips.length}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Total Runtime</span>
                <span className="font-mono-tabular text-[#F1F5F9]">{estimatedDurationSec.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Est. File Size</span>
                <span className="font-mono-tabular text-[#F1F5F9]">~{estimatedSizeMb} MB</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Inspector Export CTA */}
      <div className="p-4 border-t border-white/[0.08] bg-[#0D1119]">
        <button
          type="button"
          onClick={onStartExport}
          disabled={targetClips.length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#E5A93B] text-[#0B0E14] text-sm font-semibold hover:bg-[#EEB954] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
        >
          <Download className="w-4 h-4" />
          {exportSettings.scope === 'selected'
            ? 'Save Current Clip as Video'
            : `Render Reel (${reelClips.length} Clips)`}
        </button>
      </div>
    </aside>
  );
}
