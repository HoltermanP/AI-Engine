/**
 * Indicatieve zettingsberekening van een kabelsleuf (veen/klei) bij
 * ophoging/sleufherstel, op basis van de vereenvoudigde Koppejan/NEN-Bjerrum-
 * benadering:
 *
 *   s = (C_c / (1 + e0)) · H · log10(σ'_v1 / σ'_v0)   per laag
 *
 * met C_c/(1+e0) de samendrukkingsratio (CR), H de laagdikte, σ'_v0 de
 * effectieve verticale spanning in het laagmidden vóór belasting en
 * σ'_v1 = σ'_v0 + Δσ ná belasting (geen spanningsspreiding: conservatief).
 *
 * Presets per grondsoort zijn NL-praktijkwaarden (indicatief, o.a. NEN 9997-1
 * tabel 2.b en Deltares/CUR-praktijk):
 * - veen: CR ≈ 0,15–0,25 (hier 0,20)
 * - klei: CR ≈ 0,05–0,10 (hier 0,075)
 * - zand: verwaarloosbaar (hier 0,001)
 */

/** Grondsoorten met presets. */
export type Grondsoort = 'veen' | 'klei' | 'zand';

/** Preset-eigenschappen per grondsoort (NL-praktijkwaarden, indicatief). */
export interface GrondsoortPreset {
  /** Samendrukkingsratio CR = C_c/(1+e0) [-]. */
  compressieRatio: number;
  /** Volumegewicht onder grondwater (verzadigd) [kN/m³]. */
  gammaNatKNm3: number;
  /** Volumegewicht boven grondwater [kN/m³]. */
  gammaDroogKNm3: number;
  omschrijving: string;
}

/**
 * NL-praktijkwaarden (indicatief): CR-bereiken veen 0,15–0,25; klei 0,05–0,10;
 * zand verwaarloosbaar. Volumegewichten conform NEN 9997-1 tabel 2.b (orde).
 */
export const GRONDSOORT_PRESETS: Record<Grondsoort, GrondsoortPreset> = {
  veen: {
    compressieRatio: 0.2,
    gammaNatKNm3: 11,
    gammaDroogKNm3: 10.5,
    omschrijving: 'Veen, matig (CR 0,15–0,25)',
  },
  klei: {
    compressieRatio: 0.075,
    gammaNatKNm3: 17,
    gammaDroogKNm3: 16.5,
    omschrijving: 'Klei, matig (CR 0,05–0,10)',
  },
  zand: {
    compressieRatio: 0.001,
    gammaNatKNm3: 20,
    gammaDroogKNm3: 18,
    omschrijving: 'Zand (zetting verwaarloosbaar)',
  },
};

/** Volumegewicht water [kN/m³] (praktijkwaarde). */
const GAMMA_WATER = 10;

/** Ondergrens effectieve spanning [kPa] om log-singulariteit nabij maaiveld te vermijden. */
const SIGMA_V0_MIN_KPA = 2;

/** Eén grondlaag in het lagenpakket (van maaiveld naar beneden). */
export interface GrondLaag {
  dikteM: number;
  grondsoort: Grondsoort;
}

/** Invoer zettingsberekening. */
export interface ZettingInput {
  /** Lagenpakket van maaiveld naar beneden. */
  lagen: GrondLaag[];
  /** Extra bovenbelasting [kPa], bijv. sleufherstel/zandbed of ophoging. */
  extraBelastingKPa: number;
  /** Grondwaterstand [m onder maaiveld]; default 1,0. */
  grondwaterstandM?: number;
}

/** Resultaat per laag. */
export interface ZettingLaagResultaat {
  laagIndex: number;
  grondsoort: Grondsoort;
  dikteM: number;
  /** Effectieve spanning in laagmidden vóór belasting [kPa]. */
  sigmaV0KPa: number;
  /** Effectieve spanning in laagmidden ná belasting [kPa]. */
  sigmaV1KPa: number;
  zettingMm: number;
}

/** Stoplichtklasse: < 30 mm groen, 30–100 mm oranje, > 100 mm rood. */
export type ZettingStoplicht = 'groen' | 'oranje' | 'rood';

/** Totaalresultaat zettingsberekening. */
export interface ZettingResultaat {
  type: 'zetting';
  lagen: ZettingLaagResultaat[];
  totaalMm: number;
  stoplicht: ZettingStoplicht;
  conclusie: string;
  normReferentie: string;
  aannames: string[];
}

