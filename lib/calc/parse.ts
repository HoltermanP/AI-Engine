import type { Discipline } from '@/lib/db/types';
import type { DemoTrace } from '@/demo/traces';

export interface ParsedNetSpec {
  sectieMm2?: number;
  diameterMm?: number;
  materiaal?: 'Al' | 'Cu' | 'PE' | 'Staal' | 'Gietijzer';
  spanningKV?: number;
  kabelType?: string;
}

/** Parse nettype-string uit tracé (bijv. "GPLK 4x240 Al", "PE DN110", "Ø315 GI"). */
export function parseNetType(netType: string, discipline: Discipline): ParsedNetSpec {
  const t = netType.toUpperCase();
  const spec: ParsedNetSpec = {};

  const sectieMatch = netType.match(/4x(\d+)/i) ?? netType.match(/(\d+)\s*mm²/i);
  if (sectieMatch) spec.sectieMm2 = Number(sectieMatch[1]);

  const dnMatch = t.match(/DN\s*(\d+)/) ?? t.match(/PE\s*(\d+)/);
  if (dnMatch) spec.diameterMm = Number(dnMatch[1]);

  const diaMatch = netType.match(/[ØO]\s*(\d+)/i);
  if (diaMatch) spec.diameterMm = Number(diaMatch[1]);

  if (t.includes('CU')) spec.materiaal = 'Cu';
  else if (t.includes(' AL') || t.endsWith('AL')) spec.materiaal = 'Al';
  else if (t.includes('PE')) spec.materiaal = 'PE';
  else if (t.includes('GIET') || t.includes(' GI')) spec.materiaal = 'Gietijzer';
  else if (t.includes('STAAL') || t.includes(' L360')) spec.materiaal = 'Staal';

  if (t.includes('20KV') || t.includes('20 KV')) spec.spanningKV = 20;
  else if (t.includes('10KV') || t.includes('10 KV')) spec.spanningKV = 10;

  if (t.includes('GPLK')) spec.kabelType = 'GPLK';
  else if (t.includes('XLPE')) spec.kabelType = 'XLPE';

  if (discipline === 'elektra_ls' && !spec.sectieMm2) spec.sectieMm2 = 185;
  if (discipline === 'elektra_ms' && !spec.sectieMm2) spec.sectieMm2 = 300;
  if (discipline === 'gas_ld' && !spec.diameterMm) spec.diameterMm = 110;
  if (discipline === 'gas_hd' && !spec.diameterMm) spec.diameterMm = 400;
  if (discipline === 'water' && !spec.diameterMm) spec.diameterMm = 315;

  return spec;
}

export function dominantLegtechniek(trace: DemoTrace): string {
  if (!trace.segmenten.length) return 'open_ontgraving';
  const counts = new Map<string, number>();
  for (const s of trace.segmenten) {
    counts.set(s.legtechniek, (counts.get(s.legtechniek) ?? 0) + s.lengteM);
  }
  let best = 'open_ontgraving';
  let max = 0;
  for (const [tech, len] of counts) {
    if (len > max) {
      max = len;
      best = tech;
    }
  }
  return best;
}

export function maaiveldNapDefault(projectId: string): number {
  if (projectId.includes('002') || projectId.includes('almere')) return -0.15;
  return -0.18;
}
