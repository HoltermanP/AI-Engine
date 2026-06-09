/**
 * Kabeltrekberekening over een tracé van rechte stukken en bochten.
 *
 * Formules (fabrikantgrenswaarden + IEC/NEN-praktijk, o.a. NEN 3620-praktijk):
 * - Recht stuk:        ΔF = μ · w · g · L                       [N]
 * - Bocht (capstan):   F_uit = F_in · e^(μ·θ) + μ · w · g · L_boog
 *   (horizontale bocht; gewichtsbijdrage als wrijving over de booglengte)
 * - Zijwaartse druk:   SWP = F_uit / R                          [N/m]
 * - Max. trekkracht Cu aan trekkous: σ_trek · S = 50 N/mm² · geleiderdoorsnede
 *
 * De berekening wordt in beide trekrichtingen uitgevoerd; de richting met de
 * laagste maximale trekkracht wordt geadviseerd. Bij overschrijding wordt de
 * afstand bepaald waarop de limiet wordt bereikt (advies tussentrekput).
 */

/** Valversnelling [m/s²]. */
const G = 9.81;

/** Wrijvingscoëfficiënt kabel in buis (praktijkwaarde). */
export const MU_BUIS = 0.4;

/** Wrijvingscoëfficiënt kabel op rollen (praktijkwaarde). */
export const MU_ROLLEN = 0.2;

/** Toelaatbare trekspanning Cu-geleider aan trekkous [N/mm²] (fabrikantenrichtlijn). */
export const TREKSPANNING_CU_N_PER_MM2 = 50;

/** Default maximale zijwaartse druk in bocht voor MS-kabel [kN/m]. */
export const MAX_SWP_MS_KN_PER_M = 3;

/** Recht tracédeel. */
export interface RechteSectie {
  type: 'recht';
  lengteM: number;
}

/** Bocht in het tracé (horizontaal, met booghoek en straal). */
export interface BochtSectie {
  type: 'bocht';
  hoekDeg: number;
  radiusM: number;
}

/** Eén sectie van het trektracé. */
export type TraceSectie = RechteSectie | BochtSectie;

/** Kabelparameters voor de trekberekening. */
export interface KabelTrekParameters {
  /** Kabelmassa [kg/m]. */
  massaKgPerM: number;
  /** Buitendiameter kabel [mm]. */
  diameterMm: number;
  /**
   * Maximaal toelaatbare trekkracht [kN]. Indien niet opgegeven wordt deze
   * berekend uit de geleiderdoorsnede: 50 N/mm² × S (Cu aan trekkous).
   */
  maxTrekkrachtKN?: number;
  /** Geleiderdoorsnede [mm²] (voor afleiding max. trekkracht). */
  geleiderDoorsnedeMm2?: number;
  /** Maximale zijwaartse druk in bocht [kN/m]; default 3 (MS-kabel). */
  maxSWPkNperM?: number;
}

/** Invoer kabeltrekberekening. */
export interface KabeltrekInput {
  /** Tracésecties in volgorde van het tracé (richting 'heen'). */
  secties: TraceSectie[];
  kabel: KabelTrekParameters;
  /** Wrijvingscoëfficiënt μ; default 0,4 (in buis), 0,2 bij rollen (MU_ROLLEN). */
  mu?: number;
  /** Voorspanning bij intrede [kN]; default 0. */
  voorspanningKN?: number;
}

/** Resultaat per sectie (in de doorlopen trekrichting). */
export interface KabeltrekSectieResultaat {
  /** Index van de sectie in de oorspronkelijke invoer. */
  sectieIndex: number;
  type: 'recht' | 'bocht';
  /** Doorlopen lengte van de sectie [m] (bocht: booglengte θ·R). */
  lengteM: number;
  /** Trekkracht bij intrede van de sectie [kN]. */
  fInKN: number;
  /** Trekkracht bij uittrede van de sectie [kN]. */
  fUitKN: number;
  /** Zijwaartse druk in de bocht [kN/m] (alleen bij bocht). */
  swpKNperM?: number;
  /** Trekkracht én (bij bocht) SWP binnen de limieten. */
  voldoet: boolean;
}

/** Resultaat voor één trekrichting. */
export interface KabeltrekRichtingResultaat {
  richting: 'heen' | 'terug';
  secties: KabeltrekSectieResultaat[];
  /** Maximale trekkracht over het tracé [kN]. */
  maxTrekkrachtKN: number;
  /** Invoerindex van de maatgevende sectie (hoogste trekkracht). */
  maatgevendeSectieIndex: number;
  trekkrachtVoldoet: boolean;
  swpVoldoet: boolean;
  /** Afstand vanaf het intredepunt waar de treklimiet wordt bereikt [m] (alleen bij overschrijding). */
  limietBereiktOpM?: number;
}

