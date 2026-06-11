import type { DemoSondering } from '@/demo/bro';
import type { BoreMethode, BoreSegmentInput, BoreTrajectory } from '@/lib/bore/types';
import type { DemoTrace } from '@/demo/traces';
import type { TraceSegment } from '@/demo/roads';
import { parseNetType } from '@/lib/calc/parse';
import { maaiveldNapDefault } from '@/lib/calc/parse';
import { analyseSonderingen, sonderingenVoorSegment } from '@/lib/bore/sonderingen';
import {
  maxDiepteNap,
  minBoogstraalM,
  putAfmetingen,
  booglengteM,
} from '@/lib/bore/formulas';

export const SLEUFLOZE_METHODEN: BoreMethode[] = ['hdd', 'persing', 'sleufloos'];

export function isSleufloosSegment(seg: TraceSegment): seg is TraceSegment & { legtechniek: BoreMethode } {
  return SLEUFLOZE_METHODEN.includes(seg.legtechniek as BoreMethode);
}

export function sleuflozeSegmenten(trace: DemoTrace): TraceSegment[] {
  return trace.segmenten.filter(isSleufloosSegment);
}

/** Fictieve sonderingen per trace/segment (rijkere demo-data). */
const BORE_SONDERING_OVERRIDES: Record<string, DemoSondering[]> = {
  'trace-ls-008:1': [
    {
      id: 'cpt-oostvaarders-01',
      x: 181420,
      y: 526180,
      diepte: 18,
      qc: 22,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 0.8, grondsoort: 'veen', qc: 0.5 },
        { van: 0.8, tot: 2.5, grondsoort: 'klei', qc: 1.8 },
        { van: 2.5, tot: 6.0, grondsoort: 'klei', qc: 3.2 },
        { van: 6.0, tot: 18, grondsoort: 'zand', qc: 22 },
      ],
    },
    {
      id: 'cpt-oostvaarders-02',
      x: 181680,
      y: 526220,
      diepte: 16,
      qc: 19,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 1.0, grondsoort: 'veen', qc: 0.7 },
        { van: 1.0, tot: 3.5, grondsoort: 'klei', qc: 2.0 },
        { van: 3.5, tot: 16, grondsoort: 'zand', qc: 19 },
      ],
    },
    {
      id: 'cpt-oostvaarders-03',
      x: 181920,
      y: 526260,
      diepte: 17,
      qc: 20,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 1.2, grondsoort: 'veen', qc: 0.6 },
        { van: 1.2, tot: 4.0, grondsoort: 'klei', qc: 2.5 },
        { van: 4.0, tot: 17, grondsoort: 'zand', qc: 20 },
      ],
    },
  ],
  'trace-ls-002:2': [
    {
      id: 'cpt-almere-weg-01',
      x: 180280,
      y: 524920,
      diepte: 14,
      qc: 16,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 1.5, grondsoort: 'veen', qc: 0.9 },
        { van: 1.5, tot: 14, grondsoort: 'zand', qc: 16 },
      ],
    },
  ],
};

export function getBoreSonderingOverrides(traceId: string, volgorde: number): DemoSondering[] {
  return BORE_SONDERING_OVERRIDES[`${traceId}:${volgorde}`] ?? [];
}

function defaultTrajectory(
  methode: BoreMethode,
  buisDiameterMm: number,
  maaiveldNap: number,
  diepteAsNap: number,
  vereisteDekking: number,
): BoreTrajectory {
  const minR = minBoogstraalM(buisDiameterMm, methode);
  const entryAngle = methode === 'hdd' ? 12 : methode === 'persing' ? 8 : 10;
  const exitAngle = entryAngle;
  const maxDiepte = maxDiepteNap(
    maaiveldNap,
    diepteAsNap,
    minR,
    entryAngle,
    vereisteDekking,
    buisDiameterMm,
    methode,
  );
  const entryPut = putAfmetingen(methode, buisDiameterMm);
  const exitPut = putAfmetingen(methode, buisDiameterMm);

  return {
    entryAngleDeg: entryAngle,
    exitAngleDeg: exitAngle,
    maxDiepteNap: maxDiepte,
    boogstraalM: minR,
    booglengteM: booglengteM(minR, entryAngle) + booglengteM(minR, exitAngle),
    entryPutL: entryPut.lengteM,
    exitPutL: exitPut.lengteM,
    entryPutB: entryPut.breedteM,
    exitPutB: exitPut.breedteM,
    entryPutD: entryPut.diepteM,
    exitPutD: exitPut.diepteM,
  };
}

export function buildBoreSegmentInput(trace: DemoTrace, seg: TraceSegment): BoreSegmentInput | null {
  if (!isSleufloosSegment(seg)) return null;

  const parsed = parseNetType(trace.netType, trace.discipline);
  const buisDiameterMm = parsed.diameterMm ?? (seg.legtechniek === 'hdd' ? 125 : 110);
  const productDiameterMm = Math.max(buisDiameterMm - 20, 90);
  const maaiveldNap = maaiveldNapDefault(trace.projectId);
  const zValues = trace.coordinates.map((c) => c[2]).filter((z): z is number => z != null);
  const diepteAsNap = zValues.length
    ? zValues.reduce((a, b) => a + b, 0) / zValues.length
    : -0.75;

  const sonderingen = sonderingenVoorSegment(trace, seg);
  const grond = analyseSonderingen(sonderingen);
  const trajectory = defaultTrajectory(
    seg.legtechniek,
    buisDiameterMm,
    maaiveldNap,
    diepteAsNap,
    trace.vereisteDekking,
  );

  return {
    volgorde: seg.volgorde,
    methode: seg.legtechniek,
    wegnaam: seg.wegnaam,
    lengteM: seg.lengteM,
    buisDiameterMm,
    productDiameterMm,
    maaiveldNap,
    diepteAsNap,
    vereisteDekking: trace.vereisteDekking,
    trajectory,
    sonderingen,
    grondwaterNap: -0.48,
    grondFactor: grond.grondFactor,
    dominantGrondsoort: grond.dominantGrondsoort,
  };
}

/** Demo mixed-segment trace: open + persing + HDD */
export const DEMO_MIXED_BORE_TRACE_ID = 'trace-ls-002';
