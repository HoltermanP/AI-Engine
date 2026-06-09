/**
 * Thermische berekening (ampacity) van een 3-fasen MS-kabelcircuit in de grond,
 * conform IEC 60287 (vereenvoudigd, gedocumenteerd).
 *
 * Hoofdformule (IEC 60287-1-1, vereenvoudigd zonder mantelverliesfactoren):
 *   I = √( (Δθ − W_d·(0,5·T1 + T2 + T3 + T4)) / (R_ac·(T1 + T2 + T3 + n·T4)) )
 * met n = 1 (1-aderige kabel per fase).
 *
 * Vereenvoudigingen (gedocumenteerd):
 * - W_d = 0: diëlektrische verliezen verwaarloosbaar voor XLPE ≤ 20 kV
 *   (IEC 60287-1-1 stelt meenemen pas verplicht vanaf veel hogere Um).
 * - λ1 = λ2 = 0: single-point bonding/cross-bonding aangenomen, geen wapening.
 * - T2 = 0: 1-aderige kabel zonder wapening (geen bedding tussen scherm en wapening).
 * - Skin-effect ys via IEC 60287-1-1 (ks = 1); proximity-effect yp verwaarloosd
 *   (klein t.o.v. ys voor doorsneden ≤ 630 mm²).
 * - T4 via IEC 60287-2-1: T4 = ρ_bodem/(2π)·ln(4·L/De) per kabel (u = 2L/De groot);
 *   onderlinge verwarming van naastliggende kabels/circuits via de
 *   spiegelbeeldmethode: ΔT4 = ρ/(2π)·ln(d'_pk/d_pk) met d'_pk = √((2L)² + s²).
 * - Driehoek: drie kabels rakend op gelijke diepte; vlak: hart-op-hart afstand s.
 */

import { normVermelding } from '@/lib/normen';

/** Beschikbare geleiderdoorsneden [mm²]. */
export type GeleiderDoorsnede = 95 | 150 | 240 | 400 | 630;

/** Geleidermateriaal. */
export type GeleiderMateriaal = 'Cu' | 'Al';

/** Legpatroon van de drie 1-aderige kabels. */
export type Legpatroon = 'driehoek' | 'vlak';

/**
 * DC-weerstand bij 20 °C [Ω/km] per IEC 60228 (klasse 2, rond verdicht).
 */
export const R_DC20_OHM_PER_KM: Record<GeleiderMateriaal, Record<GeleiderDoorsnede, number>> = {
  Cu: { 95: 0.193, 150: 0.124, 240: 0.0754, 400: 0.047, 630: 0.0283 },
  Al: { 95: 0.32, 150: 0.206, 240: 0.125, 400: 0.0778, 630: 0.0469 },
};

/** Temperatuurcoëfficiënt weerstand α [1/K] (IEC 60287-1-1 tabel 1). */
export const ALPHA_PER_K: Record<GeleiderMateriaal, number> = {
  Cu: 0.00393,
  Al: 0.00403,
};

/** Thermische soortelijke weerstand XLPE-isolatie [K·m/W] (IEC 60287-2-1). */
const RHO_XLPE = 3.5;
/** Thermische soortelijke weerstand PE-buitenmantel [K·m/W] (IEC 60287-2-1). */
const RHO_PE = 3.5;

/** Invoer thermische berekening. */
export interface ThermischInput {
  geleiderMm2: GeleiderDoorsnede;
  materiaal: GeleiderMateriaal;
  legpatroon: Legpatroon;
  /** Nominale spanning [kV]; default 10 (bepaalt isolatiedikte). */
  spanningKV?: number;
  /** Bodemwarmteweerstand ρ [K·m/W]; default 1,0 (NL nat); 2,5 droog. */
  rhoBodemKmPerW?: number;
  /** Legdiepte hart kabel [m]; default 1,0. */
  legdiepteM?: number;
  /** Bodemtemperatuur [°C]; default 15. */
  bodemTempC?: number;
  /** Maximale geleidertemperatuur [°C]; default 90 (XLPE). */
  maxGeleiderTempC?: number;
  /** Aantal parallelle circuits; default 1. */
  aantalCircuits?: number;
  /** Hart-op-hart afstand tussen circuits [m]; default 0,5. */
  circuitAfstandM?: number;
  /** Hart-op-hart afstand fasen bij vlakke ligging [m]; default 0,25. */
  vlakAfstandM?: number;
  /** Netfrequentie [Hz]; default 50. */
  frequentieHz?: number;
}

