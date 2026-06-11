/**
 * Kabelcatalogus elektra LS/MS — de assets waar een netarchitect uit kiest.
 *
 * Belastbaarheden sluiten aan op lib/calc/formulas.ts (NEN 1010 tabel 52,
 * ingegraven) en lib/calc/thermisch.ts (IEC 60287). Het label is
 * parse.ts-compatibel zodat DemoTrace.netType en de hele bestaande keten
 * (tekeningen, calculatie, materiaallijst) blijven werken.
 */

import type { Netvlak } from './types';
import { belastbaarheidLsA, spanningsvalLsV, spanningsvalMsPct } from '@/lib/calc/formulas';

export interface KabelSpec {
  id: string;
  /** parse.ts-compatibel, bijv. "XLPE 4x240 Al" of "10kV XLPE 3x1x240 Al" */
  label: string;
  netvlak: Netvlak;
  isolatie: 'GPLK' | 'XLPE';
  materiaal: 'Al' | 'Cu';
  sectieMm2: number;
  aders: number;
  /** Belastbaarheid ingegraven (A) */
  belastbaarheidGrondA: number;
  diameterMm: number;
  gewichtKgPerM: number;
  maxTrekkrachtKN: number;
  /** Standaard haspellengte (m) — bepaalt mof-afstanden */
  haspelLengteM: number;
  kostprijsPerM: number;
  normReferentie: string;
}

const LS_NORM = 'NEN 1010 / NEN 7171';
const MS_NORM = 'IEC 60287 / NEN 7171';

function lsKabel(
  sectie: number,
  materiaal: 'Al' | 'Cu',
  opts: { diameterMm: number; gewicht: number; prijs: number },
): KabelSpec {
  return {
    id: `ls-xlpe-4x${sectie}-${materiaal.toLowerCase()}`,
    label: `XLPE 4x${sectie} ${materiaal}`,
    netvlak: 'LS',
    isolatie: 'XLPE',
    materiaal,
    sectieMm2: sectie,
    aders: 4,
    belastbaarheidGrondA: belastbaarheidLsA(sectie, materiaal),
    diameterMm: opts.diameterMm,
    gewichtKgPerM: opts.gewicht,
    // Trekkous: ~50 N/mm² Cu, ~30 N/mm² Al over de aderdoorsnede
    maxTrekkrachtKN: Math.round(((materiaal === 'Cu' ? 50 : 30) * sectie * 4) / 1000),
    haspelLengteM: 500,
    kostprijsPerM: opts.prijs,
    normReferentie: LS_NORM,
  };
}

/** IEC 60287-indicatie belastbaarheid MS-kabel ingegraven (driehoek, Rbo 1.0). */
const MS_BELASTBAARHEID: Record<'Al' | 'Cu', Record<number, number>> = {
  Al: { 95: 200, 150: 260, 240: 345, 400: 450, 630: 580 },
  Cu: { 95: 260, 150: 335, 240: 445, 400: 575, 630: 740 },
};

function msKabel(
  sectie: number,
  materiaal: 'Al' | 'Cu',
  spanningKV: 10 | 20,
  opts: { diameterMm: number; gewicht: number; prijs: number },
): KabelSpec {
  return {
    id: `ms-${spanningKV}kv-xlpe-3x1x${sectie}-${materiaal.toLowerCase()}`,
    label: `${spanningKV}kV XLPE 3x1x${sectie} ${materiaal}`,
    netvlak: 'MS',
    isolatie: 'XLPE',
    materiaal,
    sectieMm2: sectie,
    aders: 3,
    belastbaarheidGrondA: MS_BELASTBAARHEID[materiaal][sectie] ?? 300,
    diameterMm: opts.diameterMm,
    gewichtKgPerM: opts.gewicht,
    maxTrekkrachtKN: Math.round(((materiaal === 'Cu' ? 50 : 30) * sectie * 3) / 1000),
    haspelLengteM: 1000,
    kostprijsPerM: opts.prijs,
    normReferentie: MS_NORM,
  };
}

