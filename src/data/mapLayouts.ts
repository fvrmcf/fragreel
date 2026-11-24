export interface RadarPolygon {
  points: [number, number][];
  type: 'walkable' | 'cover' | 'siteA' | 'siteB' | 'spawnCT' | 'spawnT';
}

export interface MapCallout {
  name: string;
  x: number;
  y: number;
  emphasis?: boolean;
}

export interface MapLayout {
  id: string;
  displayName: string;
  backdropImage: string;
  accentTint: string;
  polygons: RadarPolygon[];
  callouts: MapCallout[];
}

export const MAP_BACKDROPS = {
  de_mirage: '/src/assets/images/backdrop_mirage_1795515637907.jpg',
  de_inferno: '/src/assets/images/backdrop_inferno_1795515645622.jpg',
  de_ancient: '/src/assets/images/backdrop_ancient_1795515639267.jpg',
};

const MIRAGE_LAYOUT: MapLayout = {
  id: 'de_mirage',
  displayName: 'Mirage',
  backdropImage: MAP_BACKDROPS.de_mirage,
  accentTint: '#E5A93B',
  polygons: [
    // T Spawn
    { points: [[800, 320], [925, 320], [925, 470], [800, 470]], type: 'spawnT' },
    // CT Spawn
    { points: [[190, 595], [340, 595], [340, 740], [190, 740]], type: 'spawnCT' },
    // A Ramp + Palace corridor
    { points: [[640, 470], [820, 470], [820, 740], [640, 740]], type: 'walkable' },
    { points: [[590, 740], [820, 740], [820, 845], [535, 845]], type: 'walkable' },
    // A Site
    { points: [[420, 620], [645, 620], [645, 810], [420, 810]], type: 'walkable' },
    { points: [[465, 650], [585, 650], [585, 765], [465, 765]], type: 'siteA' },
    // Connector + Jungle + Stairs
    { points: [[340, 560], [460, 560], [460, 660], [340, 660]], type: 'walkable' },
    { points: [[445, 455], [535, 455], [535, 620], [445, 620]], type: 'walkable' },
    // Mid + Top Mid + Window
    { points: [[475, 295], [800, 295], [800, 425], [475, 425]], type: 'walkable' },
    { points: [[375, 340], [490, 340], [490, 480], [375, 480]], type: 'walkable' },
    // Short / Catwalk to B
    { points: [[320, 210], [475, 210], [475, 355], [320, 355]], type: 'walkable' },
    // B Apartments
    { points: [[355, 105], [755, 105], [755, 200], [355, 200]], type: 'walkable' },
    // B Site + Market
    { points: [[150, 125], [360, 125], [360, 340], [150, 340]], type: 'walkable' },
    { points: [[180, 165], [295, 165], [295, 285], [180, 285]], type: 'siteB' },
    // Market to CT connector
    { points: [[185, 340], [315, 340], [315, 595], [185, 595]], type: 'walkable' },
    // Cover boxes (Tetris, Triple, Default, Ticket, Van, Bench)
    { points: [[590, 635], [625, 635], [625, 675], [590, 675]], type: 'cover' },
    { points: [[480, 680], [520, 680], [520, 720], [480, 720]], type: 'cover' },
    { points: [[540, 725], [575, 725], [575, 760], [540, 760]], type: 'cover' },
    { points: [[345, 690], [385, 690], [385, 735], [345, 735]], type: 'cover' },
    { points: [[220, 195], [260, 195], [260, 235], [220, 235]], type: 'cover' },
    { points: [[305, 155], [345, 155], [345, 190], [305, 190]], type: 'cover' },
    { points: [[565, 340], [600, 340], [600, 385], [565, 385]], type: 'cover' },
  ],
  callouts: [
    { name: 'A SITE', x: 525, y: 710, emphasis: true },
    { name: 'B SITE', x: 238, y: 225, emphasis: true },
    { name: 'PALACE', x: 690, y: 795 },
    { name: 'A RAMP', x: 705, y: 635 },
    { name: 'TETRIS', x: 605, y: 665 },
    { name: 'STAIRS', x: 485, y: 590 },
    { name: 'JUNGLE', x: 405, y: 590 },
    { name: 'CONNECTOR', x: 492, y: 505 },
    { name: 'TICKET', x: 355, y: 715 },
    { name: 'CT SPAWN', x: 265, y: 675 },
    { name: 'T SPAWN', x: 865, y: 395 },
    { name: 'WINDOW', x: 410, y: 410 },
    { name: 'MID', x: 595, y: 365 },
    { name: 'SHORT', x: 395, y: 270 },
    { name: 'B APPS', x: 545, y: 150 },
    { name: 'MARKET', x: 245, y: 445 },
  ],
};

