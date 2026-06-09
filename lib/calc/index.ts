import type { DemoTrace } from '@/demo/traces';
import type { Discipline } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import type { CalcCategorie, CalcInput, CalcResult } from './types';
import { calcElektraLs } from './elektra-ls';
import { calcElektraMs } from './elektra-ms';
import { calcStations } from './stations';
import { calcGasHd } from './gas-hd';
import { calcGasLd } from './gas-ld';
import { calcWater } from './water';
import { calcAlgemeen } from './algemeen';
import { dominantLegtechniek, maaiveldNapDefault, parseNetType } from './parse';

export type { CalcResult, CalcInput, CalcCategorie } from './types';

export function buildCalcInput(trace: DemoTrace): CalcInput {
  const parsed = parseNetType(trace.netType, trace.discipline);
  const zValues = trace.coordinates.map((c) => c[2]).filter((z): z is number => z != null);
  const gemDiepteNap =
    zValues.length > 0 ? zValues.reduce((a, b) => a + b, 0) / zValues.length : -0.65;

  return {
    lengteM: traceLengthM(trace.coordinates, trace.traceLines),
    netType: trace.netType,
    vereisteDekking: trace.vereisteDekking,
    diepteNap: gemDiepteNap,
    discipline: trace.discipline,
    legtechniek: dominantLegtechniek(trace),
    maaiveldNap: maaiveldNapDefault(trace.projectId),
    sectieMm2: parsed.sectieMm2,
    diameterMm: parsed.diameterMm,
    materiaal: parsed.materiaal,
    spanningKV: parsed.spanningKV,
  };
}

export function runCalculations(trace: DemoTrace): CalcResult[] {
  const input = buildCalcInput(trace);

  const runners: Record<Discipline, (i: CalcInput) => CalcResult[]> = {
    elektra_ls: calcElektraLs,
    elektra_ms: calcElektraMs,
    stations: calcStations,
    gas_hd: calcGasHd,
    gas_ld: calcGasLd,
    water: calcWater,
  };

  const algemeen = calcAlgemeen(input);
  const disciplineResults = runners[trace.discipline](input);
  const categorie = disciplineToCategorie(trace.discipline);

  return [...algemeen, ...disciplineResults].map((r) => ({
    ...r,
    categorie: r.categorie ?? categorie,
  }));
}

export function disciplineToCategorie(discipline: Discipline): CalcCategorie {
  if (discipline.startsWith('elektra')) return 'elektra';
  if (discipline.startsWith('gas')) return 'gas';
  if (discipline === 'water') return 'water';
  if (discipline === 'stations') return 'stations';
  return 'algemeen';
}

export function groupCalculationsByCategorie(
  berekeningen: CalcResult[]
): Record<CalcCategorie, CalcResult[]> {
  const groups: Record<CalcCategorie, CalcResult[]> = {
    elektra: [],
    gas: [],
    water: [],
    stations: [],
    algemeen: [],
  };
  for (const b of berekeningen) {
    const cat = b.categorie ?? 'algemeen';
    groups[cat].push(b);
  }
  return groups;
}

/** Of een berekening voldoet (voor UI). */
export function calcVoldoet(result: CalcResult): boolean | null {
  for (const v of Object.values(result.resultaat)) {
    if (v === 'voldoet' || (typeof v === 'boolean' && String(v).includes('voldoet'))) continue;
  }
  if ('voldoet' in result.resultaat) return Boolean(result.resultaat.voldoet);
  if ('thermischVoldoet' in result.resultaat) return Boolean(result.resultaat.thermischVoldoet);
  return null;
}