/** Effectief volumegewicht [kN/m³] op diepte z, afhankelijk van grondwaterstand. */
function effectiefGammaKNm3(preset: GrondsoortPreset, onderGrondwater: boolean): number {
  return onderGrondwater ? preset.gammaNatKNm3 - GAMMA_WATER : preset.gammaDroogKNm3;
}

/**
 * Effectieve verticale spanning σ'_v [kPa] op diepte z [m onder maaiveld],
 * met grondwaterstand gws [m onder maaiveld].
 */
function sigmaVKPa(lagen: GrondLaag[], zM: number, gwsM: number): number {
  let sigma = 0;
  let top = 0;
  for (const laag of lagen) {
    const onder = Math.min(top + laag.dikteM, zM);
    if (onder <= top) break;
    const preset = GRONDSOORT_PRESETS[laag.grondsoort];
    // Splits het laagdeel op de grondwaterstand
    const drogeDikte = Math.max(0, Math.min(onder, gwsM) - top);
    const natteDikte = Math.max(0, onder - Math.max(top, gwsM));
    sigma += drogeDikte * effectiefGammaKNm3(preset, false);
    sigma += natteDikte * effectiefGammaKNm3(preset, true);
    top += laag.dikteM;
    if (top >= zM) break;
  }
  return sigma;
}

/**
 * Indicatieve zettingsberekening sleuf (Koppejan/NEN-Bjerrum vereenvoudigd):
 * zetting per laag, totaal in mm, stoplicht en NL-conclusie.
 */
export function berekenZetting(input: ZettingInput): ZettingResultaat {
  if (input.lagen.length === 0) {
    throw new Error('Het lagenpakket moet ten minste één laag bevatten.');
  }
  const gwsM = input.grondwaterstandM ?? 1.0;
  const deltaSigma = input.extraBelastingKPa;

  const lagen: ZettingLaagResultaat[] = [];
  let top = 0;
  let totaalMm = 0;

  input.lagen.forEach((laag, laagIndex) => {
    const preset = GRONDSOORT_PRESETS[laag.grondsoort];
    const middenZ = top + laag.dikteM / 2;
    // σ'_v0 in laagmidden, met ondergrens tegen log-singulariteit nabij maaiveld
    const sigmaV0 = Math.max(sigmaVKPa(input.lagen, middenZ, gwsM), SIGMA_V0_MIN_KPA);
    const sigmaV1 = sigmaV0 + deltaSigma;
    // s = CR · H · log10(σ'_v1/σ'_v0)
    const zettingM = preset.compressieRatio * laag.dikteM * Math.log10(sigmaV1 / sigmaV0);
    const zettingMm = zettingM * 1000;
    totaalMm += zettingMm;
    lagen.push({
      laagIndex,
      grondsoort: laag.grondsoort,
      dikteM: laag.dikteM,
      sigmaV0KPa: sigmaV0,
      sigmaV1KPa: sigmaV1,
      zettingMm,
    });
    top += laag.dikteM;
  });

  const stoplicht: ZettingStoplicht = totaalMm < 30 ? 'groen' : totaalMm <= 100 ? 'oranje' : 'rood';
  const conclusieKern: Record<ZettingStoplicht, string> = {
    groen: 'acceptabel voor sleufherstel; geen aanvullende maatregelen nodig',
    oranje: 'aandachtspunt: monitor zakking en overweeg lichte aanvulling of gefaseerd herstel',
    rood: 'kritisch: lichte ophoogmaterialen, voorbelasting of grondverbetering adviseren',
  };

  return {
    type: 'zetting',
    lagen,
    totaalMm,
    stoplicht,
    conclusie:
      `Indicatieve zetting ${totaalMm.toFixed(0)} mm bij ${deltaSigma} kPa extra belasting — ` +
      `${conclusieKern[stoplicht]} (stoplicht: ${stoplicht}).`,
    normReferentie: 'Koppejan / NEN-Bjerrum vereenvoudigd (NL-praktijkwaarden, indicatief; vgl. NEN 9997-1)',
    aannames: [
      'Eendimensionale samendrukking, eindzetting (geen kruip/tijdseffect apart)',
      'Geen spanningsspreiding van de bovenbelasting (conservatief)',
      `Grondwaterstand ${gwsM} m onder maaiveld; γ_water = ${GAMMA_WATER} kN/m³`,
      `Ondergrens σ'_v0 = ${SIGMA_V0_MIN_KPA} kPa nabij maaiveld (log-singulariteit)`,
      'CR-presets: veen 0,20 (0,15–0,25), klei 0,075 (0,05–0,10), zand verwaarloosbaar',
      'Indicatief — geen vervanging van een geotechnisch advies (NEN 9997-1)',
    ],
  };
}
