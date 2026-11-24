import { ArrowDown, ArrowUp, Check, Download, Play } from 'lucide-react';
import { HighlightClip, OverlaySettings } from '../types/demo';
import { getClipTotalDuration } from '../utils/canvasRenderer';

interface TimelineViewProps {
  clips: HighlightClip[];
  overlay: OverlaySettings;
  onToggleReelInclude: (clipId: string) => void;
  onReorderClip: (clipId: string, direction: 'up' | 'down') => void;
  onUpdateClipTrim: (
    clipId: string,
    patch: Partial<Pick<HighlightClip, 'preRollSec' | 'postRollSec'>>
  ) => void;
  onPreviewClip: (clipId: string) => void;
  onExportReel: () => void;
}

export function TimelineView({
  clips,
  overlay,
  onToggleReelInclude,
  onReorderClip,
  onUpdateClipTrim,
  onPreviewClip,
  onExportReel,
}: TimelineViewProps) {
  const includedClips = clips.filter((c) => c.includedInReel);
  const totalReelSec = includedClips.reduce(
    (sum, c) => sum + getClipTotalDuration(c, overlay),
    0
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide text-[#F8FAFC]">
              Montage Reel Timeline
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Order your detected aces and clutches, adjust pre-roll and post-roll padding, and render a combined highlight video.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-[#94A3B8]">Queued Reel Runtime</div>
              <div className="font-mono-tabular text-lg font-semibold text-[#F8FAFC]">
                {includedClips.length} {includedClips.length === 1 ? 'clip' : 'clips'} · {totalReelSec.toFixed(1)}s
              </div>
            </div>
            <button
              type="button"
              onClick={onExportReel}
              disabled={includedClips.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#E5A93B] text-[#0B0E14] text-sm font-semibold hover:bg-[#EEB954] transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export Full Reel
            </button>
          </div>
        </div>

        {/* Visual Sequence Track */}
        <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="font-semibold text-[#CBD5E1]">Sequence Track Overview</span>
            <span className="font-mono-tabular">00:00.0 — 00:{String(Math.round(totalReelSec)).padStart(2, '0')}.0</span>
          </div>

          {includedClips.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#94A3B8]">
              Check at least one highlight below to assemble a montage video sequence.
            </div>
          ) : (
            <div className="flex items-stretch gap-1.5 min-h-[72px]">
              {includedClips.map((clip, idx) => {
                const dur = getClipTotalDuration(clip, overlay);
                const widthPct = totalReelSec > 0 ? Math.max(12, (dur / totalReelSec) * 100) : 100;
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => onPreviewClip(clip.id)}
                    style={{ width: `${widthPct}%` }}
                    className="group relative rounded-md border border-white/[0.12] bg-[#161E2C] hover:border-[#E5A93B] p-3 text-left transition-colors overflow-hidden flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-[11px] font-semibold text-[#E5A93B]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                        {dur.toFixed(1)}s
                      </span>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-semibold text-[#F8FAFC] truncate">{clip.title}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">
                        {clip.playerName} · {clip.kills.length}K · R{clip.roundNumber}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Clip Rows */}
        <div className="rounded-lg border border-white/[0.08] bg-[#10151E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0D121A] text-xs font-semibold text-[#94A3B8]">
                  <th className="py-3 px-4 w-12">Reel</th>
                  <th className="py-3 px-4">Highlight</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4 text-right">Kills / HS</th>
                  <th className="py-3 px-4">Pre-Roll</th>
                  <th className="py-3 px-4">Post-Roll</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-right">Order & Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {clips.map((clip, index) => {
                  const hsCount = clip.kills.filter((k) => k.headshot).length;
                  const dur = getClipTotalDuration(clip, overlay);
                  return (
                    <tr
                      key={clip.id}
                      className={`transition-colors ${
                        clip.includedInReel ? 'bg-[#121824]' : 'bg-transparent opacity-65'
                      } hover:bg-[#171F2E]`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleReelInclude(clip.id)}
                          aria-label={
                            clip.includedInReel ? `Exclude ${clip.title}` : `Include ${clip.title}`
                          }
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            clip.includedInReel
                              ? 'bg-[#E5A93B] border-[#E5A93B] text-[#0B0E14]'
                              : 'border-white/25 hover:border-white/50'
                          }`}
                        >
                          {clip.includedInReel && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#F8FAFC]">{clip.title}</div>
                        <div className="text-xs text-[#94A3B8] font-mono-tabular">
                          Round {clip.roundNumber} · {clip.primaryWeapon} · Tick {clip.startTick.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={
                            clip.playerTeam === 'CT'
                              ? 'text-[#5B9BD5] font-medium'
                              : 'text-[#E5A93B] font-medium'
                          }
                        >
                          {clip.playerName}
                        </span>
                        <span className="text-xs text-[#64748B] ml-1.5">{clip.playerTeam}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular whitespace-nowrap text-[#E2E8F0]">
                        {clip.kills.length}K / {hsCount} HS
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <input
                            type="range"
                            min={1.0}
                            max={5.0}
                            step={0.2}
                            value={clip.preRollSec}
                            onChange={(e) =>
                              onUpdateClipTrim(clip.id, { preRollSec: Number(e.target.value) })
                            }
                            className="w-20 studio-slider"
                          />
                          <span className="font-mono-tabular text-xs text-[#CBD5E1] w-8">
                            {clip.preRollSec.toFixed(1)}s
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <input
                            type="range"
                            min={1.0}
                            max={5.0}
                            step={0.2}
                            value={clip.postRollSec}
                            onChange={(e) =>
                              onUpdateClipTrim(clip.id, { postRollSec: Number(e.target.value) })
                            }
                            className="w-20 studio-slider"
                          />
                          <span className="font-mono-tabular text-xs text-[#CBD5E1] w-8">
                            {clip.postRollSec.toFixed(1)}s
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#F8FAFC] whitespace-nowrap">
                        {dur.toFixed(1)}s
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onReorderClip(clip.id, 'up')}
                            disabled={index === 0}
                            aria-label="Move clip earlier"
                            className="p-1.5 rounded bg-[#1A2231] text-[#CBD5E1] hover:bg-[#243045] disabled:opacity-30 transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onReorderClip(clip.id, 'down')}
                            disabled={index === clips.length - 1}
                            aria-label="Move clip later"
                            className="p-1.5 rounded bg-[#1A2231] text-[#CBD5E1] hover:bg-[#243045] disabled:opacity-30 transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPreviewClip(clip.id)}
                            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#1E2736] text-xs font-medium text-[#F8FAFC] hover:bg-[#2A364B] transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
