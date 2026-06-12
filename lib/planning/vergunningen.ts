/**
 * Vergunningenplanning met wettelijke termijnen (Omgevingswet 2024).
 *
 * Leidt uit de tracé-kenmerken de benodigde vergunningen/meldingen af en
 * koppelt daar de wettelijke beslistermijn aan: reguliere procedure 8 weken
 * (+ eenmalig 6 weken verlenging mogelijk), uitgebreide procedure 26 weken.
 */

import { NORMEN } from '@/lib/normen';

export type VergunningProcedure = 'regulier' | 'uitgebreid' | 'melding';

export interface VergunningItem {
  id: string;
  naam: string;
  bevoegdGezag: string;
  procedure: VergunningProcedure;
  /** Wettelijke beslistermijn in weken. */
  termijnWeken: number;
  /** Aanbevolen voorbereidingstijd (weken) vóór indiening. */
  voorbereidingWeken: number;
  grondslag: string;
  toelichting: string;
}

export interface VergunningInput {
  kruistWater: boolean;
  kruistPrimaireWaterkering: boolean;
  kruistSpoor: boolean;
  kruistRijksweg: boolean;
  inNatura2000: boolean;
  inArcheologischVerwachtingsgebied: boolean;
  privaatTerrein: boolean;
  openbareGrondGemeente: boolean;
}

const TERMIJN_REGULIER_WEKEN = 8;
const TERMIJN_UITGEBREID_WEKEN = 26;

/** Leid de vergunningkenmerken af uit de tracékruisingen en -omschrijving. */
export function vergunningInputUitTrace(trace: {
  segmenten: { kruisingen?: { type: string; naam?: string; beheerder?: string }[] }[];
  leglocatie: string;
  omschrijving: string;
}): VergunningInput {
  const kruisingen = trace.segmenten.flatMap((s) => s.kruisingen ?? []);
  const tekst = trace.omschrijving.toLowerCase();
  return {
    kruistWater: kruisingen.some((k) => k.type === 'water'),
    kruistPrimaireWaterkering: kruisingen.some(
      (k) => k.type === 'water' && /kering|dijk/i.test(k.naam ?? ''),
    ),
    kruistSpoor: kruisingen.some((k) => k.type === 'spoor'),
    kruistRijksweg: kruisingen.some(
      (k) => k.type === 'weg' && /rijkswaterstaat/i.test(k.beheerder ?? ''),
    ),
    inNatura2000: tekst.includes('natura'),
    inArcheologischVerwachtingsgebied: tekst.includes('archeolog'),
    privaatTerrein: trace.leglocatie.includes('privaat') || tekst.includes('zakelijk recht'),
    openbareGrondGemeente: true,
  };
}

