import { seededRandom, DEMO_SEED } from './seed';
import { DEMO_TRACES } from './traces';

export type VervuildeGrondBron =
  | 'sld_bodemlocatie'
  | 'sld_aangepakt_gebied'
  | 'sld_nazorggebied'
  | 'sad_bodemonderzoek';

export interface DemoVervuildeGrondLocatie {
  id: string;
  bron: VervuildeGrondBron;
  naam: string;
  status: string;
  polygon?: [number, number][];
  x?: number;
  y?: number;
}

const rand = seededRandom(DEMO_SEED + 19);

/** Demo-vervuilde-grondlocaties nabij tracés in Noordoostpolder. */
export const DEMO_VERVUILDE_GROND: DemoVervuildeGrondLocatie[] = [
  {
    id: 'sld-demo-001',
    bron: 'sld_bodemlocatie',
    naam: 'Voormalig tankstation Schokkerweg',
    status: 'onderzoekNodig',
    polygon: [
      [180050, 526420],
      [180150, 526420],
      [180150, 526520],
      [180050, 526520],
      [180050, 526420],
    ],
  },
  {
    id: 'sld-demo-002',
    bron: 'sld_aangepakt_gebied',
    naam: 'Utiliteitszone industriehaven',
    status: 'voldoendeGesaneerd',
    polygon: [
      [181800, 525600],
      [181950, 525600],
      [181950, 525750],
      [181800, 525750],
      [181800, 525600],
    ],
  },
  {
    id: 'sad-demo-001',
    bron: 'sad_bodemonderzoek',
    naam: 'MBK-2024-0187 (quick scan)',
    status: 'geenVerontreiniging',
    x: 180420,
    y: 526180,
  },
  {
    id: 'sad-demo-002',
    bron: 'sad_bodemonderzoek',
    naam: 'MBK-2023-0442 (verificatie)',
    status: 'lichtVerontreinigd',
    x: 181120,
    y: 525920,
  },
];

export function getVervuildeGrondForBbox(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): DemoVervuildeGrondLocatie[] {
  return DEMO_VERVUILDE_GROND.filter((loc) => {
    if (loc.polygon) {
      return loc.polygon.some(
        ([x, y]) => x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
      );
    }
    if (loc.x !== undefined && loc.y !== undefined) {
      return loc.x >= bbox.minX && loc.x <= bbox.maxX && loc.y >= bbox.minY && loc.y <= bbox.maxY;
    }
    return false;
  });
}

/** Extra demo-punt langs elk tracé (beperkt risico-indicator). */
export function getVervuildeGrondForTrace(traceId: string): DemoVervuildeGrondLocatie[] {
  const trace = DEMO_TRACES.find((t) => t.id === traceId);
  if (!trace?.coordinates[0]) return getVervuildeGrondForBbox({ minX: 0, minY: 0, maxX: 300000, maxY: 620000 });
  const [x, y] = trace.coordinates[0];
  return [
    ...getVervuildeGrondForBbox({
      minX: x - 500,
      minY: y - 500,
      maxX: x + 500,
      maxY: y + 500,
    }),
    {
      id: `sad-demo-${trace.code}`,
      bron: 'sad_bodemonderzoek',
      naam: `Historisch bodemonderzoek ${trace.wegnaam}`,
      status: rand() > 0.7 ? 'lichtVerontreinigd' : 'geenVerontreiniging',
      x: x + (rand() - 0.5) * 80,
      y: y + (rand() - 0.5) * 80,
    },
  ];
}
