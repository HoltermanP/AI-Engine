/** Gedeelde engineeringformules (NEN / praktijk). */

/** Spanningsval LS (3-fase, cos φ): ΔU = √3 · I · L · ρ / S · cosφ [V] */
export function spanningsvalLsV(
  lengteM: number,
  stroomA: number,
  sectieMm2: number,
  rhoOhmMm2PerM: number,
  cosPhi = 0.9,
): number {
  return (Math.sqrt(3) * stroomA * lengteM * rhoOhmMm2PerM * cosPhi) / sectieMm2;
}

/** Spanningsval MS (%): ΔU% = 100 · √3 · I · L · (R cosφ + X sinφ) / U */
export function spanningsvalMsPct(
  lengteM: number,
  stroomA: number,
  sectieMm2: number,
  spanningKV: number,
  cosPhi = 0.9,
): number {
  const R = (0.0175 * lengteM) / sectieMm2; // Ω (Cu/XLPE benadering)
  const X = 0.00008 * lengteM; // Ω/km → m
  const U = spanningKV * 1000;
  const deltaU = Math.sqrt(3) * stroomA * (R * cosPhi + X * Math.sin(Math.acos(cosPhi)));
  return (100 * deltaU) / U;
}

/** Belastbaarheid LS kabel (ingegraven, NEN 1010 tabel 52, benadering). */
export function belastbaarheidLsA(sectieMm2: number, materiaal: 'Al' | 'Cu'): number {
  const tabel: Record<string, Record<number, number>> = {
    Al: { 150: 240, 185: 280, 240: 340, 300: 390 },
    Cu: { 150: 310, 185: 360, 240: 430, 300: 500 },
  };
  const row = tabel[materiaal] ?? tabel.Al;
  const keys = Object.keys(row).map(Number).sort((a, b) => a - b);
  for (const k of keys) {
    if (sectieMm2 <= k) return row[k];
  }
  return row[keys[keys.length - 1]];
}

/** Adiabatische kortsluit: I²t ≤ k²S² → thermisch voldoet als Iks ≤ kS */
export function thermischKortsluitVoldoet(
  kortsluitA: number,
  tijdS: number,
  sectieMm2: number,
  kConstant = 143, // Cu XLPE
): boolean {
  const i2t = kortsluitA * kortsluitA * tijdS;
  const limiet = kConstant * kConstant * sectieMm2 * sectieMm2;
  return i2t <= limiet;
}

/** Renouard drukverlies LD-gas (NEN 7240, Q m³/h, D mm, L m) → mbar */
export function renouardDrukverliesMbar(
  lengteM: number,
  diameterMm: number,
  debietM3h: number,
  relatieveDichtheid = 0.6,
): number {
  if (diameterMm <= 0 || debietM3h <= 0) return 0;
  const S = 0.8;
  return (
    (23.17 * relatieveDichtheid * S * lengteM * Math.pow(debietM3h, 1.82)) /
    Math.pow(diameterMm, 4.82)
  );
}

/** Stroomsnelheid gas (m/s): Q [m³/h] → v = 4Q / (π D²) */
export function gasSnelheidMs(debietM3h: number, diameterMm: number): number {
  const qM3s = debietM3h / 3600;
  const dM = diameterMm / 1000;
  return (4 * qM3s) / (Math.PI * dM * dM);
}

/** Hazen-Williams drukverlies water (Q in m³/s, D in m, L in m) → m waterkolom */
export function hazenWilliamsVerliesM(
  lengteM: number,
  diameterM: number,
  debietM3s: number,
  C = 130,
): number {
  if (diameterM <= 0 || debietM3s <= 0) return 0;
  return (
    (10.67 * lengteM * Math.pow(debietM3s / C, 1.852)) / Math.pow(diameterM, 4.87)
  );
}

/** Stroomsnelheid water (m/s) */
export function waterSnelheidMs(debietM3s: number, diameterM: number): number {
  return (4 * debietM3s) / (Math.PI * diameterM * diameterM);
}

/** Dekking boven leiding/kabel (m): maaiveld NAP − (as NAP + halve buisdiameter) */
export function dekkingM(
  maaiveldNap: number,
  asNap: number,
  buisDiameterM: number,
): number {
  const bovenkant = asNap + buisDiameterM / 2;
  return maaiveldNap - bovenkant;
}

/** Wanddikte PE (NEN-EN 12201 benadering): e = (P·D) / (2·σ·S) + 0.1·e */
export function peWanddikteMm(
  diameterMm: number,
  drukBar: number,
  sigmaMpa = 8,
  S = 1.25,
): number {
  const e = (drukBar * diameterMm) / (2 * sigmaMpa * S);
  return Math.max(e + 0.1 * e, 6.2); // min. SDR-klassificatie benadering
}

/** HD gas Weymouth (Q m³/h, D mm, L km, P bar) → bar drukverlies */
export function weymouthDrukverliesBar(
  lengteKm: number,
  diameterMm: number,
  debietM3h: number,
  relatieveDichtheid = 0.6,
): number {
  if (diameterMm <= 0 || debietM3h <= 0) return 0;
  const tb = 288;
  const pb = 1.01325;
  const f = 0.9;
  const q = debietM3h;
  const d = diameterMm;
  const term = (q * Math.sqrt(relatieveDichtheid * tb)) / (111.1 * f * Math.pow(d, 2.667));
  return (term * term * lengteKm) / pb;
}
