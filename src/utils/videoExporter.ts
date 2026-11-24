import {
  DemoPlayer,
  ExportedVideoResult,
  ExportProgress,
  ExportSettings,
  HighlightClip,
  OverlaySettings,
} from '../types/demo';
import { CS2AudioEngine } from './audioEngine';
import { getActionTime, getClipTotalDuration, renderHighlightFrame } from './canvasRenderer';

export interface FormatChoice {
  id: ExportSettings['format'];
  label: string;
  mimeType: string;
  extension: string;
  supported: boolean;
}

export function getExportDimensions(
  aspectRatio: ExportSettings['aspectRatio'],
  resolution: ExportSettings['resolution']
): { width: number; height: number } {
  const is1080 = resolution === '1080p';
  if (aspectRatio === '9:16') {
    return is1080 ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
  }
  if (aspectRatio === '1:1') {
    return is1080 ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
  }
  return is1080 ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
}

export function resolveRecorderMime(preferred: ExportSettings['format']): {
  mimeType: string;
  extension: string;
  label: string;
} {
  const isSupported = (m: string) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);

  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
    'video/mp4',
  ];
  const vp9Candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm'];
  const vp8Candidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'];

  if (preferred === 'auto-mp4') {
    for (const m of mp4Candidates) {
      if (isSupported(m)) return { mimeType: m, extension: 'mp4', label: 'MP4 (H.264)' };
    }
    for (const m of vp9Candidates) {
      if (isSupported(m)) return { mimeType: m, extension: 'webm', label: 'WebM (VP9 fallback)' };
    }
  } else if (preferred === 'webm-vp9') {
    for (const m of vp9Candidates) {
      if (isSupported(m)) return { mimeType: m, extension: 'webm', label: 'WebM (VP9)' };
    }
  } else if (preferred === 'webm-vp8') {
    for (const m of vp8Candidates) {
      if (isSupported(m)) return { mimeType: m, extension: 'webm', label: 'WebM (VP8)' };
    }
  }

  return { mimeType: 'video/webm', extension: 'webm', label: 'WebM' };
}

export function isMp4NativelySupported(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  return (
    MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2') ||
    MediaRecorder.isTypeSupported('video/mp4')
  );
}

export interface ExportJobParams {
  clips: HighlightClip[];
  mapName: string;
  players: DemoPlayer[];
  overlay: OverlaySettings;
  settings: ExportSettings;
  backdropImage: HTMLImageElement | null;
  gameplayVideoUrl: string | null;
  previewCanvas?: HTMLCanvasElement | null;
  signal: AbortSignal;
  onProgress: (progress: ExportProgress) => void;
}

/**
 * Renders one or more CS2 highlight clips to a real downloadable .mp4 / .webm video file
 * using an HTML5 Canvas compositor + MediaRecorder + Web Audio SFX stream.
 */
