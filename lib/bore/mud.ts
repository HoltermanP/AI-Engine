/**
 * Mudspanningsberekening en blow-out check voor HDD-boringen.
 *
 * Methodiek conform NEN 3650-1:2020 (bijlage, beheersing boorspoelingdruk)
 * en NEN 3651:2020 (kruisingen waterstaatswerken). De maximaal toelaatbare
 * boorspoelingdruk wordt bepaald met de cavity-expansiemethode van
 * Luger & Hergarden (1988), in de Nederlandse praktijk bekend als de
 * "Delftse vergelijking" (opgenomen in NEN 3650-1):
 *
 *   p_max = u + (sigma'_v + c·cot(phi)) · [ (R0/Rp,max)² + Q ]^( -sin(phi) / (1 + sin(phi)) ) - c·cot(phi)
 *
 *   met  Q       = (sigma'_v·sin(phi) + c·cos(phi)) / G   (elastische term)
 *        G       = E / (2·(1+nu))                          (glijdingsmodulus)
 *        R0      = boorgatstraal
 *        Rp,max  = maximaal toelaatbare straal plastische zone,
 *                  begrensd op 0,5·H (halve gronddekking tot boorhart)
 *                  conform NL-praktijk om opbarsten naar maaiveld te voorkomen
 *        u       = waterspanning op boorhartdiepte
 *
 * De minimaal benodigde boorspoelingdruk volgt uit de statische mudkolom
 * plus circulatieverlies in de annulus:
 *
 *   p_min = rho_mud · g · z + dp_basis + dp_circ · s
 *
 * Toetsing: marge = (p_max / gamma_m) / p_min >= 1,0 met partiële factor
 * gamma_m = 1,5 op p_max (NEN 3650-benadering).
 *
 * Bron: Luger, H.J. & Hergarden, H.J.A.M. (1988), "Directional drilling in
 * soft soil: influence of mud pressures", Delft Geotechnics; NEN 3650-1:2020.
 */

export interface GrondParameters {
  /** Hoek van inwendige wrijving (graden). */
  phiDeg: number;
  /** Cohesie (kPa). */
  cKpa: number;
  /** Volumiek gewicht boven grondwater (kN/m³). */
  gammaDroogKnM3: number;
  /** Volumiek gewicht onder grondwater, verzadigd (kN/m³). */
  gammaNatKnM3: number;
  /** Elasticiteitsmodulus grond (kPa). */
  eKpa: number;
}

/** Dwarscontractiecoëfficiënt grond (aanname, alle grondsoorten). */
export const GROND_NU = 0.33;

/** Volumiek gewicht water (kN/m³). */
export const GAMMA_WATER = 9.81;

/** Zwaartekrachtversnelling (m/s²). */
const G_VERSNELLING = 9.81;

/**
 * Grondparameters afleiden uit dominante grondsoort.
 *
 * Aannames (karakteristieke lage waarden, vergelijkbaar met NEN 9997-1 tabel 2.b):
 * - zand: phi = 32,5°, c = 0 kPa,  gamma = 18/20 kN/m³, E = 25 MPa
 * - klei: phi = 22,5°, c = 10 kPa, gamma = 16/17 kN/m³, E = 7 MPa
 * - veen: phi = 15°,   c = 5 kPa,  gamma = 11/12 kN/m³, E = 2 MPa
 */
export function grondParametersUitGrondsoort(grondsoort: string): GrondParameters {
  const s = grondsoort.toLowerCase();
  if (s.includes('veen')) {
    return { phiDeg: 15, cKpa: 5, gammaDroogKnM3: 11, gammaNatKnM3: 12, eKpa: 2000 };
  }
  if (s.includes('klei')) {
    return { phiDeg: 22.5, cKpa: 10, gammaDroogKnM3: 16, gammaNatKnM3: 17, eKpa: 7000 };
  }
  // Default: zand
  return { phiDeg: 32.5, cKpa: 0, gammaDroogKnM3: 18, gammaNatKnM3: 20, eKpa: 25000 };
}

