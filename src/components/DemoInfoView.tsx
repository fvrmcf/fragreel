import { formatMapDisplayName } from '../data/mapLayouts';
import { ParsedDemo } from '../types/demo';

interface DemoInfoViewProps {
  demo: ParsedDemo;
  onFilterByPlayer: (playerName: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export function DemoInfoView({ demo, onFilterByPlayer }: DemoInfoViewProps) {
  const ctPlayers = demo.players.filter((p) => p.team === 'CT').sort((a, b) => b.kills - a.kills);
  const tPlayers = demo.players.filter((p) => p.team === 'T').sort((a, b) => b.kills - a.kills);

  const renderTeamTable = (teamName: string, side: 'CT' | 'T', roster: ParsedDemo['players']) => (
    <div className="rounded-lg border border-white/[0.08] bg-[#10151E] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#0D121A] flex items-center justify-between">
        <span
          className={`font-display text-lg font-bold tracking-wide ${
            side === 'CT' ? 'text-[#5B9BD5]' : 'text-[#E5A93B]'
          }`}
        >
          {teamName}
        </span>
        <span className="font-mono-tabular text-sm font-semibold text-[#F8FAFC]">
          Score: {side === 'CT' ? demo.scoreCT : demo.scoreT}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs font-medium text-[#94A3B8]">
              <th className="py-2.5 px-4">Player</th>
              <th className="py-2.5 px-3 text-right">K / D / A</th>
              <th className="py-2.5 px-3 text-right">ADR</th>
              <th className="py-2.5 px-3 text-right">HS%</th>
              <th className="py-2.5 px-3 text-right">Multi-Kills</th>
              <th className="py-2.5 px-3 text-right">Clutches</th>
              <th className="py-2.5 px-4 text-right">Highlights</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-sm">
            {roster.map((p) => {
              const clipCount = demo.highlights.filter((h) => h.playerName === p.name).length;
              return (
                <tr key={p.id} className="hover:bg-[#161E2C] transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-[#F8FAFC]">{p.name}</div>
                    <div className="font-mono-tabular text-[11px] text-[#64748B]">{p.steamId}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-[#E2E8F0]">
                    {p.kills} / {p.deaths} / {p.assists}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-[#E2E8F0]">
                    {p.adr.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-[#CBD5E1]">
                    {p.hsPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-[#CBD5E1]">
                    {p.multiKills}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-[#CBD5E1]">
                    {p.clutchesWon}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {clipCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => onFilterByPlayer(p.name)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-[#1C2636] text-[#E5A93B] hover:bg-[#263348] transition-colors whitespace-nowrap"
                      >
                        View {clipCount} {clipCount === 1 ? 'Clip' : 'Clips'}
                      </button>
                    ) : (
                      <span className="font-mono-tabular text-xs text-[#64748B]">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="pb-5 border-b border-white/[0.08]">
          <h1 className="font-display text-3xl font-bold tracking-wide text-[#F8FAFC]">
            Demo Header & Match Scoreboard
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8] font-mono-tabular">
            {demo.fileName} · {demo.format} · {formatBytes(demo.fileSizeBytes)}
          </p>
        </div>

        {/* Parsed Header Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-4">
            <div className="text-xs text-[#94A3B8]">Map</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
              {formatMapDisplayName(demo.mapName)}
            </div>
            <div className="text-xs font-mono-tabular text-[#64748B] mt-0.5">{demo.mapName}</div>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-4">
            <div className="text-xs text-[#94A3B8]">Final Score</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#F8FAFC]">
              <span className="text-[#5B9BD5]">{demo.scoreCT}</span>
              <span className="mx-1.5 text-[#64748B]">–</span>
              <span className="text-[#E5A93B]">{demo.scoreT}</span>
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">CT vs T</div>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-4">
            <div className="text-xs text-[#94A3B8]">Match Length</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#F8FAFC]">
              {formatDuration(demo.durationSec)}
            </div>
            <div className="text-xs font-mono-tabular text-[#64748B] mt-0.5">
              {demo.totalTicks.toLocaleString()} ticks · {demo.tickRate} sub-tick
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-4">
            <div className="text-xs text-[#94A3B8]">Detected Highlights</div>
            <div className="mt-1 font-mono-tabular text-2xl font-bold text-[#E5A93B]">
              {demo.highlights.length}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5 truncate">{demo.serverName}</div>
          </div>
        </div>

        {/* Parser Verification Log */}
        <div className="rounded-lg border border-white/[0.08] bg-[#10151E] p-5 space-y-2">
          <h2 className="text-xs font-semibold text-[#CBD5E1]">Parser Inspection Summary</h2>
          <ul className="space-y-1.5 text-sm text-[#94A3B8]">
            {demo.parseNotes.map((note, idx) => (
              <li key={idx} className="font-mono-tabular text-xs leading-relaxed">
                {idx + 1}. {note}
              </li>
            ))}
          </ul>
        </div>

        {/* Scoreboards */}
        <div className="space-y-5">
          {renderTeamTable('Counter-Terrorists', 'CT', ctPlayers)}
          {renderTeamTable('Terrorists', 'T', tPlayers)}
        </div>
      </div>
    </div>
  );
}