export async function exportHighlightsToVideo({
  clips,
  mapName,
  players,
  overlay,
  settings,
  backdropImage,
  gameplayVideoUrl,
  previewCanvas,
  signal,
  onProgress,
}: ExportJobParams): Promise<ExportedVideoResult> {
  if (clips.length === 0) {
    throw new Error('No highlight clips selected for export.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Your browser does not support MediaRecorder video encoding.');
  }

  const { width, height } = getExportDimensions(settings.aspectRatio, settings.resolution);
  const { mimeType, extension } = resolveRecorderMime(settings.format);

  onProgress({
    phase: 'preparing',
    progress: 0,
    currentClipIndex: 0,
    totalClips: clips.length,
    currentClipTitle: clips[0].title,
    elapsedMs: 0,
    estimatedRemainingMs: 0,
  });

  // Offscreen high-res recording canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Failed to initialize 2D canvas context for rendering.');

  // Optional external gameplay video element dedicated to export
  let exportVideoEl: HTMLVideoElement | null = null;
  if (overlay.visualMode === 'video' && gameplayVideoUrl) {
    exportVideoEl = document.createElement('video');
    exportVideoEl.src = gameplayVideoUrl;
    exportVideoEl.muted = true;
    exportVideoEl.playsInline = true;
    exportVideoEl.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      if (!exportVideoEl) return resolve();
      const done = () => resolve();
      exportVideoEl.onloadeddata = done;
      exportVideoEl.onerror = done;
      exportVideoEl.load();
    });
  }

  // Audio stream synthesis for crisp gunfire + headshot dinks baked into the exported video
  const audioEngine = new CS2AudioEngine();
  const audioStream = overlay.enableAudio ? audioEngine.init(true) : null;

  const videoStream = canvas.captureStream(settings.fps);
  const combinedTracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  if (audioStream) {
    combinedTracks.push(...audioStream.getAudioTracks());
  }
  const combinedStream = new MediaStream(combinedTracks);

  const chunks: BlobPart[] = [];
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: settings.bitrateMbps * 1_000_000,
    audioBitsPerSecond: 128_000,
  };
  if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
    recorderOptions.mimeType = mimeType;
  }

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const recorderStopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }));
    };
    recorder.onerror = () => {
      reject(new Error('Video encoder encountered an unexpected stream error.'));
    };
  });

  const clipDurations = clips.map((c) => getClipTotalDuration(c, overlay));
  const totalDurationSec = clipDurations.reduce((sum, d) => sum + d, 0);
  const startWallMs = performance.now();

  recorder.start(250);

  try {
    let accumulatedSec = 0;

    for (let clipIdx = 0; clipIdx < clips.length; clipIdx++) {
      const clip = clips[clipIdx];
      const clipDur = clipDurations[clipIdx];
      const playerStats = players.find((p) => p.name === clip.playerName);
      const triggeredKills = new Set<string>();
      let introSoundPlayed = false;

      // Align optional gameplay video to clip's sync offset
      if (exportVideoEl && exportVideoEl.duration > 0) {
        exportVideoEl.currentTime = Math.min(
          Math.max(0, clip.videoSyncOffsetSec),
          Math.max(0, exportVideoEl.duration - 1)
        );
        try {
          await exportVideoEl.play();
        } catch {
          // Ignore autoplay restrictions if browser blocks muted offscreen video
        }
      }

      const clipWallStart = performance.now();

      await new Promise<void>((resolve, reject) => {
        const frameInterval = 1000 / settings.fps;
        let lastTick = performance.now();
        let clipTime = 0;

        const step = () => {
          if (signal.aborted) {
            reject(new DOMException('Export cancelled by user.', 'AbortError'));
            return;
          }

          const now = performance.now();
          const dtSec = Math.min(0.08, (now - lastTick) / 1000);
          lastTick = now;

          // Respect optional slow-mo final kill time dilation
          const actionTime = getActionTime(clipTime, clip, overlay);
          const finalKill = clip.kills[clip.kills.length - 1];
          const inSlowMo =
            overlay.slowMoFinalKill &&
            finalKill &&
            actionTime >= finalKill.timeOffset - 0.5 &&
            actionTime <= finalKill.timeOffset + 0.75;

          const timeScale = inSlowMo ? 0.5 : 1;
          clipTime += dtSec * timeScale;

          // Trigger audio SFX exactly on cue
          if (overlay.enableAudio) {
            if (overlay.showIntroCard && !introSoundPlayed && clipTime > 0.05) {
              introSoundPlayed = true;
              audioEngine.playIntroWhoosh();
            }
            const curActionTime = getActionTime(clipTime, clip, overlay);
            clip.kills.forEach((k, kIdx) => {
              if (curActionTime >= k.timeOffset && !triggeredKills.has(k.id)) {
                triggeredKills.add(k.id);
                audioEngine.playKillSound(k.weapon, k.headshot, kIdx + 1);
              }
            });
          }

          // Smooth fade in/out between montage clips
          let fadeAlpha = 1;
          if (clipTime < 0.25) fadeAlpha = clipTime / 0.25;
          else if (clipDur - clipTime < 0.3) fadeAlpha = Math.max(0, (clipDur - clipTime) / 0.3);

          renderHighlightFrame({
            ctx,
            width,
            height,
            clip,
            mapName,
            playerStats,
            clipTime,
            overlay,
            backdropImage,
            gameplayVideo: exportVideoEl,
            fadeAlpha,
          });

          // Mirror live progress thumbnail into modal preview canvas if provided
          if (previewCanvas) {
            const pCtx = previewCanvas.getContext('2d');
            if (pCtx) {
              pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
            }
          }

          const elapsedTotalSec = Math.min(totalDurationSec, accumulatedSec + clipTime);
          const progress = Math.min(0.98, elapsedTotalSec / Math.max(0.1, totalDurationSec));
          const elapsedMs = performance.now() - startWallMs;
          const remainingMs =
            progress > 0.02 ? Math.max(0, (elapsedMs / progress) * (1 - progress)) : totalDurationSec * 1000;

          onProgress({
            phase: 'rendering',
            progress,
            currentClipIndex: clipIdx,
            totalClips: clips.length,
            currentClipTitle: clip.title,
            elapsedMs,
            estimatedRemainingMs: remainingMs,
          });

          if (clipTime >= clipDur) {
            accumulatedSec += clipDur;
            resolve();
            return;
          }

          // Keep frame pacing steady for MediaRecorder
          const spent = performance.now() - now;
          window.setTimeout(step, Math.max(4, Math.round(frameInterval - spent)));
        };

        void clipWallStart;
        step();
      });

      if (exportVideoEl) {
        exportVideoEl.pause();
      }
    }

    onProgress({
      phase: 'finalizing',
      progress: 0.99,
      currentClipIndex: clips.length - 1,
      totalClips: clips.length,
      currentClipTitle: clips[clips.length - 1].title,
      elapsedMs: performance.now() - startWallMs,
      estimatedRemainingMs: 0,
    });

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    const blob = await recorderStopped;
    const url = URL.createObjectURL(blob);

    const safeMap = mapName.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
    const scopeSlug =
      clips.length === 1
        ? `${clips[0].playerName.toLowerCase()}_r${clips[0].roundNumber}_${clips[0].category.toLowerCase()}`
        : `montage_${clips.length}clips`;
    const fileName = `fragreel_${safeMap}_${scopeSlug}_${settings.resolution}.${extension}`;

    onProgress({
      phase: 'complete',
      progress: 1,
      currentClipIndex: clips.length - 1,
      totalClips: clips.length,
      currentClipTitle: clips[clips.length - 1].title,
      elapsedMs: performance.now() - startWallMs,
      estimatedRemainingMs: 0,
    });

    return {
      blob,
      url,
      fileName,
      mimeType: blob.type || mimeType,
      extension,
      sizeBytes: blob.size,
      durationSec: Number(totalDurationSec.toFixed(1)),
      width,
      height,
      fps: settings.fps,
      clipCount: clips.length,
    };
  } finally {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore stop race
      }
    }
    combinedStream.getTracks().forEach((t) => t.stop());
    audioEngine.dispose();
    if (exportVideoEl) {
      exportVideoEl.pause();
      exportVideoEl.removeAttribute('src');
      exportVideoEl.load();
    }
  }
}