const INFERNO_LAYOUT: MapLayout = {
  id: 'de_inferno',
  displayName: 'Inferno',
  backdropImage: MAP_BACKDROPS.de_inferno,
  accentTint: '#E5A93B',
  polygons: [
    // T Spawn
    { points: [[80, 620], [215, 620], [215, 785], [80, 785]], type: 'spawnT' },
    // CT Spawn
    { points: [[790, 215], [925, 215], [925, 375], [790, 375]], type: 'spawnCT' },
    // T Ramp + Banana
    { points: [[215, 550], [360, 550], [360, 690], [215, 690]], type: 'walkable' },
    { points: [[315, 285], [450, 285], [450, 570], [315, 570]], type: 'walkable' },
    // B Site
    { points: [[375, 115], [600, 115], [600, 315], [375, 315]], type: 'walkable' },
    { points: [[425, 155], [555, 155], [555, 275], [425, 275]], type: 'siteB' },
    // CT -> B / Construction / Ruins
    { points: [[600, 160], [795, 160], [795, 295], [600, 295]], type: 'walkable' },
    // Mid + Second Mid
    { points: [[360, 595], [630, 595], [630, 710], [360, 710]], type: 'walkable' },
    { points: [[400, 710], [665, 710], [665, 845], [400, 845]], type: 'walkable' },
    // Arch / Long A
    { points: [[605, 370], [795, 370], [795, 595], [605, 595]], type: 'walkable' },
    // Apartments + Pit + A Site
    { points: [[625, 725], [885, 725], [885, 860], [625, 860]], type: 'walkable' },
    { points: [[680, 520], [910, 520], [910, 735], [680, 735]], type: 'walkable' },
    { points: [[725, 560], [855, 560], [855, 680], [725, 680]], type: 'siteA' },
    // Library
    { points: [[820, 375], [925, 375], [925, 530], [820, 530]], type: 'walkable' },
    // Cover blocks (Fountain, Coffins, Half-wall, Car, Pit, Graveyard)
    { points: [[470, 195], [510, 195], [510, 235], [470, 235]], type: 'cover' },
    { points: [[555, 130], [590, 130], [590, 165], [555, 165]], type: 'cover' },
    { points: [[355, 345], [390, 345], [390, 385], [355, 385]], type: 'cover' },
    { points: [[765, 600], [805, 600], [805, 640], [765, 640]], type: 'cover' },
    { points: [[850, 685], [895, 685], [895, 725], [850, 725]], type: 'cover' },
  ],
  callouts: [
    { name: 'B SITE', x: 490, y: 215, emphasis: true },
    { name: 'A SITE', x: 790, y: 620, emphasis: true },
    { name: 'BANANA', x: 382, y: 445 },
    { name: 'COFFINS', x: 575, y: 145 },
    { name: 'CT SPAWN', x: 855, y: 295 },
    { name: 'T SPAWN', x: 145, y: 700 },
    { name: 'MID', x: 510, y: 650 },
    { name: '2ND MID', x: 525, y: 780 },
    { name: 'ARCH', x: 705, y: 445 },
    { name: 'LIBRARY', x: 870, y: 455 },
    { name: 'PIT', x: 870, y: 715 },
    { name: 'APARTMENTS', x: 745, y: 805 },
    { name: 'BOILER', x: 640, y: 635 },
  ],
};

const ANCIENT_LAYOUT: MapLayout = {
  id: 'de_ancient',
  displayName: 'Ancient',
  backdropImage: MAP_BACKDROPS.de_ancient,
  accentTint: '#E5A93B',
  polygons: [
    // T Spawn (South)
    { points: [[410, 810], [595, 810], [595, 920], [410, 920]], type: 'spawnT' },
    // CT Spawn (North)
    { points: [[415, 95], [590, 95], [590, 210], [415, 210]], type: 'spawnCT' },
    // Mid + Elbow
    { points: [[430, 415], [585, 415], [585, 695], [430, 695]], type: 'walkable' },
    { points: [[415, 695], [585, 695], [585, 815], [415, 815]], type: 'walkable' },
    // Red Room / House -> CT
    { points: [[450, 210], [565, 210], [565, 420], [450, 420]], type: 'walkable' },
    // Donut (A connector)
    { points: [[295, 365], [435, 365], [435, 515], [295, 515]], type: 'walkable' },
    // A Site + A Main + Temple
    { points: [[155, 210], [360, 210], [360, 420], [155, 420]], type: 'walkable' },
    { points: [[195, 245], [320, 245], [320, 365], [195, 365]], type: 'siteA' },
    { points: [[155, 420], [270, 420], [270, 745], [155, 745]], type: 'walkable' },
    { points: [[270, 660], [415, 660], [415, 755], [270, 755]], type: 'walkable' },
    // Temple back to CT
    { points: [[235, 120], [415, 120], [415, 215], [235, 215]], type: 'walkable' },
    // Cave + B Ramp + B Site
    { points: [[585, 415], [710, 415], [710, 565], [585, 565]], type: 'walkable' },
    { points: [[645, 240], [855, 240], [855, 470], [645, 470]], type: 'walkable' },
    { points: [[695, 285], [815, 285], [815, 405], [695, 405]], type: 'siteB' },
    { points: [[745, 470], [860, 470], [860, 745], [745, 745]], type: 'walkable' },
    { points: [[585, 675], [750, 675], [750, 760], [585, 760]], type: 'walkable' },
    // CT Lane to B
    { points: [[590, 155], [785, 155], [785, 245], [590, 245]], type: 'walkable' },
    // Cover pillars
    { points: [[245, 290], [278, 290], [278, 325], [245, 325]], type: 'cover' },
    { points: [[740, 330], [775, 330], [775, 365], [740, 365]], type: 'cover' },
    { points: [[345, 425], [385, 425], [385, 460], [345, 460]], type: 'cover' },
    { points: [[490, 520], [525, 520], [525, 560], [490, 560]], type: 'cover' },
  ],
  callouts: [
    { name: 'A SITE', x: 258, y: 305, emphasis: true },
    { name: 'B SITE', x: 755, y: 345, emphasis: true },
    { name: 'DONUT', x: 365, y: 440 },
    { name: 'MID', x: 508, y: 545 },
    { name: 'RED ROOM', x: 508, y: 320 },
    { name: 'CAVE', x: 648, y: 490 },
    { name: 'A MAIN', x: 210, y: 550 },
    { name: 'B RAMP', x: 802, y: 585 },
    { name: 'TEMPLE', x: 315, y: 165 },
    { name: 'CT SPAWN', x: 502, y: 152 },
    { name: 'T SPAWN', x: 502, y: 865 },
    { name: 'ELBOW', x: 508, y: 745 },
  ],
};