export interface MudOpties {
  /** Dichtheid boorspoeling (kg/m³), typisch 1050–1200. Default 1100. */
  mudDichtheidKgM3?: number;
  /** Aantal discretisatiepunten langs de boorlijn. Default 21. */
  aantalPunten?: number;
  /** Partiële factor op p_max (NEN 3650-benadering). Default 1,5. */
  partieleFactor?: number;
  /** Basis-circulatieverlies annulus (kPa). Default 10. */
  basisCirculatieVerliesKpa?: number;
  /** Circulatieverlies per meter boorlengte (kPa/m). Default 0,05. */
  circulatieVerliesKpaPerM?: number;
  /**
   * Minimale dekking (m) waarbij getoetst wordt; punten met minder dekking
   * liggen in de in-/uittredezone waar de spoeling vrij kan uitstromen
   * en worden niet beoordeeld. Default 1,0 m.
   */
  minBeoordelingsDiepteM?: number;
}

const MUD_DEFAULTS: Required<MudOpties> = {
  mudDichtheidKgM3: 1100,
  aantalPunten: 21,
  partieleFactor: 1.5,
  basisCirculatieVerliesKpa: 10,
  circulatieVerliesKpaPerM: 0.05,
  minBeoordelingsDiepteM: 1.0,
};

export interface MudPunt {
  /** Afstand vanaf intredepunt langs de boorlijn (m). */
  afstandM: number;
  /** Diepte boorhart onder maaiveld (m). */
  diepteM: number;
  /** Minimaal benodigde muddruk (kPa). */
  pMinKpa: number;
  /** Maximaal toelaatbare muddruk, karakteristiek (kPa). */
  pMaxKpa: number;
  /** Marge = (pMax / partieleFactor) / pMin. */
  marge: number;
  /** Marge >= 1,0 (alleen getoetst bij voldoende dekking). */
  voldoet: boolean;
  /** Is dit punt getoetst (dekking >= minBeoordelingsDiepteM)? */
  getoetst: boolean;
}

export interface MudResultaat {
  punten: MudPunt[];
  /** Punt met de kleinste marge (van de getoetste punten). */
  kritischPunt: MudPunt | null;
  /** Kleinste marge over alle getoetste punten. */
  minimaleMarge: number;
  /** Voldoen alle getoetste punten (marge >= 1,0)? */
  voldoet: boolean;
  /** NL-conclusietekst. */
  conclusie: string;
  /** Gehanteerde aannames. */
  aannames: string[];
}

export interface MudInvoer {
  /** Horizontale boorlengte (m). */
  lengteM: number;
  /** Maximale diepte boorhart onder maaiveld (m). */
  maxDiepteOnderMvM: number;
  /** Intredehoek (graden t.o.v. horizontaal). */
  entryAngleDeg: number;
  /** Uittredehoek (graden t.o.v. horizontaal). */
  exitAngleDeg: number;
  /** Grondwaterstand onder maaiveld (m); negatief = boven maaiveld. */
  grondwaterDiepteM: number;
  /** Dominante grondsoort ('zand' | 'klei' | 'veen' | ...). */
  dominantGrondsoort: string;
  /** Boorgatdiameter (mm), incl. overcut. */
  boorgatDiameterMm: number;
}

/**
 * Discretiseer het dieptelijnprofiel van de boring in n punten.
 *
 * Vereenvoudigd profiel: rechte tangenten onder in-/uittredehoek tot de
 * maximale diepte, met horizontaal middendeel:
 *   diepte(s) = min( s·tan(entry), (L-s)·tan(exit), maxDiepte )
 */
