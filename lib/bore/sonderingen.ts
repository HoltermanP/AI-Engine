import type { DemoTrace } from '@/demo/traces';
import type { TraceSegment } from '@/demo/roads';
import { DEMO_SONDERINGEN, type DemoSondering } from '@/demo/bro';
import { getBoreSonderingOverrides } from '@/demo/bore-data';

function segmentMidpoint(trace: DemoTrace, seg: TraceSegment): [number, number] {
  const coords = trace.coordinates;
  if (coords.length < 2) return [coords[0]?.[0] ?? 0, coords[0]?.[1] ?? 0];
  const idx = Math.min(seg.volgorde - 1, coords.length - 2);
  const a = coords[idx];
  const b = coords[idx + 1] ?? a;
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function afstand2d(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Sonderingen binnen 150 m van segment-midden, plus trace-specifieke overrides. */
export function sonderingenVoorSegment(trace: DemoTrace, seg: TraceSegment): DemoSondering[] {
  const overrides = getBoreSonderingOverrides(trace.id, seg.volgorde);
  if (overrides.length) return overrides;

  const [mx, my] = segmentMidpoint(trace, seg);
  const nearby = DEMO_SONDERINGEN.filter((s) => afstand2d(s.x, s.y, mx, my) < 150)
    .sort((a, b) => afstand2d(a.x, a.y, mx, my) - afstand2d(b.x, b.y, mx, my))
    .slice(0, 3);

  if (nearby.length >= 2) return nearby;

  return [
    ...nearby,
    {
      id: `bore-cpt-${trace.code}-seg${seg.volgorde}`,
      x: mx + 20,
      y: my - 15,
      diepte: 15,
      qc: seg.legtechniek === 'hdd' ? 18 : 14,
      grondsoort: 'zand',
      lagen: [
        { van: 0, tot: 1.2, grondsoort: 'veen', qc: 0.8 },
        { van: 1.2, tot: 4.0, grondsoort: 'klei', qc: 2.1 },
        { van: 4.0, tot: 15, grondsoort: 'zand', qc: 16 },
      ],
    },
  ];
}

export function analyseSonderingen(sonderingen: DemoSondering[]): {
  gemQc: number;
  dominantGrondsoort: string;
  grondFactor: number;
  diepeLaag: string;
} {
  if (!sonderingen.length) {
    return { gemQc: 12, dominantGrondsoort: 'zand', grondFactor: 1.0, diepeLaag: 'zand' };
  }
  const gemQc = sonderingen.reduce((s, x) => s + x.qc, 0) / sonderingen.length;
  const lagen = sonderingen.flatMap((s) => s.lagen);
  const counts = new Map<string, number>();
  for (const l of lagen) {
    counts.set(l.grondsoort, (counts.get(l.grondsoort) ?? 0) + (l.tot - l.van));
  }
  let dominant = 'zand';
  let max = 0;
  for (const [g, len] of counts) {
    if (len > max) {
      max = len;
      dominant = g;
    }
  }
  const diepe = lagen.filter((l) => l.van >= 3).sort((a, b) => b.qc - a.qc)[0]?.grondsoort ?? dominant;
  return {
    gemQc: Math.round(gemQc * 10) / 10,
    dominantGrondsoort: dominant,
    grondFactor: Math.round((gemQc / 15) * (dominant.includes('klei') ? 1.35 : dominant.includes('veen') ? 0.75 : 1) * 100) / 100,
    diepeLaag: diepe,
  };
}