/** Totaalresultaat kabeltrekberekening. */
export interface KabeltrekResultaat {
  type: 'kabeltrek';
  /** Toelaatbare trekkracht [kN]. */
  maxTrekkrachtToelaatbaarKN: number;
  /** Toelaatbare zijwaartse druk [kN/m]. */
  maxSWPToelaatbaarKNperM: number;
  heen: KabeltrekRichtingResultaat;
  terug: KabeltrekRichtingResultaat;
  /** Geadviseerde trekrichting (laagste maximale trekkracht). */
  adviesRichting: 'heen' | 'terug';
  /** Maximale trekkracht in de geadviseerde richting [kN]. */
  maxTrekkrachtKN: number;
  /** Maatgevende sectie (invoerindex) in de geadviseerde richting. */
  maatgevendeSectieIndex: number;
  /** Voldoet in de geadviseerde richting (trekkracht én SWP). */
  voldoet: boolean;
  /** Nederlands advies (richting, eventueel tussentrekput met locatie). */
  advies: string;
  normReferentie: string;
  aannames: string[];
}

/** Booglengte van een bochtsectie [m]. */
function boogLengteM(s: BochtSectie): number {
  return (s.hoekDeg * Math.PI / 180) * s.radiusM;
}

/**
 * Bepaalt de toelaatbare trekkracht [N]: opgegeven waarde, of afgeleid uit de
 * geleiderdoorsnede via 50 N/mm² (Cu aan trekkous).
 */
function toelaatbareTrekkrachtN(kabel: KabelTrekParameters): number {
  if (kabel.maxTrekkrachtKN != null) return kabel.maxTrekkrachtKN * 1000;
  if (kabel.geleiderDoorsnedeMm2 != null) {
    return TREKSPANNING_CU_N_PER_MM2 * kabel.geleiderDoorsnedeMm2;
  }
  throw new Error(
    'Geef maxTrekkrachtKN of geleiderDoorsnedeMm2 op om de toelaatbare trekkracht te bepalen.'
  );
}

/**
 * Berekent de afstand binnen een sectie waarop de trekkracht de limiet bereikt.
 * Recht: lineair oplosbaar; bocht: bisectie op F(s) = F_in·e^(μ·s/R) + μ·w·g·s.
 */
function afstandTotLimietM(
  sectie: TraceSectie,
  fInN: number,
  limietN: number,
  mu: number,
  wKgPerM: number
): number {
  const wrijvingNperM = mu * wKgPerM * G;
  if (sectie.type === 'recht') {
    return (limietN - fInN) / wrijvingNperM;
  }
  const lBoog = boogLengteM(sectie);
  const f = (s: number) => fInN * Math.exp((mu * s) / sectie.radiusM) + wrijvingNperM * s;
  let lo = 0;
  let hi = lBoog;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < limietN) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Voert de trekberekening uit voor één richting (secties in doorloopvolgorde). */
function berekenRichting(
  richting: 'heen' | 'terug',
  secties: { sectie: TraceSectie; sectieIndex: number }[],
  input: KabeltrekInput,
  limietN: number,
  swpLimietKNperM: number
): KabeltrekRichtingResultaat {
  const mu = input.mu ?? MU_BUIS;
  const w = input.kabel.massaKgPerM;
  const wrijvingNperM = mu * w * G;

  let fN = (input.voorspanningKN ?? 0) * 1000;
  let cumLengteM = 0;
  let maxN = fN;
  let maatgevendeSectieIndex = secties.length > 0 ? secties[0].sectieIndex : 0;
  let swpVoldoet = true;
  let limietBereiktOpM: number | undefined;

  const resultaten: KabeltrekSectieResultaat[] = [];

  for (const { sectie, sectieIndex } of secties) {
    const fInN = fN;
    let fUitN: number;
    let lengteM: number;
    let swpKNperM: number | undefined;

    if (sectie.type === 'recht') {
      // ΔF = μ·w·g·L
      lengteM = sectie.lengteM;
      fUitN = fInN + wrijvingNperM * lengteM;
    } else {
      // Capstan: F_uit = F_in·e^(μθ) + μ·w·g·L_boog ; SWP = F_uit/R
      const theta = (sectie.hoekDeg * Math.PI) / 180;
      lengteM = boogLengteM(sectie);
      fUitN = fInN * Math.exp(mu * theta) + wrijvingNperM * lengteM;
      swpKNperM = fUitN / 1000 / sectie.radiusM;
      if (swpKNperM > swpLimietKNperM) swpVoldoet = false;
    }

    if (fUitN > limietN && limietBereiktOpM === undefined) {
      limietBereiktOpM = cumLengteM + afstandTotLimietM(sectie, fInN, limietN, mu, w);
    }
    if (fUitN > maxN) {
      maxN = fUitN;
      maatgevendeSectieIndex = sectieIndex;
    }

    const sectieVoldoet =
      fUitN <= limietN && (swpKNperM === undefined || swpKNperM <= swpLimietKNperM);

    resultaten.push({
      sectieIndex,
      type: sectie.type,
      lengteM,
      fInKN: fInN / 1000,
      fUitKN: fUitN / 1000,
      ...(swpKNperM !== undefined ? { swpKNperM } : {}),
      voldoet: sectieVoldoet,
    });

    fN = fUitN;
    cumLengteM += lengteM;
  }

  return {
    richting,
    secties: resultaten,
    maxTrekkrachtKN: maxN / 1000,
    maatgevendeSectieIndex,
    trekkrachtVoldoet: maxN <= limietN,
    swpVoldoet,
    ...(limietBereiktOpM !== undefined ? { limietBereiktOpM } : {}),
  };
}