/** Kabelgeometrie afgeleid uit doorsnede en spanningsniveau. */
export interface KabelGeometrie {
  /** Geleiderdiameter [mm]. */
  dcMm: number;
  /** Isolatiedikte incl. halfgeleidende lagen [mm]. */
  tIsolatieMm: number;
  /** Diameter over isolatie [mm]. */
  dIsolatieMm: number;
  /** Diameter over Cu-draadscherm [mm]. */
  dSchermMm: number;
  /** Buitendiameter kabel [mm]. */
  deMm: number;
}

/** Resultaat thermische berekening. */
export interface ThermischResultaat {
  type: 'ampacity';
  /** Toelaatbare continue stroom [A]. */
  ampacityA: number;
  /** AC-weerstand bij max. geleidertemperatuur [Ω/km]. */
  rAcOhmPerKm: number;
  /** Thermische weerstand isolatie [K·m/W]. */
  t1: number;
  /** Thermische weerstand bedding (0, geen wapening) [K·m/W]. */
  t2: number;
  /** Thermische weerstand buitenmantel [K·m/W]. */
  t3: number;
  /** Externe (bodem)weerstand incl. onderlinge verwarming [K·m/W]. */
  t4: number;
  /** Dominante thermische weerstand. */
  dominanteWeerstand: 'T1 (isolatie)' | 'T3 (mantel)' | 'T4 (bodem)';
  geometrie: KabelGeometrie;
  /** Derating t.o.v. één circuit [%] (alleen bij meerdere circuits). */
  deratingPct?: number;
  /** Signalering bij bundeling van meer dan 2 circuits. */
  bundelSignalering?: string;
  normReferentie: string;
  aannames: string[];
  conclusie: string;
}

/** Isolatiedikte XLPE [mm] per spanningsniveau (HD 620 / NL-praktijk). */
function isolatieDikteMm(spanningKV: number): number {
  if (spanningKV <= 10) return 3.4;
  if (spanningKV <= 15) return 4.5;
  if (spanningKV <= 20) return 5.5;
  return 8.0;
}

/**
 * Kabelgeometrie (benadering): geleider als massief equivalent,
 * halfgeleidende lagen 2 × 0,5 mm, Cu-draadscherm 0,6 mm, PE-mantel 2,5 mm.
 */
export function kabelGeometrie(geleiderMm2: number, spanningKV: number): KabelGeometrie {
  const dcMm = 2 * Math.sqrt(geleiderMm2 / Math.PI);
  const tIsolatieMm = isolatieDikteMm(spanningKV) + 1.0; // + 2×0,5 mm halfgeleidend
  const dIsolatieMm = dcMm + 2 * tIsolatieMm;
  const dSchermMm = dIsolatieMm + 2 * 0.6;
  const deMm = dSchermMm + 2 * 2.5;
  return { dcMm, tIsolatieMm, dIsolatieMm, dSchermMm, deMm };
}

/**
 * Externe thermische weerstand T4 [K·m/W] voor de maatgevende kabel, incl.
 * onderlinge verwarming via spiegelbeeldmethode (IEC 60287-2-1).
 */
