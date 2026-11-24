import React, { useRef, useState } from 'react';
import { Check, FolderOpen, Upload } from 'lucide-react';
import { HighlightCategory, HighlightClip, OverlaySettings, ParsedDemo } from '../types/demo';
import { getClipTotalDuration } from '../utils/canvasRenderer';

interface SidebarProps {
  demos: ParsedDemo[];
  activeDemo: ParsedDemo;
  onSelectDemo: (demoId: string) => void;
  onUploadDemoFile: (file: File) => Promise<void>;
  isParsingDemo: boolean;
  parseError: string | null;
  selectedPlayer: string;
  onSelectPlayer: (playerName: string) => void;
  selectedCategory: 'ALL' | HighlightCategory;
  onSelectCategory: (cat: 'ALL' | HighlightCategory) => void;
  filteredClips: HighlightClip[];
  activeClipId: string | null;
  onSelectClip: (clipId: string) => void;
  onToggleReelInclude: (clipId: string) => void;
  overlay: OverlaySettings;
}

const CATEGORY_TABS: Array<{ id: 'ALL' | HighlightCategory; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'ACE', label: 'Ace' },
  { id: 'CLUTCH', label: 'Clutch' },
  { id: '4K', label: '4K' },
  { id: 'AWP', label: 'AWP' },
  { id: 'DEAGLE', label: 'Deagle' },
];

export function Sidebar({
  demos,
  activeDemo,
  onSelectDemo,
  onUploadDemoFile,
  isParsingDemo,
  parseError,
  selectedPlayer,
  onSelectPlayer,
  selectedCategory,
  onSelectCategory,
  filteredClips,
  activeClipId,
  onSelectClip,
  onToggleReelInclude,
  overlay,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const reelClips = activeDemo.highlights.filter((c) => c.includedInReel);
  const totalReelSec = reelClips.reduce((sum, c) => sum + getClipTotalDuration(c, overlay), 0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadDemoFile(file);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onUploadDemoFile(file);
    }
  };

  return (
    <aside className="w-full lg:w-[300px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#10151E] flex flex-col min-h-0">
      {/* Demo Import & Match Switcher */}
      <div className="p-4 border-b border-white/[0.08] space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-lg border border-dashed p-3.5 transition-colors ${
            isDragging
              ? 'border-[#E5A93B] bg-[#E5A93B]/10'
              : 'border-white/[0.14] bg-[#141B27] hover:border-white/[0.25]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".dem,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#F1F5F9]">Load CS2 Demo File</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Drop a .dem file or browse</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1E2736] text-[#F1F5F9] hover:bg-[#273245] border border-white/[0.08] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              <Upload className="w-3.5 h-3.5" />
              {isParsingDemo ? 'Scanning...' : 'Browse'}
            </button>
          </div>
          {parseError && (
            <p className="mt-2 text-xs text-red-400" role="alert">
              {parseError}
            </p>
          )}
        </div>

        {/* Demo selector */}
        <div className="space-y-1.5">
          <label htmlFor="demo-select" className="block text-xs font-medium text-[#94A3B8]">
            Active Match Demo
          </label>
          <div className="relative">
            <select
              id="demo-select"
              value={activeDemo.id}
              onChange={(e) => onSelectDemo(e.target.value)}
              className="w-full appearance-none rounded-md bg-[#141B27] border border-white/[0.1] px-3 py-2 pr-8 text-xs font-medium text-[#F1F5F9] focus:border-[#E5A93B] focus:outline-none"
            >
              {demos.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#121721]">
                  {d.matchLabel}
                </option>
              ))}
            </select>
            <FolderOpen className="w-3.5 h-3.5 text-[#94A3B8] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Player Focus filter */}
        <div className="space-y-1.5">
          <label htmlFor="player-select" className="block text-xs font-medium text-[#94A3B8]">
            Focus Player
          </label>
          <select
            id="player-select"
            value={selectedPlayer}
            onChange={(e) => onSelectPlayer(e.target.value)}
            className="w-full rounded-md bg-[#141B27] border border-white/[0.1] px-3 py-2 text-xs font-medium text-[#F1F5F9] focus:border-[#E5A93B] focus:outline-none"
          >
            <option value="ALL" className="bg-[#121721]">
              All Players ({activeDemo.highlights.length} clips)
            </option>
            {activeDemo.players.map((p) => {
              const count = activeDemo.highlights.filter((h) => h.playerName === p.name).length;
              return (
                <option key={p.id} value={p.name} className="bg-[#121721]">
                  {p.name} ({p.team}) — {count} {count === 1 ? 'highlight' : 'highlights'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="px-4 py-3 border-b border-white/[0.08]">
        <div className="flex flex-wrap gap-1 p-1 rounded-md bg-[#0B0E14] border border-white/[0.06]">
          {CATEGORY_TABS.map((tab) => {
            const active = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectCategory(tab.id)}
                className={`flex-1 min-w-[44px] px-2 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
                  active
                    ? 'bg-[#1D2534] text-[#F8FAFC]'
                    : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detected Highlights List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
        {filteredClips.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm font-medium text-[#CBD5E1]">No matching highlights</p>
            <p className="text-xs text-[#94A3B8]">
              Try switching the player or category filter to view all detected clips.
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectPlayer('ALL');
                onSelectCategory('ALL');
              }}
              className="mt-2 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1A2231] text-[#F1F5F9] hover:bg-[#232E42] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredClips.map((clip) => {
            const isSelected = clip.id === activeClipId;
            const hsCount = clip.kills.filter((k) => k.headshot).length;
            const dur = getClipTotalDuration(clip, overlay);

            return (
              <div
                key={clip.id}
                className={`group flex items-start gap-3 px-4 py-3.5 transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#182030]' : 'hover:bg-[#141B27]'
                }`}
                onClick={() => onSelectClip(clip.id)}
              >
                {/* Reel inclusion checkbox */}
                <button
                  type="button"
                  aria-label={
                    clip.includedInReel
                      ? `Remove ${clip.title} from montage reel`
                      : `Add ${clip.title} to montage reel`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReelInclude(clip.id);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
                    clip.includedInReel
                      ? 'bg-[#E5A93B] border-[#E5A93B] text-[#0B0E14]'
                      : 'border-white/25 bg-transparent hover:border-white/50'
                  }`}
                >
                  {clip.includedInReel && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                {/* Clip details — Zero-pill clean unboxed metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-[#E5A93B]' : 'text-[#F1F5F9]'
                      }`}
                    >
                      {clip.title}
                    </p>
                    <span className="font-mono-tabular text-xs text-[#94A3B8] shrink-0">
                      {dur.toFixed(1)}s
                    </span>
                  </div>

                  <div className="mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-[#94A3B8]">
                    <span className={clip.playerTeam === 'CT' ? 'text-[#5B9BD5] font-medium' : 'text-[#E5A93B] font-medium'}>
                      {clip.playerName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">R{clip.roundNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular">{clip.kills.length}K ({hsCount} HS)</span>
                    <span aria-hidden="true">·</span>
                    <span>{clip.primaryWeapon}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clean Reel Queue Summary Footer */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0D1119] flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">Montage Reel Queue</span>
        <span className="font-mono-tabular font-medium text-[#F1F5F9]">
          {reelClips.length} {reelClips.length === 1 ? 'clip' : 'clips'} · {totalReelSec.toFixed(1)}s
        </span>
      </div>
    </aside>
  );
}
