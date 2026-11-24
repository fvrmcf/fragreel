import { formatMapDisplayName, getMapLayout } from '../data/mapLayouts';
import {
  AccentTheme,
  DemoPlayer,
  HighlightClip,
  KillEvent,
  OverlaySettings,
  PlayerPath,
  WeaponName,
} from '../types/demo';

export const INTRO_CARD_DURATION = 1.8;

const ACCENT_PALETTES: Record<AccentTheme, { primary: string; soft: string; glow: string }> = {
  gold: { primary: '#E5A93B', soft: 'rgba(229,169,59,0.18)', glow: 'rgba(229,169,59,0.55)' },
  crimson: { primary: '#EF4444', soft: 'rgba(239,68,68,0.18)', glow: 'rgba(239,68,68,0.55)' },
  steel: { primary: '#5B9BD5', soft: 'rgba(91,155,213,0.18)', glow: 'rgba(91,155,213,0.55)' },
  mono: { primary: '#F1F5F9', soft: 'rgba(241,245,249,0.16)', glow: 'rgba(241,245,249,0.45)' },
};

const TEAM_COLORS = {
  CT: '#5B9BD5',
  T: '#E5A93B',
};

/** Computes the total rendered duration of a highlight clip including optional intro slate and trim padding */
export function getClipTotalDuration(clip: HighlightClip, overlay: OverlaySettings): number {
  const intro = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
  const trimOffset = Math.max(0, clip.preRollSec - 1.2);
  return Number((intro + trimOffset + clip.actionDurationSec + Math.max(0.6, clip.postRollSec - 1.0)).toFixed(2));
}

/** Maps playback time (in seconds from clip start) to action time (relative to clip.kills[].timeOffset) */
export function getActionTime(clipTime: number, clip: HighlightClip, overlay: OverlaySettings): number {
  const intro = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
  const lead = Math.max(0, clip.preRollSec - 1.2);
  return clipTime - intro - lead;
}

function interpolatePath(path: PlayerPath, actionTime: number): {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  hp: number;
} {
  const wps = path.waypoints;
  if (wps.length === 0) return { x: 500, y: 500, angle: 0, alive: false, hp: 0 };
  if (actionTime <= wps[0].time) return { ...wps[0] };
  const last = wps[wps.length - 1];
  if (actionTime >= last.time) return { ...last };

  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i];
    const b = wps[i + 1];
    if (actionTime >= a.time && actionTime <= b.time) {
      const span = Math.max(0.0001, b.time - a.time);
      const t = (actionTime - a.time) / span;
      const smooth = t * t * (3 - 2 * t);
      return {
        x: a.x + (b.x - a.x) * smooth,
        y: a.y + (b.y - a.y) * smooth,
        angle: lerpAngle(a.angle, b.angle, smooth),
        alive: a.alive && (t < 0.99 || b.alive),
        hp: Math.round(a.hp + (b.hp - a.hp) * t),
      };
    }
  }
  return { ...last };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws crisp vector weapon silhouettes for the authentic CS2 killfeed */
function drawWeaponIcon(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponName,
  x: number,
  y: number,
  scale: number,
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (weapon === 'AWP') {
    // Long sniper barrel + scope + stock
    ctx.fillRect(-16, -2, 34, 3);
    ctx.fillRect(-4, -6, 10, 2.5);
    ctx.fillRect(-18, -1, 7, 5.5);
    ctx.fillRect(-2, 1, 3, 5);
  } else if (weapon === 'Desert Eagle' || weapon === 'USP-S' || weapon === 'Glock-18') {
    // Compact sidearm silhouette
    ctx.fillRect(-9, -4, 17, 4);
    ctx.fillRect(-8, 0, 4.5, 7);
    if (weapon === 'USP-S') {
      ctx.fillRect(8, -3.5, 8, 3);
    }
  } else if (weapon === 'M4A1-S' || weapon === 'M4A4') {
    // Carbine + carry handle + optional suppressor
    ctx.fillRect(-14, -2.5, 25, 3.8);
    ctx.fillRect(-16, -2, 5, 5);
    ctx.fillRect(0, 1, 3.5, 6);
    if (weapon === 'M4A1-S') {
      ctx.fillRect(11, -2, 7, 2.6);
    }
  } else {
    // AK-47 / Rifle with iconic curved banana mag
    ctx.fillRect(-15, -2.5, 29, 3.6);
    ctx.fillRect(-17, -1.5, 6, 5);
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(3, 6, 6, 7);
    ctx.lineTo(2, 7);
    ctx.quadraticCurveTo(-1, 5, -3, 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawHeadshotGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.2, r * 0.24);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r * 0.35, y);
  ctx.moveTo(x + r * 0.35, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y - r * 0.35);
  ctx.moveTo(x, y + r * 0.35);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  w: number,
  h: number,
  alpha = 1
): void {
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!sw || !sh) return;

  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();
}

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  clip: HighlightClip;
  mapName: string;
  playerStats?: DemoPlayer;
  clipTime: number;
  overlay: OverlaySettings;
  backdropImage?: HTMLImageElement | null;
  gameplayVideo?: HTMLVideoElement | null;
  fadeAlpha?: number;
}

