import { seededRandom, DEMO_SEED } from './seed';
import { DEMO_TRACES } from './traces';

export interface DemoSondering {
  id: string;
  x: number;
  y: number;
  diepte: number;
  qc: number;
  grondsoort: string;
  lagen: { van: number; tot: number; grondsoort: string; qc: number }[];
}

export interface DemoGrondwater {
  id: string;
  x: number;
  y: number;
  standNap: number;
  meetdatum: string;
}

const rand = seededRandom(DEMO_SEED + 7);

/** CPT-punten langs tracés op typische sonderafstand (250m) */
export const DEMO_SONDERINGEN: DemoSondering[] = DEMO_TRACES.flatMap((trace, ti) => {
  const step = Math.max(1, Math.floor(trace.coordinates.length / 3));
  return trace.coordinates
    .filter((_, i) => i % step === 0 || i === trace.coordinates.length - 1)
    .slice(0, 3)
    .map(([x, y], si) => ({
      id: `bro-cpt-${trace.code}-${si + 1}`,
      x: x + (rand() - 0.5) * 10,
      y: y + (rand() - 0.5) * 10,
      diepte: 12 + rand() * 3,
      qc: 12 + rand() * 6,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 1.0 + rand() * 0.5, grondsoort: 'veen', qc: 0.6 + rand() * 0.5 },
        { van: 1.0, tot: 3.5 + rand(), grondsoort: 'klei', qc: 1.5 + rand() * 1.5 },
        { van: 3.5, tot: 14, grondsoort: 'zand', qc: 12 + rand() * 6 },
      ],
    }));
});

export const DEMO_GRONDWATER: DemoGrondwater[] = [
  { id: 'bro-gw-001', x: 180120, y: 524740, standNap: -0.45, meetdatum: '2025-11-15' },
  { id: 'bro-gw-002', x: 181200, y: 526420, standNap: -0.52, meetdatum: '2025-11-15' },
  { id: 'bro-gw-003', x: 182400, y: 526480, standNap: -0.48, meetdatum: '2025-11-15' },
  { id: 'bro-gw-004', x: 179680, y: 526380, standNap: -0.50, meetdatum: '2025-11-15' },
  { id: 'bro-gw-005', x: 180850, y: 526450, standNap: -0.47, meetdatum: '2025-11-15' },
  { id: 'bro-gw-006', x: 181550, y: 525800, standNap: -0.44, meetdatum: '2026-01-20' },
  { id: 'bro-gw-007', x: 180450, y: 526100, standNap: -0.49, meetdatum: '2026-01-20' },
  { id: 'bro-gw-008', x: 182100, y: 525600, standNap: -0.55, meetdatum: '2026-02-10' },
  { id: 'bro-gw-009', x: 179900, y: 525200, standNap: -0.46, meetdatum: '2026-02-10' },
  { id: 'bro-gw-010', x: 181800, y: 526600, standNap: -0.51, meetdatum: '2026-03-05' },
];

export function getSonderingenForBbox(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}) {
  return DEMO_SONDERINGEN.filter(
    (s) => s.x >= bbox.minX && s.x <= bbox.maxX && s.y >= bbox.minY && s.y <= bbox.maxY
  );
}

export function getGrondwaterForBbox(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}) {
  return DEMO_GRONDWATER.filter(
    (g) => g.x >= bbox.minX && g.x <= bbox.maxX && g.y >= bbox.minY && g.y <= bbox.maxY
  );
}

/** Grondwaterput nabij tracé (geen vaste demo-coördinaten elders in NL). */
export function getGrondwaterForTrace(traceId: string): DemoGrondwater[] {
  const trace = DEMO_TRACES.find((t) => t.id === traceId);
  if (!trace?.coordinates.length) return [];
  const mid = trace.coordinates[Math.floor(trace.coordinates.length / 2)];
  return [
    {
      id: `bro-gw-${trace.code}`,
      x: Math.round((mid[0] + 25) * 10) / 10,
      y: Math.round((mid[1] - 20) * 10) / 10,
      standNap: -0.48,
      meetdatum: '2026-03-01',
    },
  ];
}
