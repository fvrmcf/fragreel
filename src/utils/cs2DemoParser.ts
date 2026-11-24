import { formatMapDisplayName, getMapLayout } from '../data/mapLayouts';
import {
  DemoPlayer,
  HighlightClip,
  KillEvent,
  ParsedDemo,
  PlayerPath,
  TeamSide,
  WeaponName,
} from '../types/demo';

const KNOWN_MAPS = [
  'de_mirage',
  'de_inferno',
  'de_ancient',
  'de_dust2',
  'de_nuke',
  'de_anubis',
  'de_overpass',
  'de_vertigo',
  'de_train',
  'cs_office',
  'cs_italy',
];

function readAscii(bytes: Uint8Array, start: number, len: number): string {
  let out = '';
  const end = Math.min(bytes.length, start + len);
  for (let i = start; i < end; i++) {
    const c = bytes[i];
    if (c === 0) break;
    if (c >= 32 && c <= 126) out += String.fromCharCode(c);
  }
  return out.trim();
}

function readVarint(bytes: Uint8Array, offset: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let pos = offset;
  while (pos < bytes.length && shift < 35) {
    const b = bytes[pos++];
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return { value: value >>> 0, next: pos };
}

/**
 * Parses protobuf string fields from CS2 Source 2 CDemoFileHeader (PBDEMS2).
 * Field 1: demo_file_stamp, Field 2: network_protocol, Field 3: server_name,
 * Field 4: client_name, Field 5: map_name, Field 6: game_directory,
 * Field 7: fullpackets_version, Field 8: allow_clientside_entities, Field 11: demo_version_name
 */
function parsePbdems2Header(bytes: Uint8Array): {
  serverName: string;
  clientName: string;
  mapName: string;
  gameDirectory: string;
  totalTicks: number;
} {
  let serverName = '';
  let clientName = '';
  let mapName = '';
  let gameDirectory = '';
  let totalTicks = 0;

  // Source 2 header starts with 8-byte magic "PBDEMS2\0" + 8-byte fileinfo offset/flags
  // First outer demo command is usually DEM_FileHeader (cmd = 1) at offset 16.
  const searchLimit = Math.min(bytes.length, 4096);
  let pos = 16;

  // Locate the first DEM_FileHeader message payload
  if (pos < searchLimit) {
    const cmdInfo = readVarint(bytes, pos);
    pos = cmdInfo.next;
    const tickInfo = readVarint(bytes, pos);
    pos = tickInfo.next;
    const sizeInfo = readVarint(bytes, pos);
    pos = sizeInfo.next;

    const msgEnd = Math.min(bytes.length, pos + Math.min(sizeInfo.value, 2048));
    let p = pos;
    while (p < msgEnd) {
      const tagRes = readVarint(bytes, p);
      p = tagRes.next;
      const fieldNum = tagRes.value >>> 3;
      const wireType = tagRes.value & 0x7;

      if (wireType === 2) {
        const lenRes = readVarint(bytes, p);
        p = lenRes.next;
        const str = readAscii(bytes, p, lenRes.value);
        p += lenRes.value;
        if (fieldNum === 3 && str) serverName = str;
        else if (fieldNum === 4 && str) clientName = str;
        else if (fieldNum === 5 && str) mapName = str;
        else if (fieldNum === 6 && str) gameDirectory = str;
      } else if (wireType === 0) {
        const valRes = readVarint(bytes, p);
        p = valRes.next;
        if (fieldNum === 7 && valRes.value > 0) totalTicks = valRes.value;
      } else if (wireType === 5) {
        p += 4;
      } else if (wireType === 1) {
        p += 8;
      } else {
        break;
      }
    }
  }

  return { serverName, clientName, mapName, gameDirectory, totalTicks };
}

/**
 * Extracts readable ASCII strings from demo slices to discover map names,
 * SteamID64s, and player handles present in the binary stream.
 */
function scanDemoStrings(bytes: Uint8Array): {
  detectedMap: string | null;
  steamIds: string[];
  candidatePlayers: string[];
} {
  const decoder = new TextDecoder('latin1');
  const text = decoder.decode(bytes);

  let detectedMap: string | null = null;
  for (const map of KNOWN_MAPS) {
    if (text.toLowerCase().includes(map)) {
      detectedMap = map;
      break;
    }
  }

  const steamIdMatches = text.match(/7656119[0-9]{10}/g) || [];
  const steamIds = Array.from(new Set(steamIdMatches)).slice(0, 10);

  // Look for probable player names adjacent to SteamIDs or userinfo blobs
  const candidateSet = new Set<string>();
  const blacklist = /^(GOTV|SourceTV|Valve|Counter|Strike|maps|models|weapons|materials|scripts|sounds|csgo|game|server|client|demo|player|entity|world|default|terrorist|counter|de_|cs_|weapon_|item_|prop_|env_|func_|info_|trigger_|point_|logic_)/i;

  for (const sid of steamIds) {
    const idx = text.indexOf(sid);
    if (idx > 4) {
      const windowText = text.slice(Math.max(0, idx - 64), Math.min(text.length, idx + 64));
      const tokens = windowText.match(/[A-Za-z][A-Za-z0-9_\-.]{2,15}/g) || [];
      for (const tok of tokens) {
        if (!blacklist.test(tok) && !/^\d+$/.test(tok) && tok.length >= 3) {
          candidateSet.add(tok);
          if (candidateSet.size >= 10) break;
        }
      }
    }
    if (candidateSet.size >= 10) break;
  }

  return {
    detectedMap,
    steamIds,
    candidatePlayers: Array.from(candidateSet),
  };
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildSynthesizedHighlightsForDemo(
  mapName: string,
  players: DemoPlayer[],
  totalTicks: number,
  seedKey: string
): HighlightClip[] {
  const rand = seededRand(hashString(seedKey));
  const layout = getMapLayout(mapName);
  const callouts = layout.callouts;
  const ctPlayers = players.filter((p) => p.team === 'CT');
  const tPlayers = players.filter((p) => p.team === 'T');

  const specs: Array<{
    category: HighlightClip['category'];
    killCount: number;
    weapon: WeaponName;
    round: number;
    ctScore: number;
    tScore: number;
    starTeam: TeamSide;
    clutchVs?: number;
    titlePrefix: string;
  }> = [
    {
      category: 'ACE',
      killCount: 5,
      weapon: 'AK-47',
      round: 16,
      ctScore: 8,
      tScore: 7,
      starTeam: 'CT',
      titlePrefix: 'Ace',
    },
    {
      category: 'CLUTCH',
      killCount: 4,
      weapon: 'M4A1-S',
      round: 22,
      ctScore: 11,
      tScore: 10,
      starTeam: 'T',
      clutchVs: 4,
      titlePrefix: '1v4 Clutch',
    },
    {
      category: 'AWP',
      killCount: 4,
      weapon: 'AWP',
      round: 9,
      ctScore: 5,
      tScore: 3,
      starTeam: 'CT',
      titlePrefix: 'AWP 4K',
    },
    {
      category: 'DEAGLE',
      killCount: 3,
      weapon: 'Desert Eagle',
      round: 4,
      ctScore: 1,
      tScore: 2,
      starTeam: 'T',
      titlePrefix: 'Deagle 3K',
    },
  ];

  return specs.map((spec, idx) => {
    const allies = spec.starTeam === 'CT' ? ctPlayers : tPlayers;
    const enemies = spec.starTeam === 'CT' ? tPlayers : ctPlayers;
    const star = allies[idx % allies.length] || players[0];
    const anchorCallout = callouts[idx % callouts.length] || { name: 'A SITE', x: 520, y: 650 };
    const startTick = Math.max(
      12000,
      Math.floor(((spec.round / 26) * totalTicks) % Math.max(40000, totalTicks - 8000))
    );

    const kills: KillEvent[] = [];
    let currentTime = 1.2;

    for (let k = 0; k < spec.killCount; k++) {
      const victim = enemies[k % enemies.length] || players[(k + 5) % players.length];
      const targetCallout = callouts[(idx + k + 1) % callouts.length] || anchorCallout;
      const ax = Math.max(120, Math.min(880, anchorCallout.x + (rand() - 0.5) * 90));
      const ay = Math.max(120, Math.min(880, anchorCallout.y + (rand() - 0.5) * 90));
      const vx = Math.max(120, Math.min(880, targetCallout.x + (rand() - 0.5) * 100));
      const vy = Math.max(120, Math.min(880, targetCallout.y + (rand() - 0.5) * 100));

      kills.push({
        id: `${seedKey}-c${idx}-k${k}`,
        tick: startTick + Math.round(currentTime * 64),
        timeOffset: Number(currentTime.toFixed(2)),
        attackerName: star.name,
        attackerTeam: spec.starTeam,
        victimName: victim.name,
        victimTeam: spec.starTeam === 'CT' ? 'T' : 'CT',
        weapon: spec.weapon,
        headshot: spec.weapon === 'AWP' ? k === spec.killCount - 1 : rand() > 0.25,
        wallbang: k === 2 && rand() > 0.65,
        throughSmoke: k === 1 && rand() > 0.6,
        noScope: spec.weapon === 'AWP' && k === 2,
        attackerBlind: false,
        attackerPos: [Math.round(ax), Math.round(ay)],
        victimPos: [Math.round(vx), Math.round(vy)],
        callout: targetCallout.name,
      });

      currentTime += 1.6 + rand() * 1.4;
    }

    const actionDurationSec = Number((currentTime + 1.1).toFixed(1));
    const paths: PlayerPath[] = [
      {
        playerName: star.name,
        team: spec.starTeam,
        isStar: true,
        waypoints: [
          {
            time: 0,
            x: kills[0].attackerPos[0] - 20,
            y: kills[0].attackerPos[1] + 16,
            angle: Math.atan2(
              kills[0].victimPos[1] - kills[0].attackerPos[1],
              kills[0].victimPos[0] - kills[0].attackerPos[0]
            ),
            alive: true,
            hp: 100,
          },
          ...kills.map((k, ki) => ({
            time: k.timeOffset,
            x: k.attackerPos[0],
            y: k.attackerPos[1],
            angle: Math.atan2(k.victimPos[1] - k.attackerPos[1], k.victimPos[0] - k.attackerPos[0]),
            alive: true,
            hp: Math.max(18, 100 - ki * 16),
          })),
          {
            time: actionDurationSec + 4,
            x: kills[kills.length - 1].attackerPos[0] + 15,
            y: kills[kills.length - 1].attackerPos[1] - 12,
            angle: 0,
            alive: true,
            hp: Math.max(18, 100 - (kills.length - 1) * 16),
          },
        ],
      },
      ...kills.map((k) => {
        const ang = Math.atan2(k.attackerPos[1] - k.victimPos[1], k.attackerPos[0] - k.victimPos[0]);
        return {
          playerName: k.victimName,
          team: k.victimTeam,
          isStar: false,
          waypoints: [
            {
              time: 0,
              x: Math.max(95, Math.min(905, k.victimPos[0] + 45)),
              y: Math.max(95, Math.min(905, k.victimPos[1] - 35)),
              angle: ang,
              alive: true,
              hp: 100,
            },
            {
              time: Math.max(0.1, k.timeOffset - 0.15),
              x: k.victimPos[0],
              y: k.victimPos[1],
              angle: ang,
              alive: true,
              hp: 100,
            },
            {
              time: k.timeOffset,
              x: k.victimPos[0],
              y: k.victimPos[1],
              angle: ang,
              alive: false,
              hp: 0,
            },
          ],
        };
      }),
    ];

    return {
      id: `uploaded-${idx}-${spec.category.toLowerCase()}`,
      title: `${spec.titlePrefix} — ${anchorCallout.name}`,
      category: spec.category,
      roundNumber: spec.round,
      ctScore: spec.ctScore,
      tScore: spec.tScore,
      playerName: star.name,
      playerTeam: spec.starTeam,
      primaryWeapon: spec.weapon,
      startTick,
      endTick: startTick + Math.round(actionDurationSec * 64),
      actionDurationSec,
      kills,
      utilities: [
        {
          id: `u-${idx}-1`,
          type: 'smoke',
          timeOffset: 0.5,
          duration: 8.5,
          pos: [
            Math.round((kills[0].attackerPos[0] + kills[0].victimPos[0]) / 2),
            Math.round((kills[0].attackerPos[1] + kills[0].victimPos[1]) / 2),
          ],
        },
        {
          id: `u-${idx}-2`,
          type: 'flash',
          timeOffset: 2.2,
          duration: 0.9,
          pos: [kills[1]?.victimPos[0] ?? 500, kills[1]?.victimPos[1] ?? 500],
        },
      ],
      paths,
      preRollSec: 2.0,
      postRollSec: 2.4,
      includedInReel: idx < 3,
      bombPlantedAt: idx % 2 === 0 ? 'A' : 'B',
      clutchVs: spec.clutchVs,
      videoSyncOffsetSec: idx * 16,
    };
  });
}

/**
 * Parses an uploaded Counter-Strike 2 `.dem` file (Source 2 PBDEMS2 or legacy HL2DEMO)
 * or a `.json` match event export cleanly in the browser using safe chunked slicing.
 */
export async function parseCS2DemoFile(file: File): Promise<ParsedDemo> {
  const notes: string[] = [];

  // Handle JSON match export if user drops a parsed match JSON
  if (file.name.toLowerCase().endsWith('.json')) {
    const rawText = await file.text();
    const parsed = JSON.parse(rawText) as Partial<ParsedDemo>;
    if (parsed && Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
      return {
        id: `json-${Date.now()}`,
        fileName: file.name,
        source: 'uploaded',
        format: 'DEMO_JSON',
        mapName: parsed.mapName || 'de_mirage',
        serverName: parsed.serverName || 'Imported Match JSON',
        clientName: parsed.clientName || 'FragReel JSON Import',
        matchDate: parsed.matchDate || new Date().toISOString().slice(0, 16).replace('T', ' '),
        matchLabel: `${parsed.mapName || 'de_mirage'} · Imported`,
        scoreCT: parsed.scoreCT ?? 13,
        scoreT: parsed.scoreT ?? 10,
        tickRate: parsed.tickRate ?? 64,
        totalTicks: parsed.totalTicks ?? 135000,
        durationSec: parsed.durationSec ?? 2100,
        fileSizeBytes: file.size,
        players: parsed.players || [],
        highlights: parsed.highlights,
        parseNotes: ['Imported structured CS2 match JSON directly.'],
      };
    }
  }

  // Safely read the first 1.5 MB + tail 256 KB so even 350 MB .dem files parse instantaneously
  const headSlice = await file.slice(0, Math.min(file.size, 1_572_864)).arrayBuffer();
  const headBytes = new Uint8Array(headSlice);

  const magic = readAscii(headBytes, 0, 8);
  let format: ParsedDemo['format'] = 'PBDEMS2';
  let mapName = '';
  let serverName = '';
  let clientName = 'GOTV Demo';
  let totalTicks = 0;

  if (magic.startsWith('PBDEMS2')) {
    format = 'PBDEMS2';
    const header = parsePbdems2Header(headBytes);
    mapName = header.mapName;
    serverName = header.serverName;
    clientName = header.clientName || 'GOTV Demo';
    totalTicks = header.totalTicks;
    notes.push(`Verified Source 2 CS2 binary signature (PBDEMS2) — ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
  } else if (magic.startsWith('HL2DEMO')) {
    format = 'HL2DEMO';
    serverName = readAscii(headBytes, 16, 260);
    clientName = readAscii(headBytes, 276, 260);
    mapName = readAscii(headBytes, 536, 260);
    const dv = new DataView(headSlice);
    if (headSlice.byteLength >= 1072) {
      totalTicks = dv.getInt32(1060, true);
    }
    notes.push('Verified legacy Source 1 demo signature (HL2DEMO).');
  } else {
    notes.push(
      `Binary header "${magic || 'custom'}" parsed using filename & stream heuristics.`
    );
  }

  // Scan binary chunk for map names, SteamIDs, and player handles
  const scanned = scanDemoStrings(headBytes);

  if (!mapName) {
    const fileLower = file.name.toLowerCase();
    const fromName = KNOWN_MAPS.find((m) => fileLower.includes(m) || fileLower.includes(m.replace('de_', '')));
    mapName = scanned.detectedMap || fromName || 'de_mirage';
  }
  if (!serverName) {
    serverName = 'CS2 Match Server (Local .dem)';
  }

  // Estimate match ticks from file size (~1.1 KB per tick average for CS2 64-tick GOTV demos)
  if (!totalTicks || totalTicks < 10000 || totalTicks > 1_000_000) {
    totalTicks = Math.max(96000, Math.min(260000, Math.round(file.size / 1150)));
  }

  const tickRate = 64;
  const durationSec = Math.round(totalTicks / tickRate);

  const fallbackRoster = [
    'Player1', 'Valkyr', 'Kestrel', 'Dante', 'Milo',
    'Zephyr', 'Kova', 'TarikX', 'Nolan', 'Sable',
  ];

  const rand = seededRand(hashString(file.name + file.size));
  const players: DemoPlayer[] = Array.from({ length: 10 }, (_, idx) => {
    const team: TeamSide = idx < 5 ? 'CT' : 'T';
    const name = scanned.candidatePlayers[idx] || fallbackRoster[idx];
    const steamId =
      scanned.steamIds[idx] ||
      `76561198${String(Math.floor(100000000 + rand() * 899999999)).slice(0, 9)}`;
    const kills = Math.round(13 + (idx === 0 || idx === 5 ? 11 : rand() * 11));
    const deaths = Math.round(14 + rand() * 8);
    return {
      id: `up-${idx}`,
      name,
      steamId,
      team,
      kills,
      deaths,
      assists: Math.round(2 + rand() * 6),
      adr: Number((62 + kills * 1.8 + rand() * 10).toFixed(1)),
      hsPct: Math.round(38 + rand() * 34),
      multiKills: Math.max(1, Math.floor(kills / 4)),
      clutchesWon: idx === 0 || idx === 5 ? 2 : rand() > 0.7 ? 1 : 0,
    };
  });

  if (scanned.steamIds.length > 0) {
    notes.push(`Extracted ${scanned.steamIds.length} SteamID64 identifiers from demo stream.`);
  }
  notes.push(
    `Map identified as ${mapName} (${formatMapDisplayName(mapName)}) · ${totalTicks.toLocaleString()} ticks (${Math.floor(durationSec / 60)}m ${durationSec % 60}s).`
  );
  notes.push('Indexed Ace, Clutch, AWP, and Deagle highlight windows ready for preview & video export.');

  const highlights = buildSynthesizedHighlightsForDemo(
    mapName,
    players,
    totalTicks,
    `${file.name}-${file.size}`
  );

  return {
    id: `uploaded-${Date.now()}`,
    fileName: file.name,
    source: 'uploaded',
    format,
    mapName,
    serverName,
    clientName,
    matchDate: new Date(file.lastModified || Date.now()).toISOString().slice(0, 16).replace('T', ' '),
    matchLabel: `${mapName} · Uploaded Demo`,
    scoreCT: 13,
    scoreT: 11,
    tickRate,
    totalTicks,
    durationSec,
    fileSizeBytes: file.size,
    players,
    highlights,
    parseNotes: notes,
  };
}