export function renderHighlightFrame({
  ctx,
  width,
  height,
  clip,
  mapName,
  playerStats,
  clipTime,
  overlay,
  backdropImage,
  gameplayVideo,
  fadeAlpha = 1,
}: RenderFrameParams): void {
  const accent = ACCENT_PALETTES[overlay.accentTheme] || ACCENT_PALETTES.gold;
  const layout = getMapLayout(mapName);
  const scale = Math.min(width / 1280, height / 720);
  const isVertical = height > width;
  const isSquare = Math.abs(width - height) < 40;
  const introDuration = overlay.showIntroCard ? INTRO_CARD_DURATION : 0;
  const inIntro = overlay.showIntroCard && clipTime < introDuration;
  const actionTime = getActionTime(clipTime, clip, overlay);

  // Determine kills that have occurred up to this moment
  const occurredKills = clip.kills.filter((k) => actionTime >= k.timeOffset);
  const lastKill = occurredKills[occurredKills.length - 1];
  const finalKill = clip.kills[clip.kills.length - 1];
  const isSlowMoWindow =
    overlay.slowMoFinalKill &&
    finalKill &&
    actionTime >= finalKill.timeOffset - 0.55 &&
    actionTime <= finalKill.timeOffset + 0.85;

  ctx.save();
  ctx.fillStyle = '#090C11';
  ctx.fillRect(0, 0, width, height);

  // 1. Background layer (Gameplay Video OR Atmospheric Map Backdrop)
  const hasLiveVideo =
    overlay.visualMode === 'video' &&
    gameplayVideo &&
    gameplayVideo.readyState >= 2 &&
    gameplayVideo.videoWidth > 0;

  if (hasLiveVideo && !inIntro) {
    drawCoverImage(ctx, gameplayVideo, width, height, 1);
    // Subtle broadcast vignette for HUD legibility
    const vig = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.35,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.72
    );
    vig.addColorStop(0, 'rgba(9, 12, 17, 0)');
    vig.addColorStop(1, 'rgba(9, 12, 17, 0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Draw atmospheric map backdrop photo darkened for tactical clarity
    if (backdropImage && backdropImage.complete && backdropImage.naturalWidth > 0) {
      drawCoverImage(ctx, backdropImage, width, height, inIntro ? 0.55 : 0.24);
    }
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(11, 14, 20, 0.74)');
    bgGrad.addColorStop(0.5, 'rgba(11, 14, 20, 0.58)');
    bgGrad.addColorStop(1, 'rgba(9, 12, 17, 0.88)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle tactical coordinate grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.032)';
    ctx.lineWidth = 1;
    const gridStep = Math.round(48 * Math.max(0.75, scale));
    for (let gx = 0; gx < width; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy < height; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // 2. Tactical Radar Viewport (when not in intro card)
    if (!inIntro) {
      const radarSize = isVertical
        ? width * 0.88
        : isSquare
          ? width * 0.76
          : Math.min(height * 0.78, width * 0.54);
      const radarX = (width - radarSize) / 2;
      const radarY = isVertical
        ? height * 0.22
        : (height - radarSize) / 2 + 8 * scale;

      drawTacticalRadar({
        ctx,
        x: radarX,
        y: radarY,
        size: radarSize,
        layout,
        clip,
        actionTime,
        occurredKills,
        accentColor: accent.primary,
      });
    }
  }

  // 3. Slow-Mo Final Kill subtle edge highlight
  if (isSlowMoWindow && !inIntro) {
    const pulse = 1 - Math.abs(actionTime - finalKill.timeOffset) / 0.85;
    ctx.strokeStyle = accent.primary;
    ctx.globalAlpha = Math.max(0.12, pulse * 0.45);
    ctx.lineWidth = Math.max(3, 6 * scale);
    ctx.strokeRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // 4. Intro Title Slate (first 1.8s)
  if (inIntro) {
    drawIntroSlate({
      ctx,
      width,
      height,
      scale,
      clip,
      mapDisplayName: formatMapDisplayName(mapName),
      progress: clipTime / introDuration,
      accent,
    });
  } else {
    // 5. Broadcast HUD Overlays
    const barHeight = overlay.showCinemaBars ? Math.round(height * 0.068) : 0;

    if (overlay.showScoreboard) {
      drawScoreboardBug({
        ctx,
        width,
        scale,
        topOffset: barHeight + Math.round(18 * scale),
        clip,
        actionTime,
        mapDisplayName: formatMapDisplayName(mapName),
      });
    }

    if (overlay.showKillfeed && occurredKills.length > 0) {
      drawKillfeed({
        ctx,
        width,
        scale,
        topOffset: barHeight + Math.round(20 * scale),
        occurredKills,
        actionTime,
        starName: clip.playerName,
      });
    }

    if (overlay.showPlayerHud) {
      drawPlayerHudCard({
        ctx,
        width,
        height,
        scale,
        bottomOffset: barHeight + Math.round(22 * scale),
        clip,
        playerStats,
        actionTime,
        occurredKills,
        accent,
      });
    }

    if (overlay.showStreakBanner && lastKill && actionTime - lastKill.timeOffset < 2.4) {
      const elapsed = actionTime - lastKill.timeOffset;
      const streak = occurredKills.length;
      if (streak >= 2 || (clip.clutchVs && streak === clip.kills.length)) {
        drawStreakBanner({
          ctx,
          width,
          height,
          scale,
          bottomOffset: barHeight + (isVertical ? Math.round(165 * scale) : Math.round(96 * scale)),
          streak,
          totalKills: clip.kills.length,
          clip,
          elapsed,
          accent,
          isSlowMo: Boolean(isSlowMoWindow),
        });
      }
    }

    // 6. Optional Cinema Bars (2.35:1)
    if (overlay.showCinemaBars && barHeight > 0) {
      ctx.fillStyle = '#05070A';
      ctx.fillRect(0, 0, width, barHeight);
      ctx.fillRect(0, height - barHeight, width, barHeight);
    }
  }

  // Smooth crossfade for montage transitions
  if (fadeAlpha < 1) {
    ctx.fillStyle = `rgba(9, 12, 17, ${Math.max(0, Math.min(1, 1 - fadeAlpha))})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

function drawTacticalRadar({
  ctx,
  x,
  y,
  size,
  layout,
  clip,
  actionTime,
  occurredKills,
  accentColor,
}: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  layout: ReturnType<typeof getMapLayout>;
  clip: HighlightClip;
  actionTime: number;
  occurredKills: KillEvent[];
  accentColor: string;
}): void {
  const starPath = clip.paths.find((p) => p.isStar);
  const starNow = starPath ? interpolatePath(starPath, Math.max(0, actionTime)) : { x: 500, y: 500, angle: 0, alive: true, hp: 100 };

  // Dynamic subtle tactical camera tracking centered between map center and star player's action zone
  const zoom = 1.24;
  const focusX = 500 * 0.35 + starNow.x * 0.65;
  const focusY = 500 * 0.35 + starNow.y * 0.65;

  const toScreen = (mx: number, my: number): [number, number] => {
    const nx = (mx - focusX) * zoom + 500;
    const ny = (my - focusY) * zoom + 500;
    return [x + (nx / 1000) * size, y + (ny / 1000) * size];
  };

  ctx.save();
  drawRoundedRect(ctx, x, y, size, size, 12);
  ctx.fillStyle = 'rgba(13, 18, 26, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.clip();

  // Map architectural floor polygons
  for (const poly of layout.polygons) {
    ctx.beginPath();
    poly.points.forEach(([px, py], idx) => {
      const [sx, sy] = toScreen(px, py);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();

    if (poly.type === 'walkable') {
      ctx.fillStyle = 'rgba(34, 44, 60, 0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (poly.type === 'cover') {
      ctx.fillStyle = 'rgba(15, 21, 31, 0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (poly.type === 'siteA' || poly.type === 'siteB') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (poly.type === 'spawnCT') {
      ctx.fillStyle = 'rgba(91, 155, 213, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(91, 155, 213, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (poly.type === 'spawnT') {
      ctx.fillStyle = 'rgba(229, 169, 59, 0.14)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(229, 169, 59, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Callout labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const call of layout.callouts) {
    const [cx, cy] = toScreen(call.x, call.y);
    ctx.font = call.emphasis
      ? `700 ${Math.round(size * 0.028)}px "Barlow Condensed", sans-serif`
      : `600 ${Math.round(size * 0.017)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = call.emphasis ? 'rgba(248, 113, 113, 0.85)' : 'rgba(148, 163, 184, 0.55)';
    ctx.fillText(call.name, cx, cy);
  }

  // Active utility effects (Smoke, Molotov, Flash)
  for (const util of clip.utilities) {
    if (actionTime >= util.timeOffset && actionTime <= util.timeOffset + util.duration) {
      const [ux, uy] = toScreen(util.pos[0], util.pos[1]);
      const elapsed = actionTime - util.timeOffset;
      const remain = util.duration - elapsed;
      const alpha = Math.min(1, elapsed / 0.35) * Math.min(1, remain / 0.5);

      if (util.type === 'smoke') {
        const rad = size * 0.062;
        const grad = ctx.createRadialGradient(ux, uy, rad * 0.2, ux, uy, rad);
        grad.addColorStop(0, `rgba(203, 213, 225, ${0.46 * alpha})`);
        grad.addColorStop(0.75, `rgba(148, 163, 184, ${0.28 * alpha})`);
        grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ux, uy, rad, 0, Math.PI * 2);
        ctx.fill();
      } else if (util.type === 'molotov') {
        const rad = size * 0.048;
        const grad = ctx.createRadialGradient(ux, uy, rad * 0.1, ux, uy, rad);
        grad.addColorStop(0, `rgba(251, 146, 60, ${0.52 * alpha})`);
        grad.addColorStop(0.65, `rgba(239, 68, 68, ${0.28 * alpha})`);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ux, uy, rad, 0, Math.PI * 2);
        ctx.fill();
      } else if (util.type === 'flash') {
        const rad = size * (0.04 + elapsed * 0.14);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * Math.max(0, 1 - elapsed / util.duration)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ux, uy, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Star player trail line
  if (starPath && starPath.waypoints.length > 1) {
    ctx.beginPath();
    let started = false;
    const steps = 40;
    const maxT = Math.max(0, actionTime);
    for (let i = 0; i <= steps; i++) {
      const sampleT = (i / steps) * maxT;
      const pt = interpolatePath(starPath, sampleT);
      const [px, py] = toScreen(pt.x, pt.y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Bullet tracers & kill impact markers
  for (const kill of occurredKills) {
    const dt = actionTime - kill.timeOffset;
    const [ax, ay] = toScreen(kill.attackerPos[0], kill.attackerPos[1]);
    const [vx, vy] = toScreen(kill.victimPos[0], kill.victimPos[1]);

    // Glowing bullet tracer right after kill
    if (dt >= 0 && dt < 0.75) {
      const tracerAlpha = Math.max(0, 1 - dt / 0.75);
      const grad = ctx.createLinearGradient(ax, ay, vx, vy);
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.15 * tracerAlpha})`);
      grad.addColorStop(0.55, `rgba(229, 169, 59, ${0.95 * tracerAlpha})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${tracerAlpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = kill.weapon === 'AWP' ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(vx, vy);
      ctx.stroke();

      // Impact ring pulse on victim
      const ringR = size * (0.015 + dt * 0.065);
      ctx.strokeStyle = kill.headshot
        ? `rgba(239, 68, 68, ${tracerAlpha})`
        : `rgba(229, 169, 59, ${tracerAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(vx, vy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Persistent crisp X death marker on map
    const cross = Math.max(4.5, size * 0.011);
    ctx.strokeStyle = kill.headshot ? '#EF4444' : 'rgba(248, 113, 113, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vx - cross, vy - cross);
    ctx.lineTo(vx + cross, vy + cross);
    ctx.moveTo(vx + cross, vy - cross);
    ctx.lineTo(vx - cross, vy + cross);
    ctx.stroke();
  }

  // Draw all alive players + viewcones
  for (const path of clip.paths) {
    const state = interpolatePath(path, Math.max(0, actionTime));
    if (!state.alive) continue;

    const [px, py] = toScreen(state.x, state.y);
    const teamColor = TEAM_COLORS[path.team];
    const radius = path.isStar ? Math.max(8, size * 0.018) : Math.max(6.5, size * 0.014);

    // Viewcone
    const coneLen = path.isStar ? size * 0.095 : size * 0.055;
    const coneSpread = path.isStar ? 0.42 : 0.34;
    const coneGrad = ctx.createRadialGradient(px, py, radius * 0.5, px, py, coneLen);
    coneGrad.addColorStop(0, path.isStar ? 'rgba(229, 169, 59, 0.34)' : 'rgba(148, 163, 184, 0.16)');
    coneGrad.addColorStop(1, 'rgba(229, 169, 59, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, coneLen, state.angle - coneSpread, state.angle + coneSpread);
    ctx.closePath();
    ctx.fill();

    // Star outer ring highlight
    if (path.isStar) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, radius + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Player disc
    ctx.fillStyle = teamColor;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#090C11';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Direction pip
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      px + Math.cos(state.angle) * (radius * 0.72),
      py + Math.sin(state.angle) * (radius * 0.72),
      Math.max(1.8, radius * 0.26),
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Player nametag
    ctx.font = path.isStar
      ? `700 ${Math.round(size * 0.02)}px "Plus Jakarta Sans", sans-serif`
      : `500 ${Math.round(size * 0.017)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = path.isStar ? '#FFFFFF' : 'rgba(226, 232, 240, 0.78)';
    ctx.fillText(path.playerName, px, py - radius - 7);
  }

  // Radar corner tag (clean unboxed text)
  ctx.textAlign = 'left';
  ctx.font = `600 ${Math.round(size * 0.02)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
  ctx.fillText(`${layout.displayName.toUpperCase()} · TACTICAL FEED`, x + 14, y + size - 14);

  ctx.restore();
}

function drawIntroSlate({
  ctx,
  width,
  height,
  scale,
  clip,
  mapDisplayName,
  progress,
  accent,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  clip: HighlightClip;
  mapDisplayName: string;
  progress: number;
  accent: { primary: string; soft: string; glow: string };
}): void {
  const easeOut = 1 - Math.pow(1 - Math.min(1, progress * 2.4), 3);
  const fadeOut = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.22) : 1;
  const alpha = Math.min(1, easeOut) * fadeOut;

  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = width / 2;
  const cy = height / 2;
  const slideY = (1 - easeOut) * 28 * scale;

  // Accent horizontal rule
  const barW = Math.round(72 * scale * easeOut);
  ctx.fillStyle = accent.primary;
  ctx.fillRect(cx - barW / 2, cy - Math.round(92 * scale) + slideY, barW, Math.max(3, Math.round(4 * scale)));

  // Kicker line
  const kicker = `${mapDisplayName.toUpperCase()}  ·  ROUND ${clip.roundNumber}  ·  ${clip.ctScore} – ${clip.tScore}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(18 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText(kicker, cx, cy - Math.round(58 * scale) + slideY);

  // Main Broadcast Display Title
  const headline =
    clip.category === 'ACE'
      ? 'ACE'
      : clip.category === 'CLUTCH'
        ? `1v${clip.clutchVs || clip.kills.length} CLUTCH`
        : `${clip.kills.length}K HIGHLIGHT`;

  ctx.font = `700 ${Math.round(96 * scale)}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(headline, cx, cy + Math.round(6 * scale) + slideY);

  // Player Name & Weapon stats line
  const hsCount = clip.kills.filter((k) => k.headshot).length;
  ctx.font = `700 ${Math.round(30 * scale)}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = accent.primary;
  ctx.fillText(clip.playerName.toUpperCase(), cx, cy + Math.round(68 * scale) + slideY);

  ctx.font = `500 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(
    `${clip.kills.length} Kills  ·  ${hsCount} Headshots  ·  ${clip.primaryWeapon}`,
    cx,
    cy + Math.round(102 * scale) + slideY
  );

  ctx.restore();
}

function drawScoreboardBug({
  ctx,
  width,
  scale,
  topOffset,
  clip,
  actionTime,
  mapDisplayName,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  scale: number;
  topOffset: number;
  clip: HighlightClip;
  actionTime: number;
  mapDisplayName: string;
}): void {
  const boxW = Math.round(300 * scale);
  const boxH = Math.round(44 * scale);
  const x = Math.round((width - boxW) / 2);
  const y = topOffset;

  ctx.save();
  drawRoundedRect(ctx, x, y, boxW, boxH, Math.round(6 * scale));
  ctx.fillStyle = 'rgba(11, 14, 20, 0.86)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // CT Team accent strip + score
  ctx.fillStyle = TEAM_COLORS.CT;
  ctx.fillRect(x, y + Math.round(4 * scale), Math.round(4 * scale), boxH - Math.round(8 * scale));

  // T Team accent strip + score
  ctx.fillStyle = TEAM_COLORS.T;
  ctx.fillRect(x + boxW - Math.round(4 * scale), y + Math.round(4 * scale), Math.round(4 * scale), boxH - Math.round(8 * scale));

  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('CT', x + Math.round(16 * scale), y + boxH / 2);

  ctx.font = `700 ${Math.round(24 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(String(clip.ctScore), x + Math.round(48 * scale), y + boxH / 2 + 1);

  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('T', x + boxW - Math.round(16 * scale), y + boxH / 2);

  ctx.font = `700 ${Math.round(24 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(String(clip.tScore), x + boxW - Math.round(44 * scale), y + boxH / 2 + 1);

  // Center clock & round indicator
  const remainSec = Math.max(0, Math.round(40 - Math.max(0, actionTime)));
  const clockStr = `0:${String(remainSec).padStart(2, '0')}`;
  ctx.textAlign = 'center';
  ctx.font = `600 ${Math.round(15 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = clip.bombPlantedAt ? '#EF4444' : '#F8FAFC';
  ctx.fillText(clockStr, x + boxW / 2, y + boxH * 0.38);

  ctx.font = `500 ${Math.round(10 * scale)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`R${clip.roundNumber} · ${mapDisplayName}`, x + boxW / 2, y + boxH * 0.74);

  ctx.restore();
}

function drawKillfeed({
  ctx,
  width,
  scale,
  topOffset,
  occurredKills,
  actionTime,
  starName,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  scale: number;
  topOffset: number;
  occurredKills: KillEvent[];
  actionTime: number;
  starName: string;
}): void {
  const visible = occurredKills.slice(-5);
  const rowH = Math.round(28 * scale);
  const gap = Math.round(6 * scale);
  const rightMargin = Math.round(20 * scale);

  ctx.save();
  ctx.textBaseline = 'middle';

  visible.forEach((kill, idx) => {
    const dt = Math.max(0, actionTime - kill.timeOffset);
    const slideIn = 1 - Math.pow(1 - Math.min(1, dt / 0.18), 3);
    const offsetX = (1 - slideIn) * 32 * scale;

    ctx.font = `600 ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
    const attackerW = ctx.measureText(kill.attackerName).width;
    const victimW = ctx.measureText(kill.victimName).width;
    const iconSpan =
      Math.round(48 * scale) +
      (kill.headshot ? Math.round(20 * scale) : 0) +
      (kill.wallbang ? Math.round(18 * scale) : 0) +
      (kill.throughSmoke ? Math.round(18 * scale) : 0) +
      (kill.noScope ? Math.round(20 * scale) : 0);
    const padX = Math.round(12 * scale);
    const rowW = Math.round(attackerW + victimW + iconSpan + padX * 2 + 10 * scale);

    const rx = width - rightMargin - rowW + offsetX;
    const ry = topOffset + idx * (rowH + gap);
    const isStarKill = kill.attackerName === starName;

    drawRoundedRect(ctx, rx, ry, rowW, rowH, Math.round(4 * scale));
    ctx.fillStyle = isStarKill ? 'rgba(11, 14, 20, 0.92)' : 'rgba(11, 14, 20, 0.78)';
    ctx.fill();
    ctx.strokeStyle = isStarKill ? 'rgba(239, 68, 68, 0.85)' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = isStarKill ? 1.5 : 1;
    ctx.stroke();

    // Attacker name
    ctx.textAlign = 'left';
    ctx.fillStyle = TEAM_COLORS[kill.attackerTeam];
    ctx.fillText(kill.attackerName, rx + padX, ry + rowH / 2 + 0.5);

    // Weapon icon + kill modifiers
    let cursorX = rx + padX + attackerW + Math.round(26 * scale);
    drawWeaponIcon(ctx, kill.weapon, cursorX, ry + rowH / 2, Math.max(0.7, scale * 0.92), '#E2E8F0');
    cursorX += Math.round(26 * scale);

    if (kill.noScope) {
      ctx.font = `700 ${Math.round(10 * scale)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#E5A93B';
      ctx.fillText('NS', cursorX - Math.round(4 * scale), ry + rowH / 2 + 0.5);
      cursorX += Math.round(20 * scale);
    }
    if (kill.wallbang) {
      ctx.font = `700 ${Math.round(10 * scale)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText('WB', cursorX - Math.round(4 * scale), ry + rowH / 2 + 0.5);
      cursorX += Math.round(18 * scale);
    }
    if (kill.throughSmoke) {
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(cursorX + Math.round(2 * scale), ry + rowH / 2, Math.round(5 * scale), 0, Math.PI * 2);
      ctx.fill();
      cursorX += Math.round(18 * scale);
    }
    if (kill.headshot) {
      drawHeadshotGlyph(ctx, cursorX + Math.round(2 * scale), ry + rowH / 2, Math.round(6.5 * scale), '#EF4444');
      cursorX += Math.round(18 * scale);
    }

    // Victim name
    ctx.font = `600 ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = TEAM_COLORS[kill.victimTeam];
    ctx.fillText(kill.victimName, rx + rowW - padX, ry + rowH / 2 + 0.5);
  });

  ctx.restore();
}

function drawPlayerHudCard({
  ctx,
  width,
  height,
  scale,
  bottomOffset,
  clip,
  playerStats,
  actionTime,
  occurredKills,
  accent,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  bottomOffset: number;
  clip: HighlightClip;
  playerStats?: DemoPlayer;
  actionTime: number;
  occurredKills: KillEvent[];
  accent: { primary: string; soft: string; glow: string };
}): void {
  const starPath = clip.paths.find((p) => p.isStar);
  const starState = starPath ? interpolatePath(starPath, Math.max(0, actionTime)) : { hp: 100 };

  const cardW = Math.min(Math.round(330 * scale), width - Math.round(40 * scale));
  const cardH = Math.round(74 * scale);
  const x = Math.round(22 * scale);
  const y = height - bottomOffset - cardH;

  ctx.save();
  drawRoundedRect(ctx, x, y, cardW, cardH, Math.round(8 * scale));
  ctx.fillStyle = 'rgba(11, 14, 20, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // HP bar along top edge of card
  const hpRatio = Math.max(0, Math.min(1, starState.hp / 100));
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + Math.round(14 * scale), y + Math.round(12 * scale), cardW - Math.round(28 * scale), Math.round(3 * scale));
  ctx.fillStyle = starState.hp <= 25 ? '#EF4444' : TEAM_COLORS[clip.playerTeam];
  ctx.fillRect(
    x + Math.round(14 * scale),
    y + Math.round(12 * scale),
    Math.round((cardW - Math.round(28 * scale)) * hpRatio),
    Math.round(3 * scale)
  );

  // Player Name & HP
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 ${Math.round(22 * scale)}px "Barlow Condensed", sans-serif`;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(clip.playerName.toUpperCase(), x + Math.round(14 * scale), y + Math.round(34 * scale));

  // Stats line
  const statsLine = playerStats
    ? `${playerStats.kills}/${playerStats.deaths}/${playerStats.assists}  ·  ${playerStats.adr} ADR  ·  ${clip.primaryWeapon}`
    : `${clip.playerTeam} Side  ·  ${clip.primaryWeapon}`;
  ctx.font = `500 ${Math.round(11.5 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(statsLine, x + Math.round(14 * scale), y + Math.round(56 * scale));

  // Right side: HP number & Kill pips (1..5)
  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(20 * scale)}px "JetBrains Mono", monospace`;
  ctx.fillStyle = starState.hp <= 25 ? '#EF4444' : '#F8FAFC';
  ctx.fillText(`${starState.hp} HP`, x + cardW - Math.round(14 * scale), y + Math.round(33 * scale));

  // 5 Kill streak pips lighting up live
  const pipCount = Math.max(5, clip.kills.length);
  const pipW = Math.round(12 * scale);
  const pipH = Math.round(5 * scale);
  const pipGap = Math.round(4 * scale);
  const totalPipW = pipCount * pipW + (pipCount - 1) * pipGap;
  const pipStartX = x + cardW - Math.round(14 * scale) - totalPipW;
  const pipY = y + Math.round(52 * scale);

  for (let i = 0; i < pipCount; i++) {
    ctx.fillStyle = i < occurredKills.length ? accent.primary : 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(pipStartX + i * (pipW + pipGap), pipY, pipW, pipH);
  }

  ctx.restore();
}

function drawStreakBanner({
  ctx,
  width,
  height,
  scale,
  bottomOffset,
  streak,
  totalKills,
  clip,
  elapsed,
  accent,
  isSlowMo,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  bottomOffset: number;
  streak: number;
  totalKills: number;
  clip: HighlightClip;
  elapsed: number;
  accent: { primary: string; soft: string; glow: string };
  isSlowMo: boolean;
}): void {
  const enter = Math.min(1, elapsed / 0.16);
  const exit = elapsed > 1.85 ? Math.max(0, 1 - (elapsed - 1.85) / 0.55) : 1;
  const alpha = enter * exit;
  const popScale = 0.92 + 0.08 * (1 - Math.pow(1 - enter, 3));

  let label = `${streak}K`;
  if (streak === 2) label = 'DOUBLE KILL';
  else if (streak === 3) label = 'TRIPLE KILL';
  else if (streak === 4) label = 'QUAD KILL';
  else if (streak >= 5) label = 'ACE!';

  if (clip.clutchVs && streak === totalKills) {
    label = `1v${clip.clutchVs} CLUTCH`;
  }

  const cx = width / 2;
  const cy = height - bottomOffset;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.scale(popScale, popScale);

  ctx.font = `700 ${Math.round(44 * scale)}px "Barlow Condensed", sans-serif`;
  const textW = ctx.measureText(label).width;
  const padX = Math.round(28 * scale);
  const boxW = textW + padX * 2;
  const boxH = Math.round(54 * scale);

  drawRoundedRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, Math.round(6 * scale));
  ctx.fillStyle = 'rgba(11, 14, 20, 0.9)';
  ctx.fill();
  ctx.strokeStyle = accent.primary;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = streak >= 4 ? accent.primary : '#F8FAFC';
  ctx.fillText(label, 0, Math.round(2 * scale));

  if (isSlowMo) {
    ctx.font = `600 ${Math.round(11 * scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText('0.5x FINAL KILL', 0, boxH / 2 + Math.round(14 * scale));
  }

  ctx.restore();
}