export function diepteProfiel(
  lengteM: number,
  maxDiepteM: number,
  entryAngleDeg: number,
  exitAngleDeg: number,
  aantalPunten = 21,
): { afstandM: number; diepteM: number }[] {
  const tanIn = Math.tan((entryAngleDeg * Math.PI) / 180);
  const tanUit = Math.tan((exitAngleDeg * Math.PI) / 180);
  const n = Math.max(2, aantalPunten);
  const punten: { afstandM: number; diepteM: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = (lengteM * i) / (n - 1);
    const diepte = Math.max(0, Math.min(s * tanIn, (lengteM - s) * tanUit, maxDiepteM));
    punten.push({ afstandM: Math.round(s * 100) / 100, diepteM: Math.round(diepte * 100) / 100 });
  }
  return punten;
}

/**
 * Waterspanning u (kPa) op diepte z onder maaiveld.
 * u = gamma_w · max(0, z - grondwaterdiepte)
 */
export function waterspanningKpa(diepteM: number, grondwaterDiepteM: number): number {
  return GAMMA_WATER * Math.max(0, diepteM - Math.max(0, grondwaterDiepteM));
}

/**
 * Effectieve verticale grondspanning sigma'_v (kPa) op diepte z:
 * sigma_v = gamma_droog·z_boven_gw + gamma_nat·z_onder_gw; sigma'_v = sigma_v - u.
 */
export function effectieveSpanningKpa(
  diepteM: number,
  grondwaterDiepteM: number,
  grond: GrondParameters,
): number {
  const gw = Math.max(0, grondwaterDiepteM);
  const boven = Math.min(diepteM, gw);
  const onder = Math.max(0, diepteM - gw);
  const sigmaV = grond.gammaDroogKnM3 * boven + grond.gammaNatKnM3 * onder;
  return sigmaV - waterspanningKpa(diepteM, grondwaterDiepteM);
}

/**
 * Minimaal benodigde boorspoelingdruk (kPa) op diepte z en boorafstand s:
 * p_min = rho_mud·g·z + dp_basis + dp_circ·s  (statische kolom + circulatieverlies).
 */
export function minimaleMuddrukKpa(
  diepteM: number,
  afstandM: number,
  opties: MudOpties = {},
): number {
  const o = { ...MUD_DEFAULTS, ...opties };
  const statisch = (o.mudDichtheidKgM3 * G_VERSNELLING * diepteM) / 1000;
  return statisch + o.basisCirculatieVerliesKpa + o.circulatieVerliesKpaPerM * afstandM;
}

/**
 * Maximaal toelaatbare boorspoelingdruk (kPa, karakteristiek) volgens de
 * cavity-expansieformule van Luger & Hergarden (NEN 3650-1, Delftse methode).
 * Zie module-header voor de volledige formule en bronvermelding.
 */
