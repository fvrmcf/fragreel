import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Film, X } from 'lucide-react';
import {
  DemoPlayer,
  ExportedVideoResult,
  ExportProgress,
  ExportSettings,
  HighlightClip,
  OverlaySettings,
} from '../types/demo';
import { getClipTotalDuration } from '../utils/canvasRenderer';
import {
  exportHighlightsToVideo,
  getExportDimensions,
  resolveRecorderMime,
} from '../utils/videoExporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeClip: HighlightClip | null;
  reelClips: HighlightClip[];
  mapName: string;
  players: DemoPlayer[];
  overlay: OverlaySettings;
  exportSettings: ExportSettings;
  onChangeExportSettings: (patch: Partial<ExportSettings>) => void;
  backdropImage: HTMLImageElement | null;
  gameplayVideoUrl: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ExportModal({
  isOpen,
  onClose,
  activeClip,
  reelClips,
  mapName,
  players,
  overlay,
  exportSettings,
  onChangeExportSettings,
  backdropImage,
  gameplayVideoUrl,
}: ExportModalProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState<ExportProgress>({
    phase: 'idle',
    progress: 0,
    currentClipIndex: 0,
    totalClips: 0,
    currentClipTitle: '',
    elapsedMs: 0,
    estimatedRemainingMs: 0,
  });
  const [result, setResult] = useState<ExportedVideoResult | null>(null);

  const clipsToRender =
    exportSettings.scope === 'selected'
      ? activeClip
        ? [activeClip]
        : []
      : reelClips;

  const dims = getExportDimensions(exportSettings.aspectRatio, exportSettings.resolution);
  const formatInfo = resolveRecorderMime(exportSettings.format);
  const estDuration = clipsToRender.reduce((s, c) => s + getClipTotalDuration(c, overlay), 0);

  // Clean up object URL when modal closes or re-renders
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
      setProgress({
        phase: 'idle',
        progress: 0,
        currentClipIndex: 0,
        totalClips: 0,
        currentClipTitle: '',
        elapsedMs: 0,
        estimatedRemainingMs: 0,
      });
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isRendering =
    progress.phase === 'preparing' ||
    progress.phase === 'rendering' ||
    progress.phase === 'finalizing';

  const handleStartRender = async () => {
    if (clipsToRender.length === 0) return;
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const videoRes = await exportHighlightsToVideo({
        clips: clipsToRender,
        mapName,
        players,
        overlay,
        settings: exportSettings,
        backdropImage,
        gameplayVideoUrl,
        previewCanvas: previewCanvasRef.current,
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
      });
      setResult(videoRes);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setProgress((prev) => ({ ...prev, phase: 'idle', progress: 0 }));
      } else {
        setProgress((prev) => ({
          ...prev,
          phase: 'error',
          errorMessage: err instanceof Error ? err.message : 'Video rendering failed.',
        }));
      }
    }
  };

  const handleCancelRender = () => {
    abortRef.current?.abort();
  };

  const handleDownloadFile = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-white/[0.12] bg-[#10151E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-[#E5A93B]" />
            <h2 id="export-modal-title" className="font-display text-2xl font-bold tracking-wide text-[#F8FAFC]">
              Export Highlight Video
            </h2>
          </div>
          <button
            type="button"
            onClick={isRendering ? handleCancelRender : onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* State 1: Idle Configuration Confirmation */}
          {progress.phase === 'idle' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onChangeExportSettings({ scope: 'selected' })}
                  className={`p-3.5 rounded-lg border text-left transition-colors ${
                    exportSettings.scope === 'selected'
                      ? 'bg-[#172030] border-[#E5A93B]'
                      : 'bg-[#141B27] border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#F8FAFC]">Current Highlight Clip</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5 truncate">
                    {activeClip ? activeClip.title : 'No clip selected'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeExportSettings({ scope: 'reel' })}
                  className={`p-3.5 rounded-lg border text-left transition-colors ${
                    exportSettings.scope === 'reel'
                      ? 'bg-[#172030] border-[#E5A93B]'
                      : 'bg-[#141B27] border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="text-sm font-semibold text-[#F8FAFC]">
                    Full Montage Reel ({reelClips.length} Clips)
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">
                    Stitches all checked highlights with transitions
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-md bg-[#0B0E14] border border-white/[0.06] p-3">
                  <div className="text-[#94A3B8]">Dimensions</div>
                  <div className="mt-1 font-mono-tabular font-semibold text-[#F8FAFC]">
                    {dims.width}×{dims.height}
                  </div>
                </div>
                <div className="rounded-md bg-[#0B0E14] border border-white/[0.06] p-3">
                  <div className="text-[#94A3B8]">Frame Rate</div>
                  <div className="mt-1 font-mono-tabular font-semibold text-[#F8FAFC]">
                    {exportSettings.fps} fps
                  </div>
                </div>
                <div className="rounded-md bg-[#0B0E14] border border-white/[0.06] p-3">
                  <div className="text-[#94A3B8]">Format</div>
                  <div className="mt-1 font-mono-tabular font-semibold text-[#F8FAFC]">
                    {formatInfo.label}
                  </div>
                </div>
                <div className="rounded-md bg-[#0B0E14] border border-white/[0.06] p-3">
                  <div className="text-[#94A3B8]">Duration</div>
                  <div className="mt-1 font-mono-tabular font-semibold text-[#F8FAFC]">
                    {estDuration.toFixed(1)}s
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Video is encoded directly in your browser with synchronized CS2 HUD overlays{overlay.enableAudio ? ' and synthesized weapon/headshot audio' : ''}. Keep this tab visible during rendering for smooth frame pacing.
              </p>
            </>
          )}

          {/* State 2: Active Live Rendering */}
          {isRendering && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border border-white/[0.1] bg-[#090C11] flex items-center justify-center">
                <canvas
                  ref={previewCanvasRef}
                  width={exportSettings.aspectRatio === '9:16' ? 270 : 560}
                  height={exportSettings.aspectRatio === '9:16' ? 480 : exportSettings.aspectRatio === '1:1' ? 320 : 315}
                  className="max-h-[300px] w-auto object-contain block"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#F8FAFC] truncate">
                    {progress.phase === 'finalizing'
                      ? 'Finalizing video container...'
                      : `Rendering Clip ${progress.currentClipIndex + 1} of ${progress.totalClips}: ${progress.currentClipTitle}`}
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#E5A93B] shrink-0">
                    {Math.round(progress.progress * 100)}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-[#1B2332] overflow-hidden">
                  <div
                    className="h-full bg-[#E5A93B] transition-all duration-150"
                    style={{ width: `${Math.round(progress.progress * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#94A3B8]">
                  <span>Elapsed: {(progress.elapsedMs / 1000).toFixed(1)}s</span>
                  <span>
                    Est. remaining: {Math.max(0, progress.estimatedRemainingMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* State 3: Completed Export with Instant Playback & Save */}
          {progress.phase === 'complete' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#F8FAFC]">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
                <span>Video Ready — {result.fileName}</span>
              </div>

              <div className="rounded-lg overflow-hidden border border-white/[0.12] bg-black">
                <video
                  src={result.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full max-h-[340px] object-contain"
                />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-tabular text-[#94A3B8]">
                <span>{formatSize(result.sizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {result.width}×{result.height} @ {result.fps} fps
                </span>
                <span aria-hidden="true">·</span>
                <span>{result.durationSec.toFixed(1)}s</span>
                <span aria-hidden="true">·</span>
                <span>.{result.extension.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* State 4: Error */}
          {progress.phase === 'error' && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {progress.errorMessage || 'Could not encode highlight video.'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D1119] flex items-center justify-end gap-3">
          {progress.phase === 'idle' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-semibold text-[#CBD5E1] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRender}
                disabled={clipsToRender.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#E5A93B] text-[#0B0E14] text-xs font-semibold hover:bg-[#EEB954] transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                <Film className="w-4 h-4" />
                Render Video ({estDuration.toFixed(1)}s)
              </button>
            </>
          )}

          {isRendering && (
            <button
              type="button"
              onClick={handleCancelRender}
              className="px-4 py-2 rounded-md bg-[#1D2534] text-xs font-semibold text-[#F8FAFC] hover:bg-[#283347] transition-colors"
            >
              Cancel Render
            </button>
          )}

          {progress.phase === 'complete' && result && (
            <>
              <button
                type="button"
                onClick={() => {
                  setProgress((p) => ({ ...p, phase: 'idle', progress: 0 }));
                }}
                className="px-4 py-2 rounded-md text-xs font-semibold text-[#CBD5E1] hover:text-white transition-colors"
              >
                Render Another
              </button>
              <button
                type="button"
                onClick={handleDownloadFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#E5A93B] text-[#0B0E14] text-xs font-semibold hover:bg-[#EEB954] transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Save Video File (.{result.extension})
              </button>
            </>
          )}

          {progress.phase === 'error' && (
            <button
              type="button"
              onClick={() => setProgress((p) => ({ ...p, phase: 'idle', progress: 0 }))}
              className="px-4 py-2 rounded-md bg-[#E5A93B] text-[#0B0E14] text-xs font-semibold"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
