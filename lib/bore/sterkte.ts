/**
 * Sterktecontrole productbuis (HDPE PE100) tijdens intrekken/persen.
 *
 * Conform NEN 3650-1:2020 (sterkte-eisen buisleidingsystemen) en
 * ASTM F1962-22 (installatiebelastingen PE-buizen bij HDD):
 *
 * 1. Ringstijfheid / buckling ongesteunde buis (kortdurend, Timoshenko):
 *      p_cr = 2·E / (1 - nu²) · (1 / (SDR - 1))³
 *    met E_PE100,kort ≈ 1100 MPa en nu = 0,4. Toets: p_cr / p_ext >= 2,0.
 *
 * 2. Axiale trekspanning tijdens intrekken:
 *      sigma_trek = F_trek / A_wand
 *    plus buigspanning in de boog:
 *      sigma_b = E · D / (2·R)
 *    Toets aan toelaatbare kortdurende trekspanning PE100
 *    (sigma_toel ≈ 10–12 MPa, parameter).
 *
 * 3. Combinatiecheck (unity check):
 *      UC = (sigma_trek + sigma_b) / sigma_toel <= 1,0
 */

export interface SterkteInvoer {
  /** Uitwendige buisdiameter (mm). */
  buisDiameterMm: number;
  /** Standard Dimension Ratio D/t. Default 11. */
  sdr?: number;
  /** Trek- of duwkracht tijdens installatie (kN). */
  trekkrachtKN: number;
  /** Boogstraal van het boortraject (m). */
  boogstraalM: number;
  /** Diepte buishart onder maaiveld (m). */
  diepteM: number;
  /** Grondwaterstand onder maaiveld (m). */
  grondwaterDiepteM: number;
  /** Dichtheid boorspoeling (kg/m³). Default 1100. */
  mudDichtheidKgM3?: number;
  /** Kortdurende E-modulus PE100 (MPa). Default 1100. */
  eKortMpa?: number;
  /** Dwarscontractiecoëfficiënt PE. Default 0,4. */
  nu?: number;
  /** Toelaatbare kortdurende trekspanning PE100 (MPa). Default 12. */
  sigmaToelaatbaarMpa?: number;
  /** Vereiste veiligheidsfactor buckling. Default 2,0. */
  bucklingVeiligheidsfactor?: number;
  /** Circulatietoeslag muddruk tijdens intrekken (kPa). Default 10. */
  circulatieToeslagKpa?: number;
}

const STERKTE_DEFAULTS = {
  sdr: 11,
  mudDichtheidKgM3: 1100,
  eKortMpa: 1100,
  nu: 0.4,
  sigmaToelaatbaarMpa: 12,
  bucklingVeiligheidsfactor: 2.0,
  circulatieToeslagKpa: 10,
};

export interface SterkteResultaat {
  /** Wanddikte t = D/SDR (mm). */
  wanddikteMm: number;
  /** Wanddoorsnede A = pi·t·(D - t) (m²). */
  wandOppervlakM2: number;
  /** Kritische externe druk p_cr (kPa). */
  pCrKpa: number;
  /** Maatgevende externe druk tijdens intrekken (kPa). */
  pExtKpa: number;
  /** Veiligheidsfactor buckling p_cr / p_ext. */
  bucklingSF: number;
  /** Buckling voldoet (SF >= vereiste factor)? */
  bucklingVoldoet: boolean;
  /** Axiale trekspanning (MPa). */
  sigmaTrekMpa: number;
  /** Buigspanning in de boog (MPa). */
  sigmaBuigMpa: number;
  /** Unity check (sigma_trek + sigma_b) / sigma_toel. */
  unityCheck: number;
  /** Unity check voldoet (<= 1,0)? */
  unityVoldoet: boolean;
  /** Totaaloordeel. */
  voldoet: boolean;
  /** NL-conclusietekst. */
  conclusie: string;
  /** Gehanteerde aannames. */
  aannames: string[];
}

/**
 * Kritische externe druk ongesteunde buis (kPa), kortdurend:
 * p_cr = 2·E / (1 - nu²) · (1 / (SDR - 1))³   [Timoshenko; NEN 3650-1 / ASTM F1962]
 */
export function kritischeBuckdrukKpa(eMpa: number, nu: number, sdr: number): number {
  const pCrMpa = ((2 * eMpa) / (1 - nu * nu)) * (1 / (sdr - 1)) ** 3;
  return pCrMpa * 1000;
}