const DUST2_LAYOUT: MapLayout = {
  id: 'de_dust2',
  displayName: 'Dust II',
  backdropImage: MAP_BACKDROPS.de_mirage,
  accentTint: '#E5A93B',
  polygons: [
    { points: [[390, 815], [610, 815], [610, 915], [390, 915]], type: 'spawnT' },
    { points: [[490, 190], [640, 190], [640, 290], [490, 290]], type: 'spawnCT' },
    { points: [[690, 155], [880, 155], [880, 340], [690, 340]], type: 'walkable' },
    { points: [[735, 190], [845, 190], [845, 300], [735, 300]], type: 'siteA' },
    { points: [[745, 340], [885, 340], [885, 760], [745, 760]], type: 'walkable' },
    { points: [[450, 320], [625, 320], [625, 760], [450, 760]], type: 'walkable' },
    { points: [[570, 300], [745, 300], [745, 420], [570, 420]], type: 'walkable' },
    { points: [[155, 135], [375, 135], [375, 360], [155, 360]], type: 'walkable' },
    { points: [[195, 175], [320, 175], [320, 300], [195, 300]], type: 'siteB' },
    { points: [[165, 360], [320, 360], [320, 745], [165, 745]], type: 'walkable' },
    { points: [[320, 185], [490, 185], [490, 320], [320, 320]], type: 'walkable' },
    { points: [[280, 650], [750, 650], [750, 760], [280, 760]], type: 'walkable' },
    { points: [[785, 225], [820, 225], [820, 260], [785, 260]], type: 'cover' },
    { points: [[245, 215], [285, 215], [285, 255], [245, 255]], type: 'cover' },
    { points: [[520, 495], [560, 495], [560, 535], [520, 535]], type: 'cover' },
  ],
  callouts: [
    { name: 'A SITE', x: 790, y: 245, emphasis: true },
    { name: 'B SITE', x: 255, y: 235, emphasis: true },
    { name: 'LONG A', x: 815, y: 540 },
    { name: 'CATWALK', x: 645, y: 365 },
    { name: 'MID', x: 535, y: 525 },
    { name: 'B TUNNELS', x: 240, y: 535 },
    { name: 'CT SPAWN', x: 565, y: 240 },
    { name: 'T SPAWN', x: 500, y: 865 },
  ],
};

export const MAP_LAYOUTS: Record<string, MapLayout> = {
  de_mirage: MIRAGE_LAYOUT,
  de_inferno: INFERNO_LAYOUT,
  de_ancient: ANCIENT_LAYOUT,
  de_dust2: DUST2_LAYOUT,
};

export function getMapLayout(mapName: string): MapLayout {
  const key = mapName.toLowerCase().trim();
  if (MAP_LAYOUTS[key]) return MAP_LAYOUTS[key];
  if (key.includes('inferno')) return INFERNO_LAYOUT;
  if (key.includes('ancient') || key.includes('nuke') || key.includes('overpass')) {
    return {
      ...ANCIENT_LAYOUT,
      id: key,
      displayName: formatMapDisplayName(key),
    };
  }
  if (key.includes('dust') || key.includes('anubis')) {
    return {
      ...DUST2_LAYOUT,
      id: key,
      displayName: formatMapDisplayName(key),
    };
  }
  return {
    ...MIRAGE_LAYOUT,
    id: key || 'de_mirage',
    displayName: formatMapDisplayName(key || 'de_mirage'),
  };
}

export function formatMapDisplayName(mapName: string): string {
  const cleaned = mapName.replace(/^(de_|cs_|ar_)/i, '');
  if (!cleaned) return 'Mirage';
  if (cleaned.toLowerCase() === 'dust2') return 'Dust II';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