/**
 * Kabeltrekberekening over een tracé in beide richtingen, met richtingadvies
 * en — bij overschrijding — advies voor een tussentrekput met locatie.
 */
export function berekenKabeltrek(input: KabeltrekInput): KabeltrekResultaat {
  if (input.secties.length === 0) {
    throw new Error('Het tracé moet ten minste één sectie bevatten.');
  }
  const limietN = toelaatbareTrekkrachtN(input.kabel);
  const swpLimietKNperM = input.kabel.maxSWPkNperM ?? MAX_SWP_MS_KN_PER_M;
  const mu = input.mu ?? MU_BUIS;

  const heenSecties = input.secties.map((sectie, sectieIndex) => ({ sectie, sectieIndex }));
  const terugSecties = [...heenSecties].reverse();

  const heen = berekenRichting('heen', heenSecties, input, limietN, swpLimietKNperM);
  const terug = berekenRichting('terug', terugSecties, input, limietN, swpLimietKNperM);

  const adviesRichting: 'heen' | 'terug' =
    terug.maxTrekkrachtKN < heen.maxTrekkrachtKN ? 'terug' : 'heen';
  const beste = adviesRichting === 'heen' ? heen : terug;
  const voldoet = beste.trekkrachtVoldoet && beste.swpVoldoet;

  const richtingTekst =
    adviesRichting === 'heen' ? "richting 'heen' (van begin naar eind)" : "richting 'terug' (van eind naar begin)";

  let advies: string;
  if (voldoet) {
    advies =
      `Trek de kabel in ${richtingTekst}: maximale trekkracht ` +
      `${beste.maxTrekkrachtKN.toFixed(1)} kN ≤ toelaatbaar ${(limietN / 1000).toFixed(1)} kN; ` +
      `zijwaartse druk in alle bochten ≤ ${swpLimietKNperM} kN/m.`;
  } else {
    const delen: string[] = [];
    if (!beste.trekkrachtVoldoet) {
      delen.push(
        `de treklimiet van ${(limietN / 1000).toFixed(1)} kN wordt bereikt op circa ` +
          `${(beste.limietBereiktOpM ?? 0).toFixed(0)} m vanaf het intredepunt — plaats daar (of eerder) ` +
          `een tussentrekput/tussenstation`
      );
    }
    if (!beste.swpVoldoet) {
      delen.push(
        `de zijwaartse druk overschrijdt ${swpLimietKNperM} kN/m in één of meer bochten — ` +
          `vergroot de bochtstraal of verlaag de trekkracht (tussenstation vóór de bocht)`
      );
    }
    advies = `Ook in de gunstigste ${richtingTekst} voldoet de trek niet: ${delen.join('; ')}.`;
  }

  return {
    type: 'kabeltrek',
    maxTrekkrachtToelaatbaarKN: limietN / 1000,
    maxSWPToelaatbaarKNperM: swpLimietKNperM,
    heen,
    terug,
    adviesRichting,
    maxTrekkrachtKN: beste.maxTrekkrachtKN,
    maatgevendeSectieIndex: beste.maatgevendeSectieIndex,
    voldoet,
    advies,
    normReferentie: 'Fabrikantgrenswaarden + IEC/NEN-praktijk (o.a. NEN 3620-praktijk)',
    aannames: [
      `Wrijvingscoëfficiënt μ = ${mu}` +
        (input.mu === undefined ? ' (default, kabel in buis; 0,2 bij rollen)' : ''),
      'Horizontaal tracé: gewichtsbijdrage in bochten meegenomen als wrijving over de booglengte',
      'Capstan-vergelijking per bocht: F_uit = F_in·e^(μ·θ) + μ·w·g·L_boog',
      input.kabel.maxTrekkrachtKN == null
        ? `Toelaatbare trekkracht uit geleiderdoorsnede: ${TREKSPANNING_CU_N_PER_MM2} N/mm² (Cu aan trekkous)`
        : 'Toelaatbare trekkracht conform fabrikantopgave',
      `Voorspanning bij intrede ${(input.voorspanningKN ?? 0).toFixed(1)} kN`,
    ],
  };
}