export const KABEL_CATALOGUS: KabelSpec[] = [
  // LS — XLPE 4-aderig Al (standaard distributiekabel)
  lsKabel(95, 'Al', { diameterMm: 34, gewicht: 1.5, prijs: 14 }),
  lsKabel(150, 'Al', { diameterMm: 40, gewicht: 2.1, prijs: 18 }),
  lsKabel(185, 'Al', { diameterMm: 44, gewicht: 2.5, prijs: 22 }),
  lsKabel(240, 'Al', { diameterMm: 49, gewicht: 3.1, prijs: 27 }),
  lsKabel(300, 'Al', { diameterMm: 54, gewicht: 3.8, prijs: 33 }),
  // LS — Cu-varianten (zwaardere belasting / korte strengen)
  lsKabel(150, 'Cu', { diameterMm: 40, gewicht: 4.6, prijs: 38 }),
  lsKabel(240, 'Cu', { diameterMm: 49, gewicht: 7.2, prijs: 58 }),
  // MS 10 kV — XLPE 3×1-aderig
  msKabel(95, 'Al', 10, { diameterMm: 66, gewicht: 3.2, prijs: 32 }),
  msKabel(150, 'Al', 10, { diameterMm: 72, gewicht: 3.9, prijs: 38 }),
  msKabel(240, 'Al', 10, { diameterMm: 80, gewicht: 4.9, prijs: 47 }),
  msKabel(400, 'Al', 10, { diameterMm: 92, gewicht: 6.4, prijs: 62 }),
  msKabel(630, 'Al', 10, { diameterMm: 104, gewicht: 8.6, prijs: 84 }),
  msKabel(240, 'Cu', 10, { diameterMm: 80, gewicht: 8.8, prijs: 86 }),
  // MS 20 kV
  msKabel(150, 'Al', 20, { diameterMm: 78, gewicht: 4.3, prijs: 44 }),
  msKabel(240, 'Al', 20, { diameterMm: 86, gewicht: 5.4, prijs: 54 }),
  msKabel(400, 'Al', 20, { diameterMm: 98, gewicht: 7.0, prijs: 70 }),
];

export function getKabelSpec(id: string): KabelSpec | undefined {
  return KABEL_CATALOGUS.find((k) => k.id === id);
}

export function kabelsVoorNetvlak(netvlak: Netvlak, spanningKV?: number): KabelSpec[] {
  return KABEL_CATALOGUS.filter((k) => {
    if (k.netvlak !== netvlak) return false;
    if (netvlak === 'MS' && spanningKV) return k.label.startsWith(`${spanningKV}kV`);
    return true;
  });
}

export interface KabelAdvies {
  advies: KabelSpec;
  alternatieven: KabelSpec[];
  motivatie: string;
  spanningsvalPct: number;
  belastingsgraadPct: number;
  voldoet: boolean;
}

/**
 * Kies de lichtste kabel die de ontwerpstroom draagt (met 25% reserve op de
 * belastbaarheid) én binnen de spanningsvalgrens blijft over de stranglengte.
 */
export function vindKabelAdvies(opts: {
  netvlak: Netvlak;
  belastingA: number;
  lengteM: number;
  maxSpanningsvalPct: number;
  spanningKV?: number;
}): KabelAdvies {
  const kandidaten = kabelsVoorNetvlak(opts.netvlak, opts.spanningKV).sort(
    (a, b) => a.sectieMm2 - b.sectieMm2 || a.kostprijsPerM - b.kostprijsPerM,
  );

  const beoordeel = (k: KabelSpec) => {
    const rho = k.materiaal === 'Cu' ? 0.0175 : 0.028;
    const spanningsvalPct =
      opts.netvlak === 'LS'
        ? (spanningsvalLsV(opts.lengteM, opts.belastingA, k.sectieMm2, rho) / 400) * 100
        : spanningsvalMsPct(opts.lengteM, opts.belastingA, k.sectieMm2, opts.spanningKV ?? 10);
    const belastingsgraadPct = (opts.belastingA / k.belastbaarheidGrondA) * 100;
    const voldoet = belastingsgraadPct <= 80 && spanningsvalPct <= opts.maxSpanningsvalPct;
    return { spanningsvalPct, belastingsgraadPct, voldoet };
  };

  const passend = kandidaten.filter((k) => beoordeel(k).voldoet);
  const advies = passend[0] ?? kandidaten[kandidaten.length - 1];
  const b = beoordeel(advies);
  const alternatieven = (passend.length ? passend.slice(1, 4) : kandidaten.slice(-3));

  const motivatie = b.voldoet
    ? `${advies.label}: belastingsgraad ${b.belastingsgraadPct.toFixed(0)}% (max. 80% ontwerpreserve), spanningsval ${b.spanningsvalPct.toFixed(1)}% over ${opts.lengteM.toFixed(0)} m (grens ${opts.maxSpanningsvalPct}%). Lichtste passende doorsnede uit de catalogus (${advies.normReferentie}).`
    : `Geen catalogi-kabel voldoet bij ${opts.belastingA.toFixed(0)} A over ${opts.lengteM.toFixed(0)} m — zwaarste optie ${advies.label} geadviseerd; overweeg extra streng, kortere stranglengte of extra station.`;

  return {
    advies,
    alternatieven,
    motivatie,
    spanningsvalPct: Math.round(b.spanningsvalPct * 10) / 10,
    belastingsgraadPct: Math.round(b.belastingsgraadPct),
    voldoet: b.voldoet,
  };
}
