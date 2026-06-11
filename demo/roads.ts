/**
 * Wegennet demo — geometrie uit PDOK BGT/NWB (RD EPSG:28992).
 * Centerlines: demo/wegen-data.ts (genereer via scripts/generate-demo-wegen.ts)
 */

import { DEMO_WEGEN_DATA, type DemoWeg } from './wegen-data';

export type { DemoWeg };

/** Alle demo-wegen inclusief legacy-alias voor oudere referenties. */
export const DEMO_WEGEN: DemoWeg[] = [
  ...DEMO_WEGEN_DATA,
  ...legacyWegenAliases(DEMO_WEGEN_DATA),
];

function legacyWegenAliases(wegen: DemoWeg[]): DemoWeg[] {
  const banterweg = wegen.find((w) => w.id === 'weg-banterweg-emmeloord');
  if (!banterweg) return [];
  return [
    {
      ...banterweg,
      id: 'weg-oosterringweg',
      naam: 'Oosterringweg (Banterweg)',
    },
  ];
}

export type Leglocatie = 'onder_verharding' | 'berm' | 'parallelweg' | 'vrije_oever' | 'hdd';

export interface TraceKruising {
  type: 'weg' | 'water' | 'spoor' | 'natuur' | 'bebouwing';
  naam: string;
  breedteM?: number;
  legtechniek: 'open_ontgraving' | 'hdd' | 'persing' | 'sleufloos';
  /** Gekozen uitvoeringsmethode (asfaltzagen, nanodrill, gestuurde boring, …) */
  methode?: string;
  methodeLabel?: string;
  beheerder?: string;
  vergunning?: string;
  normReferentie?: string;
  /** Afweging: gekozen oplossing + afgewezen alternatieven */
  afweging?: string[];
  /** Kruisingslocatie (RD) voor annotatie op de tekening */
  x?: number;
  y?: number;
}

export interface TraceSegment {
  volgorde: number;
  wegId: string;
  wegnaam: string;
  leglocatie: Leglocatie;
  legtechniek: 'open_ontgraving' | 'hdd' | 'persing' | 'sleufloos';
  lengteM: number;
  /** Kruisingen met gekozen uitvoeringsmethode en afweging */
  kruisingen?: TraceKruising[];
  /** Gemotiveerde afwijkingen van de richtlijnen (wat + waarom + maatregel) */
  afwijkingen?: string[];
}

/** Genereer tracépunten langs weg met offset (m) en constante diepte */
export interface TraceRouteSegment {
  wegId: string;
  offsetM: number;
  diepteNap: number;
  startChainage?: number;
  endChainage?: number;
}

/** Bouw losse tracélijnen zonder diagonalen bij kruisingen */
export function traceRouteLines(segments: TraceRouteSegment[]): [number, number, number][][] {
  return segments
    .map((seg) => traceAlongWeg(seg.wegId, seg.offsetM, seg.diepteNap, seg.startChainage ?? 0, seg.endChainage))
    .filter((line) => line.length >= 2);
}

/** Platte coördinatenlijst (som van segmenten, zonder verbindingslijnen) */
export function flattenTraceLines(lines: [number, number, number][][]): [number, number, number][] {
  return lines.flat();
}

export function traceAlongWeg(
  wegId: string,
  offsetM: number,
  diepteNap: number,
  startChainage = 0,
  endChainage?: number
): [number, number, number][] {
  const weg = DEMO_WEGEN.find((w) => w.id === wegId);
  if (!weg) return [];

  const line = weg.centerline;
  const totalLen = chainageLength(line);
  const end = endChainage ?? totalLen;
  const points: [number, number, number][] = [];
  const step = 40;

  for (let c = startChainage; c <= end; c += step) {
    const { x, y, angle } = pointAtChainage(line, c);
    const perpX = -Math.sin(angle) * offsetM;
    const perpY = Math.cos(angle) * offsetM;
    points.push([
      Math.round((x + perpX) * 10) / 10,
      Math.round((y + perpY) * 10) / 10,
      diepteNap,
    ]);
  }
  const last = pointAtChainage(line, end);
  const perpX = -Math.sin(last.angle) * offsetM;
  const perpY = Math.cos(last.angle) * offsetM;
  points.push([
    Math.round((last.x + perpX) * 10) / 10,
    Math.round((last.y + perpY) * 10) / 10,
    diepteNap,
  ]);

  return points;
}

function chainageLength(line: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < line.length; i++) {
    len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  }
  return len;
}

function pointAtChainage(line: [number, number][], chainage: number) {
  let remaining = chainage;
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1), angle };
    }
    remaining -= segLen;
  }
  const last = line[line.length - 1];
  const prev = line[line.length - 2];
  const angle = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  return { x: last[0], y: last[1], angle };
}

export function getWegById(id: string) {
  return DEMO_WEGEN.find((w) => w.id === id);
}