export function maxToelaatbareMuddrukKpa(params: {
  diepteM: number;
  grondwaterDiepteM: number;
  grond: GrondParameters;
  boorgatDiameterMm: number;
}): number {
  const { diepteM, grondwaterDiepteM, grond, boorgatDiameterMm } = params;
  const u = waterspanningKpa(diepteM, grondwaterDiepteM);
  if (diepteM <= 0.1) return u; // geen dekking: geen overdruk mogelijk

  const sigmaEff = Math.max(0.1, effectieveSpanningKpa(diepteM, grondwaterDiepteM, grond));
  const phi = (grond.phiDeg * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const cCot = grond.cKpa > 0 ? grond.cKpa * (Math.cos(phi) / sinPhi) : 0;

  // Glijdingsmodulus G = E / (2(1+nu))
  const gModulus = grond.eKpa / (2 * (1 + GROND_NU));
  // Elastische term Q
  const q = (sigmaEff * sinPhi + grond.cKpa * Math.cos(phi)) / gModulus;
  // Plastische zone begrensd op halve dekking (NL-praktijk)
  const r0 = boorgatDiameterMm / 2000;
  const rpMax = Math.max(r0, 0.5 * diepteM);
  const ratio = (r0 / rpMax) ** 2 + q;
  const exponent = -sinPhi / (1 + sinPhi);

  const pEffMax = (sigmaEff + cCot) * ratio ** exponent - cCot;
  return u + Math.max(0, pEffMax);
}

/**
 * Volledige mudspanningsberekening met blow-out check langs de boorlijn.
 *
 * Discretiseert de boorlijn, berekent per punt p_min en p_max en toetst de
 * marge (p_max / gamma_m) / p_min >= 1,0. Punten met dekking kleiner dan
 * `minBeoordelingsDiepteM` (in-/uittredezone) worden niet getoetst.
 */
export function berekenMudspanning(invoer: MudInvoer, opties: MudOpties = {}): MudResultaat {
  const o = { ...MUD_DEFAULTS, ...opties };
  const grond = grondParametersUitGrondsoort(invoer.dominantGrondsoort);
  const profiel = diepteProfiel(
    invoer.lengteM,
    invoer.maxDiepteOnderMvM,
    invoer.entryAngleDeg,
    invoer.exitAngleDeg,
    o.aantalPunten,
  );

  const punten: MudPunt[] = profiel.map(({ afstandM, diepteM }) => {
    const pMin = minimaleMuddrukKpa(diepteM, afstandM, o);
    const pMax = maxToelaatbareMuddrukKpa({
      diepteM,
      grondwaterDiepteM: invoer.grondwaterDiepteM,
      grond,
      boorgatDiameterMm: invoer.boorgatDiameterMm,
    });
    const getoetst = diepteM >= o.minBeoordelingsDiepteM;
    const marge = pMin > 0 ? pMax / o.partieleFactor / pMin : Infinity;
    return {
      afstandM,
      diepteM,
      pMinKpa: Math.round(pMin * 10) / 10,
      pMaxKpa: Math.round(pMax * 10) / 10,
      marge: Math.round(marge * 100) / 100,
      voldoet: !getoetst || marge >= 1.0,
      getoetst,
    };
  });

  const getoetstePunten = punten.filter((p) => p.getoetst);
  const kritischPunt = getoetstePunten.reduce<MudPunt | null>(
    (min, p) => (min == null || p.marge < min.marge ? p : min),
    null,
  );
  const minimaleMarge = kritischPunt?.marge ?? Infinity;
  const voldoet = getoetstePunten.every((p) => p.voldoet);

  const aannames = [
    `Boorspoeling dichtheid ${o.mudDichtheidKgM3} kg/m³`,
    `Grond ${invoer.dominantGrondsoort}: phi = ${grond.phiDeg}°, c = ${grond.cKpa} kPa, E = ${grond.eKpa / 1000} MPa (karakteristieke aannamen)`,
    `Circulatieverlies ${o.basisCirculatieVerliesKpa} kPa + ${o.circulatieVerliesKpaPerM} kPa/m boorlengte`,
    `Plastische zone begrensd op 0,5 × dekking (Luger & Hergarden / NEN 3650-1)`,
    `Partiële factor ${o.partieleFactor} op p_max; punten met dekking < ${o.minBeoordelingsDiepteM} m (in-/uittredezone) niet getoetst`,
  ];

  const conclusie =
    kritischPunt == null
      ? 'Geen toetsbare punten — boring te ondiep voor blow-out beoordeling, traject herzien'
      : voldoet
        ? `Blow-out check voldoet — minimale marge ${minimaleMarge.toFixed(2)} op ${kritischPunt.afstandM.toFixed(0)} m (diepte ${kritischPunt.diepteM.toFixed(1)} m); p_max,d ${(kritischPunt.pMaxKpa / o.partieleFactor).toFixed(0)} kPa >= p_min ${kritischPunt.pMinKpa.toFixed(0)} kPa`
        : `Blow-out risico — marge ${minimaleMarge.toFixed(2)} < 1,0 op ${kritischPunt.afstandM.toFixed(0)} m (diepte ${kritischPunt.diepteM.toFixed(1)} m); boring verdiepen, mudgewicht/debiet aanpassen of casing toepassen`;

  return { punten, kritischPunt, minimaleMarge, voldoet, conclusie, aannames };
}
