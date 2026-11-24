import { Download } from 'lucide-react';
import { ActiveTab } from '../types/demo';

interface TopBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenExport: () => void;
  hasClips: boolean;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'demo-info', label: 'Demo Info' },
  { id: 'script', label: 'CS2 Script' },
];

export function TopBar({ activeTab, onTabChange, onOpenExport, hasClips }: TopBarProps) {
  return (
    <header className="h-14 shrink-0 border-b border-white/[0.08] bg-[#0E121A] px-6 flex items-center justify-between gap-8">
      {/* Zone 1: Single text element wordmark */}
      <button
        type="button"
        onClick={() => onTabChange('highlights')}
        className="font-display text-2xl font-bold tracking-wide text-[#F8FAFC] hover:text-[#E5A93B] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] rounded"
      >
        FragReel
      </button>

      {/* Zone 2: 4 single-line navigation links */}
      <nav aria-label="Primary workspace navigation" className="flex items-center gap-6 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`relative h-14 px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
                isActive ? 'text-[#F8FAFC]' : 'text-[#94A3B8] hover:text-[#E2E8F0]'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#E5A93B]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action button */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          disabled={!hasClips}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#E5A93B] text-[#0B0E14] hover:bg-[#EEB954] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E121A]"
        >
          <Download className="w-4 h-4 shrink-0" />
          Export Video
        </button>
      </div>
    </header>
  );
}
