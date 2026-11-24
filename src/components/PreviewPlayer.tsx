import React, { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DemoPlayer,
  ExportSettings,
  HighlightClip,
  OverlaySettings,
} from '../types/demo';
import { CS2AudioEngine } from '../utils/audioEngine';
import {
  getActionTime,
  getClipTotalDuration,
  INTRO_CARD_DURATION,
  renderHighlightFrame,
} from '../utils/canvasRenderer';

interface PreviewPlayerProps {
  clip: HighlightClip | null;
  mapName: string;
  players: DemoPlayer[];
  overlay: OverlaySettings;
  aspectRatio: ExportSettings['aspectRatio'];
  backdropImage: HTMLImageElement | null;
  gameplayVideoUrl: string | null;
  onPrevClip: () => void;
  onNextClip: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function formatTimecode(sec: number): string {
  const clamped = Math.max(0, sec);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  const tenths = Math.floor((clamped % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function PreviewPlayer({
  clip,
  mapName,
  players,
  overlay,
  aspectRatio,
  backdropImage,
  gameplayVideoUrl,
  onPrevClip,
  onNextClip,
  hasPrev,
  hasNext,
}: PreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<CS2AudioEngine | null>(null);
  const triggeredKillsRef = useRef<Set<string>>(new Set());
  const introPlayedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [isMuted, setIsMuted] = useState(false);

  const totalDuration = clip ? getClipTotalDuration(clip, overlay) : 0;
  const playerStats = clip ? players.find((p) => p.name === clip.playerName) : undefined;

  // Compute preview canvas internal dimensions matching selected export aspect ratio
  const canvasWidth = aspectRatio === '9:16' ? 540 : aspectRatio === '1:1' ? 760 : 1280;
  const canvasHeight = aspectRatio === '9:16' ? 960 : aspectRatio === '1:1' ? 760 : 720;

  // Reset playhead when switching clips
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    triggeredKillsRef.current.clear();
    introPlayedRef.current = false;
    if (videoRef.current && clip) {
      videoRef.current.pause();
      if (videoRef.current.readyState >= 1) {
        videoRef.current.currentTime = Math.max(0, clip.videoSyncOffsetSec);
      }
    }
  }, [clip?.id]);

  // Sync audio mute state
  useEffect(() => {
    audioRef.current?.setMuted(isMuted || !overlay.enableAudio);
    if (videoRef.current) {
      videoRef.current.muted = isMuted || !overlay.enableAudio;
    }
  }, [isMuted, overlay.enableAudio]);

  // Dispose audio engine on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  // Main animation playback loop
  useEffect(() => {
    if (!clip || !isPlaying) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.06, (now - lastTs) / 1000);
      lastTs = now;

      setCurrentTime((prev) => {
        const actionNow = getActionTime(prev, clip, overlay);
        const finalKill = clip.kills[clip.kills.length - 1];
        const inSlowMo =
          overlay.slowMoFinalKill &&
          finalKill &&
          actionNow >= finalKill.timeOffset - 0.5 &&
          actionNow <= finalKill.timeOffset + 0.75;

        const effectiveSpeed = playbackSpeed * (inSlowMo ? 0.5 : 1);
        const next = prev + dt * effectiveSpeed;

        // Fire live SFX when audio is enabled
        if (overlay.enableAudio && !isMuted) {
          if (!audioRef.current) {
            audioRef.current = new CS2AudioEngine();
            audioRef.current.init(false);
          }
          if (overlay.showIntroCard && !introPlayedRef.current && next > 0.04) {
            introPlayedRef.current = true;
            audioRef.current.playIntroWhoosh();
          }
          const nextAction = getActionTime(next, clip, overlay);
          clip.kills.forEach((k, idx) => {
            if (nextAction >= k.timeOffset && !triggeredKillsRef.current.has(k.id)) {
              triggeredKillsRef.current.add(k.id);
              audioRef.current?.playKillSound(k.weapon, k.headshot, idx + 1);
            }
          });
        }

        if (next >= totalDuration) {
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          return totalDuration;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [clip, isPlaying, playbackSpeed, overlay, totalDuration, isMuted]);

  // Keep external gameplay video synchronized when in video mode
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !clip || overlay.visualMode !== 'video' || !gameplayVideoUrl) return;

    const introDur = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
    const targetVideoSec = Math.max(0, clip.videoSyncOffsetSec + Math.max(0, currentTime - introDur));

    if (isPlaying && currentTime >= introDur) {
      if (vid.paused) {
        vid.currentTime = Math.min(targetVideoSec, Math.max(0, (vid.duration || 9999) - 0.2));
        void vid.play().catch(() => {});
      }
      vid.playbackRate = playbackSpeed;
    } else {
      if (!vid.paused) vid.pause();
      if (vid.readyState >= 1 && Math.abs(vid.currentTime - targetVideoSec) > 0.2) {
        vid.currentTime = Math.min(targetVideoSec, Math.max(0, (vid.duration || 9999) - 0.2));
      }
    }
  }, [isPlaying, currentTime, clip, overlay.visualMode, overlay.showIntroCard, gameplayVideoUrl, playbackSpeed]);

  // Draw current frame onto the preview canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    renderHighlightFrame({
      ctx,
      width: canvasWidth,
      height: canvasHeight,
      clip,
      mapName,
      playerStats,
      clipTime: currentTime,
      overlay,
      backdropImage,
      gameplayVideo: videoRef.current,
    });
  }, [clip, mapName, playerStats, currentTime, overlay, canvasWidth, canvasHeight, backdropImage, gameplayVideoUrl]);

  const handleTogglePlay = () => {
    if (!clip) return;
    if (!audioRef.current && overlay.enableAudio && !isMuted) {
      audioRef.current = new CS2AudioEngine();
      audioRef.current.init(false);
    }
    if (currentTime >= totalDuration - 0.05) {
      triggeredKillsRef.current.clear();
      introPlayedRef.current = false;
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const handleSeek = (sec: number) => {
    if (!clip) return;
    const clamped = Math.max(0, Math.min(totalDuration, sec));
    setCurrentTime(clamped);
    // Mark kills before the seek point as already triggered so scrubbing doesn't replay old gunshots
    const actionAtSeek = getActionTime(clamped, clip, overlay);
    triggeredKillsRef.current = new Set(
      clip.kills.filter((k) => k.timeOffset <= actionAtSeek).map((k) => k.id)
    );
    introPlayedRef.current = clamped > 0.2;
  };

  const handleRestart = () => {
    triggeredKillsRef.current.clear();
    introPlayedRef.current = false;
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleJumpToKill = (timeOffset: number) => {
    if (!clip) return;
    const intro = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
    const lead = Math.max(0, clip.preRollSec - 1.2);
    const target = Math.max(0, intro + lead + timeOffset - 0.65);
    handleSeek(target);
    setIsPlaying(true);
  };

  if (!clip) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-2">
          <p className="text-base font-semibold text-[#F1F5F9]">No highlight selected</p>
          <p className="text-sm text-[#94A3B8]">
            Choose a highlight from the left panel or load a CS2 .dem file to begin previewing.
          </p>
        </div>
      </div>
    );
  }

  const currentActionTime = getActionTime(currentTime, clip, overlay);
  const currentTick = clip.startTick + Math.round(Math.max(0, currentActionTime) * 64);
  const introOffset = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
  const leadOffset = Math.max(0, clip.preRollSec - 1.2);

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-[#0B0E14] overflow-y-auto">
      {/* Hidden source video element when user attaches real gameplay recording */}
      {gameplayVideoUrl && (
        <video
          ref={videoRef}
          src={gameplayVideoUrl}
          playsInline
          preload="auto"
          className="hidden"
        />
      )}

      {/* Active Clip Header Bar */}
      <div className="px-6 py-3.5 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-wide text-[#F8FAFC] truncate">
            {clip.title}
          </h1>
          <div className="mt-0.5 flex items-center flex-wrap gap-x-2 text-xs text-[#94A3B8]">
            <span className={clip.playerTeam === 'CT' ? 'text-[#5B9BD5] font-semibold' : 'text-[#E5A93B] font-semibold'}>
              {clip.playerName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{mapName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Round {clip.roundNumber} ({clip.ctScore}–{clip.tScore})
            </span>
            <span aria-hidden="true">·</span>
            <span>{clip.primaryWeapon}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono-tabular text-[#94A3B8] shrink-0">
          <span>Tick {currentTick.toLocaleString()}</span>
          <span aria-hidden="true">/</span>
          <span>{aspectRatio} Preview</span>
        </div>
      </div>

      {/* Main Preview Monitor Canvas Stage */}
      <div className="flex-1 min-h-[340px] flex items-center justify-center p-5 bg-[#080B10]">
        <div
          className="relative rounded-lg overflow-hidden border border-white/[0.1] bg-[#090C11] shadow-2xl cursor-pointer group"
          style={{
            aspectRatio:
              aspectRatio === '9:16' ? '9 / 16' : aspectRatio === '1:1' ? '1 / 1' : '16 / 9',
            maxHeight: aspectRatio === '9:16' ? '520px' : '500px',
            width: aspectRatio === '9:16' ? 'auto' : '100%',
            maxWidth: aspectRatio === '9:16' ? '300px' : aspectRatio === '1:1' ? '500px' : '890px',
          }}
          onClick={handleTogglePlay}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-full block object-contain"
          />

          {/* Subtle center play button affordance when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-[#0B0E14]/85 border border-white/20 flex items-center justify-center text-[#F8FAFC] group-hover:border-[#E5A93B] group-hover:text-[#E5A93B] transition-colors">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Playback Transport & Interactive Kill-Marker Scrubber */}
      <div className="px-6 py-4 border-t border-white/[0.08] bg-[#10151E] space-y-4">
        {/* Timeline Track */}
        <div className="space-y-1.5">
          <div className="relative h-9 flex items-center select-none">
            {/* Base track */}
            <div className="w-full h-2 rounded bg-[#1B2332] relative overflow-hidden">
              {/* Intro slate zone */}
              {overlay.showIntroCard && totalDuration > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-white/[0.12]"
                  style={{ width: `${(INTRO_CARD_DURATION / totalDuration) * 100}%` }}
                />
              )}
              {/* Played progress fill */}
              <div
                className="absolute inset-y-0 left-0 bg-[#E5A93B]"
                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              />
            </div>

            {/* Kill event markers plotted accurately on the timeline */}
            {clip.kills.map((k, idx) => {
              const killClipTime = introOffset + leadOffset + k.timeOffset;
              const pct = totalDuration > 0 ? Math.min(99, Math.max(1, (killClipTime / totalDuration) * 100)) : 0;
              return (
                <button
                  key={k.id}
                  type="button"
                  title={`Kill #${idx + 1}: ${k.victimName} (${k.weapon}${k.headshot ? ', Headshot' : ''}) at ${k.callout}`}
                  onClick={() => handleJumpToKill(k.timeOffset)}
                  style={{ left: `${pct}%` }}
                  className={`absolute -translate-x-1/2 -top-0.5 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    k.headshot
                      ? 'bg-[#EF4444] border-[#0B0E14] text-white'
                      : 'bg-[#E5A93B] border-[#0B0E14] text-[#0B0E14]'
                  }`}
                >
                  <span className="text-[9px] font-bold leading-none">{idx + 1}</span>
                </button>
              );
            })}

            {/* Interactive range overlay for smooth scrubbing */}
            <input
              type="range"
              aria-label="Highlight timeline scrubber"
              min={0}
              max={totalDuration || 1}
              step={0.05}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#94A3B8]">
            <span>{formatTimecode(currentTime)}</span>
            <span>
              {overlay.showIntroCard ? 'Intro Slate · ' : ''}
              {clip.kills.length} Kill Markers (Click number to jump)
            </span>
            <span>{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Transport Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevClip}
              disabled={!hasPrev}
              aria-label="Previous highlight"
              className="p-2 rounded-md bg-[#171F2E] text-[#E2E8F0] hover:bg-[#222D40] disabled:opacity-35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#E5A93B] text-[#0B0E14] font-semibold text-xs hover:bg-[#EEB954] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Play Preview'}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart clip"
              className="p-2 rounded-md bg-[#171F2E] text-[#E2E8F0] hover:bg-[#222D40] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onNextClip}
              disabled={!hasNext}
              aria-label="Next highlight"
              className="p-2 rounded-md bg-[#171F2E] text-[#E2E8F0] hover:bg-[#222D40] disabled:opacity-35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed & Audio controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#0B0E14] border border-white/[0.08]">
              {([0.5, 1, 1.5] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded text-xs font-mono-tabular transition-colors whitespace-nowrap ${
                    playbackSpeed === spd
                      ? 'bg-[#1D2534] text-[#F8FAFC] font-medium'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="p-2 rounded-md bg-[#171F2E] text-[#E2E8F0] hover:bg-[#222D40] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B]"
            >
              {isMuted || !overlay.enableAudio ? (
                <VolumeX className="w-4 h-4 text-[#94A3B8]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#E5A93B]" />
              )}
            </button>
          </div>
        </div>

        {/* Interactive Kill Breakdown Strip */}
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#94A3B8]">Detected Frags in Sequence</span>
            <span className="text-xs font-mono-tabular text-[#64748B]">
              Click any frag to jump to moment
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {clip.kills.map((k, idx) => {
              const reached = currentActionTime >= k.timeOffset;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => handleJumpToKill(k.timeOffset)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5A93B] ${
                    reached
                      ? 'bg-[#172030] border-[#E5A93B]/40 text-[#F8FAFC]'
                      : 'bg-[#0E131C] border-white/[0.06] text-[#CBD5E1] hover:border-white/[0.18]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
                      <span className="font-mono-tabular text-[#E5A93B]">#{idx + 1}</span>
                      <span className="truncate">{k.victimName}</span>
                      {k.headshot && (
                        <Crosshair className="w-3.5 h-3.5 text-[#EF4444] shrink-0" aria-label="Headshot" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] truncate">
                      {k.weapon} · {k.callout}
                      {k.throughSmoke ? ' · Smoke' : ''}
                      {k.wallbang ? ' · Wallbang' : ''}
                      {k.noScope ? ' · No-Scope' : ''}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-[#94A3B8] shrink-0">
                    +{k.timeOffset.toFixed(1)}s
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