/** Stel de vergunningenlijst samen op basis van tracé-kenmerken. */
export function deriveVergunningen(input: VergunningInput): VergunningItem[] {
  const items: VergunningItem[] = [];

  if (input.openbareGrondGemeente) {
    items.push({
      id: 'avoi_instemming',
      naam: 'Instemmingsbesluit AVOI / ligplaats kabels en leidingen',
      bevoegdGezag: 'Gemeente',
      procedure: 'regulier',
      termijnWeken: TERMIJN_REGULIER_WEKEN,
      voorbereidingWeken: 2,
      grondslag: 'AVOI / Telecommunicatiewet (graafwerkzaamheden openbare grond)',
      toelichting: 'Instemming gemeente voor werkzaamheden in openbare grond',
    });
  }
  if (input.kruistWater || input.kruistPrimaireWaterkering) {
    items.push({
      id: 'watervergunning',
      naam: input.kruistPrimaireWaterkering
        ? 'Omgevingsvergunning wateractiviteit (primaire waterkering)'
        : 'Watervergunning / melding Keur',
      bevoegdGezag: 'Waterschap',
      procedure: input.kruistPrimaireWaterkering ? 'uitgebreid' : 'regulier',
      termijnWeken: input.kruistPrimaireWaterkering ? TERMIJN_UITGEBREID_WEKEN : TERMIJN_REGULIER_WEKEN,
      voorbereidingWeken: input.kruistPrimaireWaterkering ? 8 : 4,
      grondslag: `${NORMEN.omgevingswet.code} / Keur waterschap; technisch: ${NORMEN.nen3651.code}`,
      toelichting: 'Kruising watergang/kering; boorplan en sterkteberekening als bijlage',
    });
  }
  if (input.kruistSpoor) {
    items.push({
      id: 'prorail',
      naam: 'Vergunning Spoorwegwet (kruising spoor)',
      bevoegdGezag: 'ProRail / ILT',
      procedure: 'uitgebreid',
      termijnWeken: TERMIJN_UITGEBREID_WEKEN,
      voorbereidingWeken: 12,
      grondslag: 'Spoorwegwet art. 19; technisch: NEN 3650-serie',
      toelichting: 'Altijd gestuurde boring; boorengineering-rapport vereist',
    });
  }
  if (input.kruistRijksweg) {
    items.push({
      id: 'rws',
      naam: 'Vergunning Wbr / omgevingsvergunning (kruising rijksweg)',
      bevoegdGezag: 'Rijkswaterstaat',
      procedure: 'regulier',
      termijnWeken: TERMIJN_REGULIER_WEKEN,
      voorbereidingWeken: 8,
      grondslag: `${NORMEN.omgevingswet.code} / Wbr`,
      toelichting: 'Kruising via boring; ontwerp conform RWS-richtlijnen',
    });
  }
  if (input.inNatura2000) {
    items.push({
      id: 'natuur',
      naam: 'Vergunning Natura 2000-activiteit (incl. stikstofbeoordeling)',
      bevoegdGezag: 'Provincie',
      procedure: 'uitgebreid',
      termijnWeken: TERMIJN_UITGEBREID_WEKEN,
      voorbereidingWeken: 12,
      grondslag: `${NORMEN.omgevingswet.code} (natuur); AERIUS-berekening`,
      toelichting: 'Voortoets/passende beoordeling; stikstofdepositie aanlegfase',
    });
  }
  if (input.inArcheologischVerwachtingsgebied) {
    items.push({
      id: 'archeologie',
      naam: 'Archeologisch onderzoek / omgevingsvergunningvoorschrift',
      bevoegdGezag: 'Gemeente',
      procedure: 'melding',
      termijnWeken: 0,
      voorbereidingWeken: 6,
      grondslag: 'Erfgoedwet / omgevingsplan',
      toelichting: 'Bureauonderzoek + eventueel IVO vóór vergunningaanvraag',
    });
  }
  if (input.privaatTerrein) {
    items.push({
      id: 'zro',
      naam: 'Zakelijk recht-overeenkomst / gedoogplicht (BP)',
      bevoegdGezag: 'Grondeigenaren / RVO',
      procedure: 'uitgebreid',
      termijnWeken: TERMIJN_UITGEBREID_WEKEN,
      voorbereidingWeken: 8,
      grondslag: 'Belemmeringenwet Privaatrecht',
      toelichting: 'Minnelijke overeenstemming eerst; gedoogplicht als terugvaloptie (lange doorlooptijd)',
    });
  }

  return items;
}

export interface VergunningPlanningResultaat {
  items: VergunningItem[];
  /** Totale kritieke doorlooptijd in weken (voorbereiding + langste termijn). */
  kritiekeDoorlooptijdWeken: number;
  maatgevend: VergunningItem | null;
}

/** Kritieke vergunningendoorlooptijd: maatgevend = langste (voorbereiding + termijn). */
export function berekenVergunningDoorlooptijd(items: VergunningItem[]): VergunningPlanningResultaat {
  let maatgevend: VergunningItem | null = null;
  let max = 0;
  for (const item of items) {
    const totaal = item.voorbereidingWeken + item.termijnWeken;
    if (totaal > max) {
      max = totaal;
      maatgevend = item;
    }
  }
  return { items, kritiekeDoorlooptijdWeken: max, maatgevend };
}