/**
 * Maatgevende externe druk op de lege buis tijdens intrekken (kPa).
 * De boorspoeling draagt de grond- en waterdruk over op de buis:
 * p_ext = rho_mud·g·z + circulatietoeslag.
 */
export function externeDrukIntrekkenKpa(
  diepteM: number,
  mudDichtheidKgM3: number,
  circulatieToeslagKpa: number,
): number {
  return (mudDichtheidKgM3 * 9.81 * Math.max(0, diepteM)) / 1000 + circulatieToeslagKpa;
}

/**
 * Wanddoorsnede van de buis (m²): A = pi·t·(D - t) met t = D/SDR.
 */
export function wandOppervlakM2(buisDiameterMm: number, sdr: number): number {
  const d = buisDiameterMm / 1000;
  const t = d / sdr;
  return Math.PI * t * (d - t);
}

/**
 * Buigspanning in de boog (MPa): sigma_b = E·D / (2·R)
 * met E in MPa, D en R in m.
 */
export function buigspanningMpa(eMpa: number, buisDiameterMm: number, boogstraalM: number): number {
  return (eMpa * (buisDiameterMm / 1000)) / (2 * boogstraalM);
}

/**
 * Volledige sterktecontrole productbuis (HDPE) volgens NEN 3650-1 /
 * ASTM F1962: buckling onder externe druk, axiale spanning bij intrekken
 * en combinatie-unity-check. Zie module-header voor formules.
 */
export function berekenSterkte(invoer: SterkteInvoer): SterkteResultaat {
  const o = { ...STERKTE_DEFAULTS, ...invoer };

  // 1. Buckling
  const pCr = kritischeBuckdrukKpa(o.eKortMpa, o.nu, o.sdr);
  const pExt = externeDrukIntrekkenKpa(o.diepteM, o.mudDichtheidKgM3, o.circulatieToeslagKpa);
  const bucklingSF = pExt > 0 ? pCr / pExt : Infinity;
  const bucklingVoldoet = bucklingSF >= o.bucklingVeiligheidsfactor;

  // 2. Axiale spanning + buiging
  const tMm = o.buisDiameterMm / o.sdr;
  const aWand = wandOppervlakM2(o.buisDiameterMm, o.sdr);
  const sigmaTrek = o.trekkrachtKN / aWand / 1000; // kN/m² -> MPa
  const sigmaBuig = buigspanningMpa(o.eKortMpa, o.buisDiameterMm, o.boogstraalM);

  // 3. Combinatiecheck
  const unity = (sigmaTrek + sigmaBuig) / o.sigmaToelaatbaarMpa;
  const unityVoldoet = unity <= 1.0;

  const voldoet = bucklingVoldoet && unityVoldoet;
  const conclusie = voldoet
    ? `Buissterkte voldoet — buckling SF ${bucklingSF.toFixed(1)} (>= ${o.bucklingVeiligheidsfactor.toFixed(1)}), unity check ${unity.toFixed(2)} (<= 1,0)`
    : !bucklingVoldoet
      ? `Bucklingrisico — SF ${bucklingSF.toFixed(2)} < ${o.bucklingVeiligheidsfactor.toFixed(1)}; lagere SDR (dikkere wand) of ballasten van de buis toepassen`
      : `Axiale spanning te hoog — unity check ${unity.toFixed(2)} > 1,0; trekkracht reduceren (boorspoeling, traject) of zwaardere buisklasse kiezen`;

  return {
    wanddikteMm: Math.round(tMm * 10) / 10,
    wandOppervlakM2: Math.round(aWand * 1e6) / 1e6,
    pCrKpa: Math.round(pCr * 10) / 10,
    pExtKpa: Math.round(pExt * 10) / 10,
    bucklingSF: Math.round(bucklingSF * 100) / 100,
    bucklingVoldoet,
    sigmaTrekMpa: Math.round(sigmaTrek * 100) / 100,
    sigmaBuigMpa: Math.round(sigmaBuig * 100) / 100,
    unityCheck: Math.round(unity * 100) / 100,
    unityVoldoet,
    voldoet,
    conclusie,
    aannames: [
      `PE100, SDR ${o.sdr}, wanddikte ${(o.buisDiameterMm / o.sdr).toFixed(1)} mm`,
      `E-kort = ${o.eKortMpa} MPa, nu = ${o.nu}, sigma_toel = ${o.sigmaToelaatbaarMpa} MPa (kortdurend)`,
      `Externe druk = boorspoelingkolom (${o.mudDichtheidKgM3} kg/m³) + ${o.circulatieToeslagKpa} kPa circulatietoeslag; lege buis tijdens intrekken`,
    ],
  };
}
