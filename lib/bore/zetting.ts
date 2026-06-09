/**
 * Zettingsindicatie boven een HDD-boring (maaiveldzakking).
 *
 * Indicatieve berekening met de volumeverlies-methode uit de tunnelbouw
 * (Peck 1969 / O'Reilly & New 1982), in de NL-praktijk toegepast voor
 * sleufloze technieken (NEN 3650-1:2020 / NEN 3651:2020, beoordeling
 * omgevingsbeïnvloeding bij kruisingen):
 *
 *   S_max = V_loss · pi · R² / ( sqrt(2·pi) · i )
 *
 *   met  V_loss = volumeverlies als fractie van het boorgatvolume
 *        R      = boorgatstraal (m)
 *        i      = afstand buigpunt zettingstrog = K · z0
 *        K      = trogbreedtefactor (zand ≈ 0,5; klei/veen ≈ 0,7)
 *        z0     = diepte boorhart onder maaiveld (m)
 *
 * De zettingstrog is Gaussisch; de praktische trogbreedte wordt genomen
 * als 2,5·i aan weerszijden van de booras (totaal 5·i).
 *
 * Beoordeling: S_max < 10 mm groen, 10–25 mm oranje, > 25 mm rood.
 */

export type ZettingBeoordeling = 'groen' | 'oranje' | 'rood';

export interface ZettingInvoer {
  /** Boorgatdiameter incl. overcut (mm). */
  boorgatDiameterMm: number;
  /** Diepte boorhart onder maaiveld z0 (m). */
  diepteAsM: number;
  /** Dominante grondsoort ('zand' | 'klei' | 'veen' | ...). */
  dominantGrondsoort: string;
  /** Volumeverlies als fractie (0,01–0,03); default per grondsoort. */
  volumeVerliesFractie?: number;
}

export interface ZettingResultaat {
  /** Maximale maaiveldzetting boven de booras (mm). */
  sMaxMm: number;
  /** Trogparameter i = K·z0 (m). */
  iM: number;
  /** Praktische breedte zettingstrog, 2,5·i per zijde (m). */
  trogBreedteM: number;
  /** Gehanteerde trogbreedtefactor K. */
  kFactor: number;
  /** Gehanteerd volumeverlies (fractie). */
  volumeVerliesFractie: number;
  /** Stoplicht-beoordeling. */
  beoordeling: ZettingBeoordeling;
  /** Voldoet (beoordeling niet 'rood')? */
  voldoet: boolean;
  /** NL-conclusietekst. */
  conclusie: string;
  /** Gehanteerde aannames. */
  aannames: string[];
}

/**
 * Trogbreedtefactor K per grondsoort (O'Reilly & New 1982, aanname):
 * zand 0,5; klei en veen 0,7.
 */
export function trogbreedteFactor(grondsoort: string): number {
  const s = grondsoort.toLowerCase();
  return s.includes('klei') || s.includes('veen') ? 0.7 : 0.5;
}

/**
 * Default volumeverlies per grondsoort (aanname, ervaringscijfers HDD):
 * zand 1%, klei 2%, veen 3%.
 */
export function defaultVolumeVerlies(grondsoort: string): number {
  const s = grondsoort.toLowerCase();
  if (s.includes('veen')) return 0.03;
  if (s.includes('klei')) return 0.02;
  return 0.01;
}

/**
 * Indicatieve maaiveldzetting boven de boring met de volumeverlies-methode.
 * Zie module-header voor formule en bronnen.
 */
export function berekenZetting(invoer: ZettingInvoer): ZettingResultaat {
  const r = invoer.boorgatDiameterMm / 2000;
  const k = trogbreedteFactor(invoer.dominantGrondsoort);
  const vLoss = invoer.volumeVerliesFractie ?? defaultVolumeVerlies(invoer.dominantGrondsoort);
  const z0 = Math.max(0.1, invoer.diepteAsM);

  // i = K · z0
  const i = k * z0;
  // S_max = V_loss · pi · R² / ( sqrt(2 pi) · i )
  const sMaxM = (vLoss * Math.PI * r * r) / (Math.sqrt(2 * Math.PI) * i);
  const sMaxMm = sMaxM * 1000;

  const beoordeling: ZettingBeoordeling = sMaxMm < 10 ? 'groen' : sMaxMm <= 25 ? 'oranje' : 'rood';
  const voldoet = beoordeling !== 'rood';

  const conclusie =
    beoordeling === 'groen'
      ? `Verwachte maaiveldzetting ${sMaxMm.toFixed(1)} mm (< 10 mm) — verwaarloosbaar, geen aanvullende maatregelen`
      : beoordeling === 'oranje'
        ? `Verwachte maaiveldzetting ${sMaxMm.toFixed(1)} mm (10–25 mm) — monitoring (hoogtebouten) en beoordeling belendingen binnen trog van ${(2 * 2.5 * i).toFixed(1)} m aanbevolen`
        : `Verwachte maaiveldzetting ${sMaxMm.toFixed(1)} mm (> 25 mm) — ontoelaatbaar; boring verdiepen, boorgatdiameter beperken of volumeverlies reduceren (mudmanagement)`;

  return {
    sMaxMm: Math.round(sMaxMm * 10) / 10,
    iM: Math.round(i * 100) / 100,
    trogBreedteM: Math.round(2 * 2.5 * i * 10) / 10,
    kFactor: k,
    volumeVerliesFractie: vLoss,
    beoordeling,
    voldoet,
    conclusie,
    aannames: [
      `Volumeverlies ${(vLoss * 100).toFixed(1)}% van boorgatvolume (${invoer.dominantGrondsoort}, ervaringscijfer)`,
      `Trogbreedtefactor K = ${k} (O'Reilly & New 1982)`,
      `Gaussische zettingstrog; praktische breedte 2,5·i per zijde`,
    ],
  };
}
