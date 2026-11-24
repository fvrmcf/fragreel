import { HighlightClip, ParsedDemo } from '../types/demo';

export interface ScriptOptions {
  demoFileName: string;
  fps: number;
  hideHudExceptKillfeed: boolean;
  useHlaeMirv: boolean;
  includeXray: boolean;
}

export function generateCS2HighlightScript(
  demo: ParsedDemo,
  clips: HighlightClip[],
  options: ScriptOptions
): string {
  const cleanDemo = options.demoFileName.replace(/\.dem$/i, '');
  const lines: string[] = [
    `// FragReel — Counter-Strike 2 Highlight Recording Config`,
    `// Match: ${demo.mapName} (${demo.scoreCT}-${demo.scoreT}) · Tickrate: ${demo.tickRate}`,
    `// Clips queued: ${clips.length} · Target capture: ${options.fps} fps`,
    `// Place this file in: .../Counter-Strike Global Offensive/game/csgo/cfg/fragreel_highlights.cfg`,
    ``,
    `sv_cheats 1`,
    `spec_show_xray ${options.includeXray ? 1 : 0}`,
    options.hideHudExceptKillfeed
      ? `cl_draw_only_deathnotices 1`
      : `cl_draw_only_deathnotices 0`,
    `cl_drawhud_force_deathnotices 1`,
    `tv_nochat 1`,
    `host_framerate ${options.fps}`,
    ``,
  ];

  if (options.useHlaeMirv) {
    lines.push(`// HLAE mirv_cmd automated director queue`);
    lines.push(`mirv_cmd clear`);
    lines.push(`playdemo "${cleanDemo}"`);
    lines.push(``);

    clips.forEach((clip, idx) => {
      const preTicks = Math.round(clip.preRollSec * demo.tickRate);
      const postTicks = Math.round(clip.postRollSec * demo.tickRate);
      const jumpTick = Math.max(0, clip.startTick - preTicks);
      const stopTick = clip.endTick + postTicks;
      const clipSlug = `clip_${String(idx + 1).padStart(2, '0')}_r${clip.roundNumber}_${clip.category.toLowerCase()}`;

      lines.push(
        `// Clip ${idx + 1}: ${clip.title} (${clip.playerName} · Round ${clip.roundNumber} · ${clip.kills.length}K)`
      );
      lines.push(`mirv_cmd addAtTick ${Math.max(100, jumpTick - 128)} "spec_player \\"${clip.playerName}\\""`);
      lines.push(`mirv_cmd addAtTick ${jumpTick} "startmovie ${clipSlug} raw"`);
      lines.push(`mirv_cmd addAtTick ${stopTick} "endmovie"`);
      if (idx + 1 < clips.length) {
        const nextClip = clips[idx + 1];
        const nextJump = Math.max(0, nextClip.startTick - Math.round(nextClip.preRollSec * demo.tickRate) - 192);
        lines.push(`mirv_cmd addAtTick ${stopTick + 16} "demo_gototick ${nextJump}"`);
      } else {
        lines.push(`mirv_cmd addAtTick ${stopTick + 32} "demo_pause; echo FragReel capture complete."`);
      }
      lines.push(``);
    });
  } else {
    lines.push(`// Standard CS2 Console Quick-Jump Aliases`);
    lines.push(`playdemo "${cleanDemo}"`);
    lines.push(``);
    clips.forEach((clip, idx) => {
      const preTicks = Math.round(clip.preRollSec * demo.tickRate);
      const jumpTick = Math.max(0, clip.startTick - preTicks);
      lines.push(
        `// Clip ${idx + 1}: ${clip.title} — ${clip.playerName} (Round ${clip.roundNumber}, ${clip.kills.length} kills)`
      );
      lines.push(
        `alias "clip${idx + 1}" "demo_gototick ${jumpTick}; spec_player \\"${clip.playerName}\\"; demo_resume"`
      );
    });
    lines.push(``);
    lines.push(`echo "Loaded ${clips.length} highlight jump aliases: type clip1 .. clip${clips.length} in console."`);
  }

  return lines.join('\n');
}
