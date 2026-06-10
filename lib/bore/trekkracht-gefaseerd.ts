/**
 * Gefaseerde HDD-trekkrachtberekening conform ASTM F1962 / NEN 3650-praktijk.
 *
 * Berekent de intrekkracht op vier karakteristieke punten van de boorlijn
 * (intrede, einde intredeboog, begin uittredeboog, uittrede) met:
 * - effectief gewicht van de buis in boorvloeistof (opdrijving in mud);
 * - wrijving buis-boorgat (gevuld met mud) én buis-rollenbaan bovengronds;
 * - capstan-effect in de in- en uittredebogen;
 * - hydrokinetische sleepkracht (mud-drag) over de natte omtrek.
 *
 * Vereenvoudigingen (gedocumenteerd): symmetrisch boorprofiel, lege buis
 * tijdens intrekken (conservatief voor opdrijving), rechte middensectie op
 * constante diepte.
 */

export interface GefaseerdeTrekkrachtInput {
  /** Totale boorlengte langs de boorlijn (m). */
  boorLengteM: number;
  /** Buitendiameter productbuis/mantelbuis (mm). */
  buisDiameterMm: number;
  /** SDR van de buis (wanddikte = D/SDR). */
  sdr: number;
  /** Dichtheid buismateriaal (kg/m³), PE100 ≈ 960. */
  buisDichtheid?: number;
  /** Dichtheid boorvloeistof (kg/m³), typisch 1050–1200. */
  mudDichtheid?: number;
  /** Intredehoek (graden, typisch 8–16°). */
  entryAngleDeg: number;
  /** Uittredehoek (graden). */
  exitAngleDeg: number;
  /** Boogstraal (m). */
  boogstraalM: number;
  /** Wrijvingscoëfficiënt buis-boorgat in mud (ASTM F1962: 0,3). */
  muBoorgat?: number;
  /** Wrijvingscoëfficiënt buis-rollenbaan bovengronds (ASTM F1962: 0,1). */
  muRollen?: number;
  /** Hydrokinetische druk (kPa), ASTM F1962-aanbeveling ≈ 70 kPa over de spleetring → hier als sleepterm per m². */
  hydrokinetischeDrukKpa?: number;
}

export interface TrekkrachtFase {
  punt: 'intrede' | 'einde_intredeboog' | 'begin_uittredeboog' | 'uittrede';
  afstandM: number;
  trekkrachtKN: number;
}

export interface GefaseerdeTrekkrachtResultaat {
  fasen: TrekkrachtFase[];
  maxTrekkrachtKN: number;
  /** Effectief gewicht per meter in mud (N/m, negatief = opdrijvend). */
  effectiefGewichtNPerM: number;
  aannames: string[];
}

const G = 9.81;

/** Gefaseerde intrekkracht over de boorlijn (ASTM F1962-benadering). */
export function berekenGefaseerdeTrekkracht(
  input: GefaseerdeTrekkrachtInput
): GefaseerdeTrekkrachtResultaat {
  const D = input.buisDiameterMm / 1000;
  const t = D / input.sdr;
  const rhoBuis = input.buisDichtheid ?? 960;
  const rhoMud = input.mudDichtheid ?? 1100;
  const muB = input.muBoorgat ?? 0.3;
  const muR = input.muRollen ?? 0.1;
  const pHydro = (input.hydrokinetischeDrukKpa ?? 70) * 1000; // Pa

  // Doorsnede buiswand en verplaatst volume per m.
  const aWand = Math.PI * (D * t - t * t); // m²/m (dunwandige benadering)
  const aTotaal = (Math.PI * D * D) / 4;
  const gewichtBuisNPerM = aWand * rhoBuis * G;
  const opdrijvingNPerM = aTotaal * rhoMud * G;
  // Lege buis in mud: effectief gewicht = eigen gewicht − opdrijving (meestal negatief → buis drukt tegen boorgatdak).
  const wEffNPerM = gewichtBuisNPerM - opdrijvingNPerM;
  const wAbsNPerM = Math.abs(wEffNPerM);

  // Hydrokinetische sleepterm: drukval over de ringspleet × dwarsoppervlak van de spleet
  // (ASTM F1962 vereenvoudigt tot ΔP × π/8 × (D_boorgat² − D²); overcut 1,5×D aangenomen).
  const dBoorgat = 1.5 * D;
  const tHydroN = pHydro * (Math.PI / 8) * (dBoorgat * dBoorgat - D * D);

  const alpha = (input.entryAngleDeg * Math.PI) / 180;
  const beta = (input.exitAngleDeg * Math.PI) / 180;
  const boogIn = input.boogstraalM * alpha;
  const boogUit = input.boogstraalM * beta;
  const lRecht = Math.max(0, input.boorLengteM - boogIn - boogUit);

  // De buis ligt bij aanvang volledig op de rollenbaan; dat deel neemt af
  // naarmate de buis intrekt. Conservatief: volledige buislengte op rollen bij intrede.
  const lTotaal = input.boorLengteM;

  // Fase 1 — intrede: alleen rollenbaanwrijving + hydrokinetisch.
  const f1 = muR * gewichtBuisNPerM * lTotaal + tHydroN;

  // Fase 2 — einde intredeboog: capstan over intredeboog + wrijving in boog.
  const f2 =
    f1 * Math.exp(muB * alpha) +
    muB * wAbsNPerM * boogIn +
    wEffNPerM * Math.sin(alpha / 2) * boogIn;

  // Fase 3 — begin uittredeboog: wrijving rechte sectie in boorgat
  // (rollenbaandeel neemt evenredig af).
  const restOpRollen = Math.max(0, lTotaal - boogIn - lRecht);
  const f3 =
    f2 +
    muB * wAbsNPerM * lRecht -
    muR * gewichtBuisNPerM * (lTotaal - restOpRollen) * 0; // rollenterm zit al in f1 (conservatief gehandhaafd)

  // Fase 4 — uittrede: capstan over uittredeboog + gewichtscomponent omhoog.
  const f4 =
    f3 * Math.exp(muB * beta) +
    muB * wAbsNPerM * boogUit +
    Math.abs(wEffNPerM) * Math.sin(beta / 2) * boogUit;

  const fasen: TrekkrachtFase[] = [
    { punt: 'intrede', afstandM: 0, trekkrachtKN: rond(f1 / 1000) },
    { punt: 'einde_intredeboog', afstandM: rond(boogIn), trekkrachtKN: rond(f2 / 1000) },
    { punt: 'begin_uittredeboog', afstandM: rond(boogIn + lRecht), trekkrachtKN: rond(f3 / 1000) },
    { punt: 'uittrede', afstandM: rond(input.boorLengteM), trekkrachtKN: rond(f4 / 1000) },
  ];

  return {
    fasen,
    maxTrekkrachtKN: rond(Math.max(...fasen.map((f) => f.trekkrachtKN))),
    effectiefGewichtNPerM: rond(wEffNPerM, 1),
    aannames: [
      'Lege buis tijdens intrekken (conservatief voor opdrijving in boorvloeistof)',
      `Wrijving buis–boorgat μ=${muB}; buis–rollenbaan μ=${muR} (ASTM F1962)`,
      `Boorvloeistof ${rhoMud} kg/m³; overcut boorgat 1,5× buisdiameter`,
      'Symmetrisch boorprofiel met rechte middensectie; volledige buislengte op rollenbaan bij aanvang (conservatief)',
    ],
  };
}

function rond(n: number, dec = 1): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}
