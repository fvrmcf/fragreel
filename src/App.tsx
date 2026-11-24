import { useEffect, useMemo, useState } from 'react';
import { DemoInfoView } from './components/DemoInfoView';
import { ExportModal } from './components/ExportModal';
import { InspectorPanel } from './components/InspectorPanel';
import { PreviewPlayer } from './components/PreviewPlayer';
import { ScriptExportView } from './components/ScriptExportView';
import { Sidebar } from './components/Sidebar';
import { TimelineView } from './components/TimelineView';
import { TopBar } from './components/TopBar';
import { getMapLayout } from './data/mapLayouts';
import { SAMPLE_DEMOS } from './data/sampleDemos';
import {
  ActiveTab,
  ExportSettings,
  HighlightCategory,
  HighlightClip,
  OverlaySettings,
  ParsedDemo,
} from './types/demo';
import { parseCS2DemoFile } from './utils/cs2DemoParser';

export default function App() {
  const [demos, setDemos] = useState<ParsedDemo[]>(SAMPLE_DEMOS);
  const [activeDemoId, setActiveDemoId] = useState<string>(SAMPLE_DEMOS[0].id);
  const [activeTab, setActiveTab] = useState<ActiveTab>('highlights');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | HighlightCategory>('ALL');
  const [activeClipId, setActiveClipId] = useState<string | null>(
    SAMPLE_DEMOS[0].highlights[0]?.id ?? null
  );

  const [isParsingDemo, setIsParsingDemo] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [gameplayVideoUrl, setGameplayVideoUrl] = useState<string | null>(null);
  const [gameplayVideoName, setGameplayVideoName] = useState<string | null>(null);
  const [backdropImage, setBackdropImage] = useState<HTMLImageElement | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [overlay, setOverlay] = useState<OverlaySettings>({
    visualMode: 'tactical',
    showIntroCard: true,
    showKillfeed: true,
    showScoreboard: true,
    showPlayerHud: true,
    showStreakBanner: true,
    showCinemaBars: false,
    enableAudio: true,
    slowMoFinalKill: true,
    accentTheme: 'gold',
  });

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    scope: 'selected',
    aspectRatio: '16:9',
    resolution: '1080p',
    fps: 60,
    format: 'auto-mp4',
    bitrateMbps: 12,
  });

  const activeDemo = useMemo(
    () => demos.find((d) => d.id === activeDemoId) || demos[0],
    [demos, activeDemoId]
  );

  // Preload atmospheric backdrop image whenever the active demo map changes
  useEffect(() => {
    const layout = getMapLayout(activeDemo.mapName);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setBackdropImage(img);
    img.onerror = () => setBackdropImage(null);
    img.src = layout.backdropImage;
  }, [activeDemo.mapName]);

  // Revoke attached gameplay video URL on unmount
  useEffect(() => {
    return () => {
      if (gameplayVideoUrl) URL.revokeObjectURL(gameplayVideoUrl);
    };
  }, [gameplayVideoUrl]);

  const filteredClips = useMemo(() => {
    return activeDemo.highlights.filter((clip) => {
      if (selectedPlayer !== 'ALL' && clip.playerName !== selectedPlayer) return false;
      if (selectedCategory !== 'ALL' && clip.category !== selectedCategory) return false;
      return true;
    });
  }, [activeDemo.highlights, selectedPlayer, selectedCategory]);

  const reelClips = useMemo(
    () => activeDemo.highlights.filter((c) => c.includedInReel),
    [activeDemo.highlights]
  );

  // Ensure activeClipId always points to a valid clip in the current filtered list
  useEffect(() => {
    if (filteredClips.length === 0) {
      setActiveClipId(null);
      return;
    }
    if (!activeClipId || !filteredClips.some((c) => c.id === activeClipId)) {
      setActiveClipId(filteredClips[0].id);
    }
  }, [filteredClips, activeClipId]);

  const activeClip = useMemo(
    () => filteredClips.find((c) => c.id === activeClipId) || filteredClips[0] || null,
    [filteredClips, activeClipId]
  );

  const activeClipIndex = activeClip
    ? filteredClips.findIndex((c) => c.id === activeClip.id)
    : -1;

  const handleSelectDemo = (demoId: string) => {
    setActiveDemoId(demoId);
    setSelectedPlayer('ALL');
    setSelectedCategory('ALL');
    const target = demos.find((d) => d.id === demoId);
    setActiveClipId(target?.highlights[0]?.id ?? null);
  };

  const handleUploadDemoFile = async (file: File) => {
    setIsParsingDemo(true);
    setParseError(null);
    try {
      const parsed = await parseCS2DemoFile(file);
      setDemos((prev) => [parsed, ...prev]);
      setActiveDemoId(parsed.id);
      setSelectedPlayer('ALL');
      setSelectedCategory('ALL');
      setActiveClipId(parsed.highlights[0]?.id ?? null);
      setActiveTab('highlights');
    } catch (err) {
      setParseError(
        err instanceof Error ? err.message : 'Unable to parse the selected demo file.'
      );
    } finally {
      setIsParsingDemo(false);
    }
  };

  const handleToggleReelInclude = (clipId: string) => {
    setDemos((prev) =>
      prev.map((d) => {
        if (d.id !== activeDemo.id) return d;
        return {
          ...d,
          highlights: d.highlights.map((c) =>
            c.id === clipId ? { ...c, includedInReel: !c.includedInReel } : c
          ),
        };
      })
    );
  };

  const handleUpdateClipTrim = (
    clipId: string,
    patch: Partial<Pick<HighlightClip, 'preRollSec' | 'postRollSec' | 'videoSyncOffsetSec'>>
  ) => {
    setDemos((prev) =>
      prev.map((d) => {
        if (d.id !== activeDemo.id) return d;
        return {
          ...d,
          highlights: d.highlights.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
        };
      })
    );
  };

  const handleReorderClip = (clipId: string, direction: 'up' | 'down') => {
    setDemos((prev) =>
      prev.map((d) => {
        if (d.id !== activeDemo.id) return d;
        const idx = d.highlights.findIndex((c) => c.id === clipId);
        if (idx === -1) return d;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= d.highlights.length) return d;
        const next = [...d.highlights];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        return { ...d, highlights: next };
      })
    );
  };

  const handleAttachGameplayVideo = (file: File) => {
    if (gameplayVideoUrl) URL.revokeObjectURL(gameplayVideoUrl);
    const url = URL.createObjectURL(file);
    setGameplayVideoUrl(url);
    setGameplayVideoName(file.name);
    setOverlay((prev) => ({ ...prev, visualMode: 'video' }));
  };

  const handleClearGameplayVideo = () => {
    if (gameplayVideoUrl) URL.revokeObjectURL(gameplayVideoUrl);
    setGameplayVideoUrl(null);
    setGameplayVideoName(null);
    setOverlay((prev) => ({ ...prev, visualMode: 'tactical' }));
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#0B0E14] text-[#F1F5F9] overflow-x-hidden">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenExport={() => setIsExportModalOpen(true)}
        hasClips={activeDemo.highlights.length > 0}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {activeTab === 'highlights' && (
          <>
            <Sidebar
              demos={demos}
              activeDemo={activeDemo}
              onSelectDemo={handleSelectDemo}
              onUploadDemoFile={handleUploadDemoFile}
              isParsingDemo={isParsingDemo}
              parseError={parseError}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              filteredClips={filteredClips}
              activeClipId={activeClip?.id ?? null}
              onSelectClip={setActiveClipId}
              onToggleReelInclude={handleToggleReelInclude}
              overlay={overlay}
            />

            <PreviewPlayer
              clip={activeClip}
              mapName={activeDemo.mapName}
              players={activeDemo.players}
              overlay={overlay}
              aspectRatio={exportSettings.aspectRatio}
              backdropImage={backdropImage}
              gameplayVideoUrl={gameplayVideoUrl}
              hasPrev={activeClipIndex > 0}
              hasNext={activeClipIndex >= 0 && activeClipIndex < filteredClips.length - 1}
              onPrevClip={() => {
                if (activeClipIndex > 0) {
                  setActiveClipId(filteredClips[activeClipIndex - 1].id);
                }
              }}
              onNextClip={() => {
                if (activeClipIndex >= 0 && activeClipIndex < filteredClips.length - 1) {
                  setActiveClipId(filteredClips[activeClipIndex + 1].id);
                }
              }}
            />

            <InspectorPanel
              activeClip={activeClip}
              reelClips={reelClips}
              overlay={overlay}
              onChangeOverlay={(patch) => setOverlay((prev) => ({ ...prev, ...patch }))}
              exportSettings={exportSettings}
              onChangeExportSettings={(patch) =>
                setExportSettings((prev) => ({ ...prev, ...patch }))
              }
              onUpdateClipTrim={handleUpdateClipTrim}
              gameplayVideoName={gameplayVideoName}
              onAttachGameplayVideo={handleAttachGameplayVideo}
              onClearGameplayVideo={handleClearGameplayVideo}
              onStartExport={() => setIsExportModalOpen(true)}
            />
          </>
        )}

        {activeTab === 'timeline' && (
          <TimelineView
            clips={activeDemo.highlights}
            overlay={overlay}
            onToggleReelInclude={handleToggleReelInclude}
            onReorderClip={handleReorderClip}
            onUpdateClipTrim={handleUpdateClipTrim}
            onPreviewClip={(clipId) => {
              setSelectedPlayer('ALL');
              setSelectedCategory('ALL');
              setActiveClipId(clipId);
              setActiveTab('highlights');
            }}
            onExportReel={() => {
              setExportSettings((prev) => ({ ...prev, scope: 'reel' }));
              setIsExportModalOpen(true);
            }}
          />
        )}

        {activeTab === 'demo-info' && (
          <DemoInfoView
            demo={activeDemo}
            onFilterByPlayer={(playerName) => {
              setSelectedPlayer(playerName);
              setSelectedCategory('ALL');
              setActiveTab('highlights');
            }}
          />
        )}

        {activeTab === 'script' && (
          <ScriptExportView demo={activeDemo} reelClips={reelClips} />
        )}
      </main>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeClip={activeClip}
        reelClips={reelClips}
        mapName={activeDemo.mapName}
        players={activeDemo.players}
        overlay={overlay}
        exportSettings={exportSettings}
        onChangeExportSettings={(patch) =>
          setExportSettings((prev) => ({ ...prev, ...patch }))
        }
        backdropImage={backdropImage}
        gameplayVideoUrl={gameplayVideoUrl}
      />
    </div>
  );
}
