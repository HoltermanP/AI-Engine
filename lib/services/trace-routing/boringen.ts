import type { DemoTrace } from '@/demo/traces';
import type { TraceKruising, TraceSegment } from '@/demo/roads';
import type { BoreMethode } from '@/lib/bore/types';
import {
  minBoogstraalM,
  maxDiepteNap,
  putAfmetingen,
} from '@/lib/bore/formulas';
import { maaiveldNapDefault } from '@/lib/calc/parse';

/**
 * Bepaalt boringen (sleufloze kruisingen) als losse objecten uit de
 * kruisingen van een tracé. Een boring is een discreet, kort traject onder
 * een obstakel — niet het hele wegsegment. De lengte wordt bepaald uit de
 * obstakelbreedte plus een norm-uitloop per zijde (werkput/intredelengte),
 * afhankelijk van de techniek.
 */

/** Methodes die werkelijk een boring/persing zijn (geen open ontgraving). */
const BORING_METHODEN = new Set([
  'gestuurde_boring',
  'persing',
  'nanodrill',
  'avegaarboring',
  'zinker',
]);

export interface Boring {
  /** Labelnummer op de tekening (B1, B2, …) */
  id: string;
  volgorde: number;
  segmentVolgorde: number;
  kruisingType: TraceKruising['type'];
  naam: string;
  /** Gekozen uitvoeringsmethode (gestuurde_boring, persing, nanodrill, …) */
  methode: string;
  methodeLabel: string;
  legtechniek: TraceKruising['legtechniek'];
  /** Breedte van het gekruiste obstakel (m) */
  obstakelBreedteM: number;
  /** Norm-uitloop per zijde (werkput/intredelengte) (m) */
  uitloopM: number;
  /** Totale boringlengte intrede → uittrede (m) */
  lengteM: number;
  diameterMm: number;
  /** Ontwerpdiepte onderkant boog (m NAP) */
  diepteNap: number;
  boogstraalM: number;
  beheerder?: string;
  vergunning?: string;
  normReferentie?: string;
  afweging?: string[];
  /** Kruisingslocatie (RD) — midden van de boring */
  x: number;
  y: number;
  /** Intredepunt op het tracé (RD) */
  intrede: [number, number];
  /** Uittredepunt op het tracé (RD) */
  uittrede: [number, number];
}

/** Map de fijnmazige kruisingsmethode naar de boorrekenmethode. */
export function boreMethodeVoor(methode: string | undefined, legtechniek: string): BoreMethode {
  if (methode === 'gestuurde_boring') return 'hdd';
  if (methode === 'persing') return 'persing';
  if (legtechniek === 'hdd') return 'hdd';
  if (legtechniek === 'persing') return 'persing';
  return 'sleufloos';
}

/** Geschatte obstakelbreedte (m) als die niet uit de kruising bekend is. */
function obstakelBreedte(kruising: TraceKruising): number {
  if (kruising.breedteM !== undefined && kruising.breedteM > 0) return kruising.breedteM;
  if (kruising.type === 'spoor') return 10; // dubbelspoor + ballastbed
  if (kruising.type === 'water') return 6; // onbekende watergang — conservatief
  // Weg: schat naar wegtype/naam
  const naam = kruising.naam.toLowerCase();
  if (naam.includes('rijksweg') || /\ba\d/.test(naam)) return 24;
  if (naam.includes('provincia') || /\bn\d/.test(naam)) return 12;
  if (naam.includes('fietspad') || naam.includes('voetpad') || naam.includes('voetgangers')) return 4;
  if (naam.includes('parkeer')) return 6;
  return 7; // gemeenteweg/woonstraat default
}

/** Minimale totale boringlengte per boorrekenmethode (m). */
function minLengte(methode: BoreMethode): number {
  if (methode === 'hdd') return 30;
  if (methode === 'persing') return 12;
  return 8;
}

function isBoring(kruising: TraceKruising): boolean {
  if (kruising.methode && BORING_METHODEN.has(kruising.methode)) return true;
  // Terugval op legtechniek wanneer de methode ontbreekt
  return kruising.legtechniek === 'hdd' || kruising.legtechniek === 'persing';
}