function berekenT4(
  rho: number,
  legdiepteM: number,
  deM: number,
  legpatroon: Legpatroon,
  vlakAfstandM: number,
  aantalCircuits: number,
  circuitAfstandM: number
): number {
  // Eigen aandeel: T4 = ρ/(2π)·ln(4L/De)  (u = 2L/De groot)
  let t4 = (rho / (2 * Math.PI)) * Math.log((4 * legdiepteM) / deM);

  // Onderlinge verwarming binnen het circuit: ΔT4 = ρ/(2π)·ln(√((2L)²+s²)/s)
  // Driehoek: rakend (s = De), 2 buren; vlak: middelste kabel, 2 buren op s.
  const sFase = legpatroon === 'driehoek' ? deM : vlakAfstandM;
  const buurTerm = (s: number) =>
    (rho / (2 * Math.PI)) * Math.log(Math.sqrt((2 * legdiepteM) ** 2 + s * s) / s);
  t4 += 2 * buurTerm(sFase);

  // Onderlinge verwarming van overige circuits (rij met hart-op-hart afstand a):
  // maatgevend is het middelste circuit; elk ander circuit ≈ 3 kabels op afstand |j−m|·a.
  const m = Math.floor((aantalCircuits - 1) / 2);
  for (let j = 0; j < aantalCircuits; j++) {
    if (j === m) continue;
    const afstand = Math.abs(j - m) * circuitAfstandM;
    t4 += 3 * buurTerm(afstand);
  }
  return t4;
}

/** AC-weerstand bij bedrijfstemperatuur [Ω/m]: R_dc(θ)·(1+ys), yp verwaarloosd. */
function berekenRAcOhmPerM(
  materiaal: GeleiderMateriaal,
  geleiderMm2: GeleiderDoorsnede,
  maxTempC: number,
  frequentieHz: number
): number {
  // R_dc(θ) = R_dc20·(1 + α·(θ − 20))   (IEC 60287-1-1)
  const rDc = (R_DC20_OHM_PER_KM[materiaal][geleiderMm2] / 1000) *
    (1 + ALPHA_PER_K[materiaal] * (maxTempC - 20));
  // Skin-effect: xs² = 8πf/R_dc·10⁻⁷·ks (ks=1); ys = xs⁴/(192 + 0,8·xs⁴)
  const xs2 = (8 * Math.PI * frequentieHz * 1e-7) / rDc;
  const ys = (xs2 * xs2) / (192 + 0.8 * xs2 * xs2);
  return rDc * (1 + ys);
}

/** Interne berekening van de ampacity [A] voor een gegeven aantal circuits. */
function ampacityVoorCircuits(input: ThermischInput, aantalCircuits: number): {
  iA: number;
  rAcOhmPerM: number;
  t1: number;
  t3: number;
  t4: number;
  geometrie: KabelGeometrie;
} {
  const spanningKV = input.spanningKV ?? 10;
  const rho = input.rhoBodemKmPerW ?? 1.0;
  const legdiepteM = input.legdiepteM ?? 1.0;
  const bodemTempC = input.bodemTempC ?? 15;
  const maxTempC = input.maxGeleiderTempC ?? 90;
  const frequentieHz = input.frequentieHz ?? 50;
  const vlakAfstandM = input.vlakAfstandM ?? 0.25;
  const circuitAfstandM = input.circuitAfstandM ?? 0.5;

  const geo = kabelGeometrie(input.geleiderMm2, spanningKV);
  const rAcOhmPerM = berekenRAcOhmPerM(input.materiaal, input.geleiderMm2, maxTempC, frequentieHz);

  // T1 = ρ_XLPE/(2π)·ln(1 + 2·t1/dc)   (IEC 60287-2-1)
  const t1 = (RHO_XLPE / (2 * Math.PI)) * Math.log(1 + (2 * geo.tIsolatieMm) / geo.dcMm);
  // T3 = ρ_PE/(2π)·ln(1 + 2·t3/D_scherm)
  const t3 = (RHO_PE / (2 * Math.PI)) * Math.log(1 + (2 * 2.5) / geo.dSchermMm);
  const t4 = berekenT4(
    rho,
    legdiepteM,
    geo.deMm / 1000,
    input.legpatroon,
    vlakAfstandM,
    aantalCircuits,
    circuitAfstandM
  );

  // I = √( Δθ / (R_ac·(T1 + T2 + T3 + n·T4)) ) met W_d = 0, T2 = 0, n = 1
  const deltaTheta = maxTempC - bodemTempC;
  const iA = Math.sqrt(deltaTheta / (rAcOhmPerM * (t1 + 0 + t3 + 1 * t4)));

  return { iA, rAcOhmPerM, t1, t3, t4, geometrie: geo };
}

