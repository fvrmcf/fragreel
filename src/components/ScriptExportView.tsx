import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { HighlightClip, ParsedDemo } from '../types/demo';
import { generateCS2HighlightScript } from '../utils/hlaeScriptGenerator';

interface ScriptExportViewProps {
  demo: ParsedDemo;
  reelClips: HighlightClip[];
}

export function ScriptExportView({ demo, reelClips }: ScriptExportViewProps) {
  const [useHlaeMirv, setUseHlaeMirv] = useState(true);
  const [fps, setFps] = useState(60);
  const [hideHudExceptKillfeed, setHideHudExceptKillfeed] = useState(true);
  const [includeXray, setIncludeXray] = useState(false);
  const [copied, setCopied] = useState(false);

  const clipsToScript = reelClips.length > 0 ? reelClips : demo.highlights;
  const scriptContent = generateCS2HighlightScript(demo, clipsToScript, {
    demoFileName: demo.fileName,
    fps,
    hideHudExceptKillfeed,
    useHlaeMirv,
    includeXray,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors in sandboxed iframes
    }
  };

  const handleDownloadCfg = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fragreel_${demo.mapName}_highlights.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E14] p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-wide text-[#F8FAFC]">
              CS2 In-Engine Recording Script
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Generate a ready-to-run Counter-Strike 2 console or HLAE <code className="font-mono text-[#E2E8F0]">mirv_cmd</code> config to jump straight to every highlight tick in native 3D.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#182030] border border-white/[0.1] text-xs font-semibold text-[#F8FAFC] hover:bg-[#222D42] transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 text-[#E5A93B]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Script'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCfg}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#E5A93B] text-[#0B0E14] text-xs font-semibold hover:bg-[#EEB954] transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Download .cfg
            </button>
          </div>
        </div>

        {/* Options bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-lg border border-white/[0.08] bg-[#10151E] p-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Script Mode</label>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded bg-[#0B0E14] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setUseHlaeMirv(true)}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${
                  useHlaeMirv ? 'bg-[#1D2534] text-[#F8FAFC]' : 'text-[#94A3B8]'
                }`}
              >
                HLAE Auto
              </button>
              <button
                type="button"
                onClick={() => setUseHlaeMirv(false)}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${
                  !useHlaeMirv ? 'bg-[#1D2534] text-[#F8FAFC]' : 'text-[#94A3B8]'
                }`}
              >
                CS2 Console
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#94A3B8]">Capture FPS</label>
            <div className="grid grid-cols-3 gap-1 p-0.5 rounded bg-[#0B0E14] border border-white/[0.08]">
              {[60, 120, 300].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFps(val)}
                  className={`py-1.5 rounded text-xs font-mono-tabular transition-colors ${
                    fps === val ? 'bg-[#1D2534] text-[#F8FAFC]' : 'text-[#94A3B8]'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[#0D121A] border border-white/[0.06] cursor-pointer">
            <span className="text-xs text-[#CBD5E1]">Killfeed-Only HUD</span>
            <input
              type="checkbox"
              checked={hideHudExceptKillfeed}
              onChange={(e) => setHideHudExceptKillfeed(e.target.checked)}
              className="accent-[#E5A93B] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[#0D121A] border border-white/[0.06] cursor-pointer">
            <span className="text-xs text-[#CBD5E1]">Enable X-Ray</span>
            <input
              type="checkbox"
              checked={includeXray}
              onChange={(e) => setIncludeXray(e.target.checked)}
              className="accent-[#E5A93B] w-4 h-4"
            />
          </label>
        </div>

        {/* Code Preview */}
        <div className="rounded-lg border border-white/[0.08] bg-[#0D1119] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="font-mono-tabular">fragreel_{demo.mapName}_highlights.cfg</span>
            <span className="font-mono-tabular">{clipsToScript.length} highlight tick ranges</span>
          </div>
          <pre className="p-4 text-xs font-mono-tabular text-[#CBD5E1] overflow-x-auto leading-relaxed max-h-[480px]">
            {scriptContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