/** Vind het punt op een polyline het dichtst bij (x,y) plus de lokale richting (eenheidsvector). */
function richtingOpTrace(
  lijn: [number, number, number?][],
  x: number,
  y: number
): { dx: number; dy: number } {
  let beste = { d: Infinity, dx: 1, dy: 0 };
  for (let i = 1; i < lijn.length; i++) {
    const [x1, y1] = lijn[i - 1];
    const [x2, y2] = lijn[i];
    const segdx = x2 - x1;
    const segdy = y2 - y1;
    const lenSq = segdx * segdx + segdy * segdy;
    if (lenSq === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - x1) * segdx + (y - y1) * segdy) / lenSq));
    const px = x1 + t * segdx;
    const py = y1 + t * segdy;
    const d = Math.hypot(x - px, y - py);
    if (d < beste.d) {
      const len = Math.sqrt(lenSq);
      beste = { d, dx: segdx / len, dy: segdy / len };
    }
  }
  return { dx: beste.dx, dy: beste.dy };
}

interface BepaalContext {
  diepteAsNap: number;
  maaiveldNap: number;
  vereisteDekking: number;
}

function boringUitKruising(
  kruising: TraceKruising,
  segment: TraceSegment,
  index: number,
  traceLijnen: [number, number, number?][][],
  ctx: BepaalContext
): Boring | null {
  if (kruising.x === undefined || kruising.y === undefined) return null;

  const methode = boreMethodeVoor(kruising.methode, kruising.legtechniek);
  const breedte = obstakelBreedte(kruising);
  const uitloop = putAfmetingen(methode, 125).lengteM; // werkput/intredelengte per zijde
  const lengte = Math.max(minLengte(methode), Math.round(breedte + 2 * uitloop));

  const diameterMm = methode === 'hdd' ? 125 : 110;
  const boogstraal = minBoogstraalM(diameterMm, methode);
  const entryAngle = methode === 'hdd' ? 12 : methode === 'persing' ? 8 : 10;
  const diepte = maxDiepteNap(
    ctx.maaiveldNap,
    ctx.diepteAsNap,
    boogstraal,
    entryAngle,
    ctx.vereisteDekking,
    diameterMm,
    methode
  );

  // Intrede/uittrede langs de tracérichting op de kruisingslocatie
  const lijn =
    traceLijnen[segment.volgorde - 1] ?? traceLijnen[0] ?? [];
  const { dx, dy } = richtingOpTrace(lijn, kruising.x, kruising.y);
  const half = lengte / 2;
  const intrede: [number, number] = [
    Math.round((kruising.x - dx * half) * 10) / 10,
    Math.round((kruising.y - dy * half) * 10) / 10,
  ];
  const uittrede: [number, number] = [
    Math.round((kruising.x + dx * half) * 10) / 10,
    Math.round((kruising.y + dy * half) * 10) / 10,
  ];

  return {
    id: `B${index}`,
    volgorde: index,
    segmentVolgorde: segment.volgorde,
    kruisingType: kruising.type,
    naam: kruising.naam,
    methode: kruising.methode ?? methode,
    methodeLabel: kruising.methodeLabel ?? methode,
    legtechniek: kruising.legtechniek,
    obstakelBreedteM: Math.round(breedte),
    uitloopM: uitloop,
    lengteM: lengte,
    diameterMm,
    diepteNap: Math.round(diepte * 100) / 100,
    boogstraalM: boogstraal,
    beheerder: kruising.beheerder,
    vergunning: kruising.vergunning,
    normReferentie: kruising.normReferentie,
    afweging: kruising.afweging,
    x: kruising.x,
    y: kruising.y,
    intrede,
    uittrede,
  };
}

/** Leidt alle boringen (sleufloze kruisingen) van een tracé af. */
export function bepaalBoringen(trace: DemoTrace): Boring[] {
  const traceLijnen = trace.traceLines?.length ? trace.traceLines : [trace.coordinates];
  const zValues = trace.coordinates.map((c) => c[2]).filter((z): z is number => z != null);
  const diepteAsNap = zValues.length
    ? zValues.reduce((a, b) => a + b, 0) / zValues.length
    : -0.75;
  const ctx: BepaalContext = {
    diepteAsNap,
    maaiveldNap: maaiveldNapDefault(trace.projectId),
    vereisteDekking: trace.vereisteDekking,
  };

  const boringen: Boring[] = [];
  let nr = 0;
  for (const segment of trace.segmenten) {
    for (const kruising of segment.kruisingen ?? []) {
      if (!isBoring(kruising)) continue;
      const boring = boringUitKruising(kruising, segment, nr + 1, traceLijnen, ctx);
      if (boring) {
        boringen.push(boring);
        nr++;
      }
    }
  }
  return boringen;
}

/** De totale boringlengte (m) binnen één segment — voor de boorberekening. */
export function boringLengteVoorSegment(trace: DemoTrace, segment: TraceSegment): number {
  const boringen = bepaalBoringen(trace).filter((b) => b.segmentVolgorde === segment.volgorde);
  if (boringen.length === 0) return 0;
  return boringen.reduce((som, b) => som + b.lengteM, 0);
}