/**
 * Ampacity van een 3-fasen circuit van 1-aderige XLPE-kabels in de grond,
 * conform IEC 60287-1-1 / 60287-2-1 (vereenvoudigd, zie module-documentatie).
 */
export function berekenAmpacity(input: ThermischInput): ThermischResultaat {
  const aantalCircuits = input.aantalCircuits ?? 1;
  const spanningKV = input.spanningKV ?? 10;
  if (spanningKV > 20) {
    // W_d = 0 is alleen onderbouwd voor ≤ 20 kV; daarboven is deze module niet geldig.
    throw new Error('Deze vereenvoudigde IEC 60287-berekening is geldig tot en met 20 kV (W_d = 0).');
  }

  const res = ampacityVoorCircuits(input, aantalCircuits);

  let deratingPct: number | undefined;
  let bundelSignalering: string | undefined;
  if (aantalCircuits > 1) {
    const solo = ampacityVoorCircuits(input, 1);
    deratingPct = Math.round((1 - res.iA / solo.iA) * 1000) / 10;
    if (aantalCircuits > 2) {
      bundelSignalering =
        `Bundeling van ${aantalCircuits} circuits: derating ${deratingPct}% door onderlinge ` +
        `verwarming — overweeg grotere circuitafstand of zwaardere geleider.`;
    }
  }

  const weerstanden: [number, ThermischResultaat['dominanteWeerstand']][] = [
    [res.t1, 'T1 (isolatie)'],
    [res.t3, 'T3 (mantel)'],
    [res.t4, 'T4 (bodem)'],
  ];
  weerstanden.sort((a, b) => b[0] - a[0]);
  const dominanteWeerstand = weerstanden[0][1];

  const ampacityA = Math.round(res.iA);
  const rho = input.rhoBodemKmPerW ?? 1.0;

  return {
    type: 'ampacity',
    ampacityA,
    rAcOhmPerKm: Math.round(res.rAcOhmPerM * 1e6) / 1000,
    t1: res.t1,
    t2: 0,
    t3: res.t3,
    t4: res.t4,
    dominanteWeerstand,
    geometrie: res.geometrie,
    ...(deratingPct !== undefined ? { deratingPct } : {}),
    ...(bundelSignalering !== undefined ? { bundelSignalering } : {}),
    normReferentie: normVermelding('iec60287'),
    aannames: [
      'W_d = 0: diëlektrische verliezen verwaarloosbaar voor XLPE ≤ 20 kV',
      'λ1 = λ2 = 0: single-point bonding/cross-bonding, geen wapening (T2 = 0)',
      'Proximity-effect verwaarloosd (klein t.o.v. skin-effect voor ≤ 630 mm²)',
      `Bodemwarmteweerstand ρ = ${rho} K·m/W, legdiepte ${input.legdiepteM ?? 1.0} m, ` +
        `bodemtemperatuur ${input.bodemTempC ?? 15} °C`,
      `Maximale geleidertemperatuur ${input.maxGeleiderTempC ?? 90} °C (XLPE)`,
      'Onderlinge verwarming via spiegelbeeldmethode (IEC 60287-2-1)',
      'Geen uitdroging van de bodem rond de kabel verondersteld',
    ],
    conclusie:
      `Ampacity ${ampacityA} A (${input.geleiderMm2} mm² ${input.materiaal}, ` +
      `${input.legpatroon}, ρ = ${rho} K·m/W` +
      (aantalCircuits > 1 ? `, ${aantalCircuits} circuits, derating ${deratingPct}%` : '') +
      `); dominante thermische weerstand: ${dominanteWeerstand}.`,
  };
}
