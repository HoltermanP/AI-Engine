import type { BoreMethode, BoreSegmentInput } from './types';

/** Minimale boogstraal HDD (750× buisdiameter). */
export function minBoogstraalM(buisDiameterMm: number, methode: BoreMethode): number {
  const factor = methode === 'hdd' ? 750 : methode === 'persing' ? 500 : 400;
  return (buisDiameterMm / 1000) * factor;
}

/** Booglengte bij constante straal over boog van 90° (indicatief). */
export function booglengteM(boogstraalM: number, hoekDeg = 90): number {
  return (Math.PI * boogstraalM * hoekDeg) / 180;
}

/** HDD trekkracht (kN) — vereenvoudigde ASTM F1962-benadering. */
export function hddTrekkrachtKN(input: BoreSegmentInput): number {
  const D = input.buisDiameterMm / 1000;
  const L = input.lengteM;
  const w = 0.12 * D * D * L;
  const friction = input.grondFactor * 0.025 * L * D * 10;
  const incl =
    Math.sin((input.trajectory.entryAngleDeg * Math.PI) / 180) +
    Math.sin((input.trajectory.exitAngleDeg * Math.PI) / 180);
  return Math.round((w + friction + incl * w * 0.3) * 10) / 10;
}

/** Persing jacking force (kN) — face pressure methode. */
export function persingDuwkrachtKN(input: BoreSegmentInput): number {
  const D = input.buisDiameterMm / 1000;
  const faceArea = (Math.PI * D * D) / 4;
  const qc = input.grondFactor * 12;
  const facePressureKpa = qc * 0.15 + 50;
  return Math.round(faceArea * facePressureKpa * 1.25 * 10) / 10;
}

/** Sleufloos trek/duw (kN) — kleinere diameter, kortere afstanden. */
export function sleufloosKrachtKN(input: BoreSegmentInput): number {
  const base = hddTrekkrachtKN(input);
  return Math.round(base * 0.45 * 10) / 10;
}

/** Boormedium volume HDD (m³). */
export function boormediumVolumeM3(lengteM: number, boorgatDiameterMm: number): number {
  const d = boorgatDiameterMm / 1000;
  return Math.round(((Math.PI * d * d) / 4) * lengteM * 1.15 * 100) / 100;
}

/** Dekking boven kroon boorgat (m). */
export function kroonDekkingM(maaiveldNap: number, kroonNap: number): number {
  return maaiveldNap - kroonNap;
}

/** Max diepte NAP uit boog (entry/exit + radius). */
export function maxDiepteNap(
  maaiveldNap: number,
  diepteAsNap: number,
  boogstraalM: number,
  entryAngleDeg: number,
): number {
  const entryDrop = boogstraalM * (1 - Math.cos((entryAngleDeg * Math.PI) / 180));
  return Math.min(diepteAsNap, maaiveldNap - entryDrop - boogstraalM * 0.05);
}

/** Putafmetingen (L×B×D) op basis van methode. */
export function putAfmetingen(
  methode: BoreMethode,
  buisDiameterMm: number,
): { lengteM: number; breedteM: number; diepteM: number } {
  const d = buisDiameterMm / 1000;
  if (methode === 'hdd') {
    return { lengteM: 12, breedteM: 5, diepteM: 2.5 + d };
  }
  if (methode === 'persing') {
    return { lengteM: 8, breedteM: 4, diepteM: 2.0 + d * 1.5 };
  }
  return { lengteM: 6, breedteM: 3, diepteM: 1.5 + d };
}

/** Grondfactor uit CPT qc (MPa benadering). */
export function grondFactorUitQc(qc: number, grondsoort: string): number {
  const base = qc / 15;
  if (grondsoort.includes('klei')) return base * 1.35;
  if (grondsoort.includes('veen')) return base * 0.75;
  return base;
}

/** Max toelaatbare trek/duw per methode (kN). */
export function maxToelaatbareKrachtKN(methode: BoreMethode, buisDiameterMm: number): number {
  if (methode === 'hdd') return 400 + buisDiameterMm * 0.5;
  if (methode === 'persing') return 800 + buisDiameterMm;
  return 150 + buisDiameterMm * 0.3;
}
