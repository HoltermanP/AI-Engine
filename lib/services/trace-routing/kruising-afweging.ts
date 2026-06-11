import type { Discipline } from '@/lib/db/types';

/**
 * Afwegingsmodel voor kruisingen: kiest per situatie de uitvoeringsmethode
 * (asfaltzagen, bestrating openen, persing, nanodrill, gestuurde boring, zinker)
 * en legt vast welke beheerder-eisen gelden (RWS, provincie, gemeente/AVOI,
 * ProRail, waterschap, netbeheerder/waterbedrijf) en waarom alternatieven
 * zijn afgewezen. De afweging komt als opmerking op de tekening terecht.
 */

export type KruisingsMethode =
  | 'asfaltzagen'
  | 'bestrating_openen'
  | 'open_ontgraving'
  | 'persing'
  | 'nanodrill'
  | 'gestuurde_boring'
  | 'avegaarboring'
  | 'zinker';

export const KRUISINGS_METHODE_LABELS: Record<KruisingsMethode, string> = {
  asfaltzagen: 'Asfaltzagen + open ontgraving',
  bestrating_openen: 'Bestrating openen + herstraten',
  open_ontgraving: 'Open ontgraving',
  persing: 'Persing (gesloten front)',
  nanodrill: 'Nanodrill (kleine gestuurde boring)',
  gestuurde_boring: 'Gestuurde boring (HDD)',
  avegaarboring: 'Avegaarboring (mantelbuis)',
  zinker: 'Zinker',
};

export interface KruisingsBesluit {
  methode: KruisingsMethode;
  methodeLabel: string;
  legtechniek: 'open_ontgraving' | 'hdd' | 'persing' | 'sleufloos';
  beheerder: string;
  vergunning: string;
  normReferentie: string;
  /** Gekozen oplossing + afgewezen alternatieven met reden */
  afweging: string[];
}

/** Discipline-specifieke kruisingseis van de net-/waterbeheerder */
function disciplineEis(discipline: Discipline): string | null {
  switch (discipline) {
    case 'elektra_ls':
    case 'elektra_ms':
      return 'Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising';
    case 'gas_ld':
      return 'Netbeheerder gas: PE-leiding in mantelbuis conform NEN 7244-reeks';
    case 'gas_hd':
      return 'GTS/Gasunie: kruising onder NEN 3650-regime met sterkteberekening';
    case 'water':
      return 'Waterbedrijf: NEN-EN 805, doorgaande buis zonder verbinding onder de kruising';
    default:
      return null;
  }
}

function metDisciplineEis(besluit: KruisingsBesluit, discipline: Discipline): KruisingsBesluit {
  const eis = disciplineEis(discipline);
  if (eis) besluit.afweging.push(eis);
  return besluit;
}

export function beoordeelWegkruising(
  wegType: string,
  naam: string,
  discipline: Discipline
): KruisingsBesluit {
  const type = wegType.toLowerCase();
  const label = naam.toLowerCase();

  if (type.includes('rijk')) {
    return metDisciplineEis(
      {
        methode: 'gestuurde_boring',
        methodeLabel: KRUISINGS_METHODE_LABELS.gestuurde_boring,
        legtechniek: 'hdd',
        beheerder: 'Rijkswaterstaat',
        vergunning: 'Wbr-vergunning (RWS)',
        normReferentie: 'NEN 3650/3651 · Wet beheer rijkswaterstaatswerken',
        afweging: [
          'Gestuurde boring gekozen: kruising rijksweg vereist gesloten front (eis RWS)',
          'Open ontgraving/asfaltzagen afgewezen: niet toegestaan in rijksweg',
          'Persing als alternatief bij korte, ondiepe kruising',
        ],
      },
      discipline
    );
  }

  if (type.includes('provincia')) {
    return metDisciplineEis(
      {
        methode: 'persing',
        methodeLabel: KRUISINGS_METHODE_LABELS.persing,
        legtechniek: 'persing',
        beheerder: 'Provincie (wegbeheerder)',
        vergunning: 'Vergunning/ontheffing wegbeheerder provincie',
        normReferentie: 'NEN 7171 · provinciale legvoorschriften',
        afweging: [
          'Persing gekozen: provinciale weg mag niet opengebroken (doorstroming N-weg)',
          'Avegaarboring of gestuurde boring gelijkwaardig alternatief (mantelbuis)',
          'Asfaltzagen afgewezen: gesloten front vereist door provincie',
        ],
      },
      discipline
    );
  }

  // Gemeentewegen: methode hangt af van verhardingstype (BGT-label)
  if (label.includes('open verharding') || label.includes('parkeervlak')) {
    return metDisciplineEis(
      {
        methode: 'bestrating_openen',
        methodeLabel: KRUISINGS_METHODE_LABELS.bestrating_openen,
        legtechniek: 'open_ontgraving',
        beheerder: 'Gemeente (AVOI)',
        vergunning: 'Instemmingsbesluit gemeente (AVOI)',
        normReferentie: 'AVOI gemeente · CROW 500',
        afweging: [
          'Bestrating openen gekozen: elementenverharding kan worden herstraat',
          'Boring afgewezen: onnodig kostbaar bij open verharding',
          'Herstel en degeneratievergoeding conform AVOI',
        ],
      },
      discipline
    );
  }

  if (label.includes('onverhard') || label.includes('berm')) {
    return metDisciplineEis(
      {
        methode: 'open_ontgraving',
        methodeLabel: KRUISINGS_METHODE_LABELS.open_ontgraving,
        legtechniek: 'open_ontgraving',
        beheerder: 'Gemeente (AVOI)',
        vergunning: 'Instemmingsbesluit gemeente (AVOI)',
        normReferentie: 'AVOI gemeente · CROW 500',
        afweging: ['Open ontgraving: onverhard, geen verhardingsherstel nodig'],
      },
      discipline
    );
  }

  if (label.includes('fietspad') || label.includes('voetpad') || label.includes('voetgangers')) {
    return metDisciplineEis(
      {
        methode: 'asfaltzagen',
        methodeLabel: KRUISINGS_METHODE_LABELS.asfaltzagen,
        legtechniek: 'sleufloos',
        beheerder: 'Gemeente (AVOI)',
        vergunning: 'Instemmingsbesluit gemeente (AVOI)',
        normReferentie: 'AVOI gemeente · CROW 500',
        afweging: [
          'Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder',
          'Nanodrill afgewezen: niet kosteneffectief voor smal pad',
          'Herstel asfalt conform eisen gemeente',
        ],
      },
      discipline
    );
  }

  // Rijbaan met gesloten verharding (asfalt)
  return metDisciplineEis(
    {
      methode: 'nanodrill',
      methodeLabel: KRUISINGS_METHODE_LABELS.nanodrill,
      legtechniek: 'sleufloos',
      beheerder: 'Gemeente (AVOI)',
      vergunning: 'Instemmingsbesluit gemeente (AVOI)',
      normReferentie: 'AVOI gemeente · NEN 7171',
      afweging: [
        'Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder',
        'Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)',
        'Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)',
      ],
    },
    discipline
  );
}

export function beoordeelWaterkruising(
  breedteM: number,
  discipline: Discipline
): KruisingsBesluit {
  if (breedteM > 10) {
    const besluit: KruisingsBesluit = {
      methode: 'gestuurde_boring',
      methodeLabel: KRUISINGS_METHODE_LABELS.gestuurde_boring,
      legtechniek: 'hdd',
      beheerder: 'Waterschap',
      vergunning: 'Watervergunning (keur/legger waterschap)',
      normReferentie:
        discipline === 'water'
          ? 'NEN 3650/3651 + NEN-EN 805 · keur waterschap'
          : 'NEN 3650/3651 · keur waterschap',
      afweging: [
        `Gestuurde boring (HDD) gekozen: watergang ≈${Math.round(breedteM)} m breed`,
        'Open kruising/tijdelijke dam afgewezen: niet toegestaan op legger-watergang',
        'Persing afgewezen: kruising te lang voor gesloten front',
      ],
    };
    if (discipline === 'water') {
      besluit.afweging.push('Zinker als terugvaloptie bij ondiepe gestuurde boring (NEN-EN 805)');
    }
    return metDisciplineEis(besluit, discipline);
  }

  if (breedteM > 4) {
    return metDisciplineEis(
      {
        methode: 'gestuurde_boring',
        methodeLabel: KRUISINGS_METHODE_LABELS.gestuurde_boring,
        legtechniek: 'persing',
        beheerder: 'Waterschap',
        vergunning: 'Watervergunning (keur/legger waterschap)',
        normReferentie: 'NEN 3650 · keur waterschap',
        afweging: [
          `Gestuurde boring gekozen: watergang ≈${Math.round(breedteM)} m`,
          'Avegaarboring of persing gelijkwaardig alternatief bij draagkrachtige bodem',
          discipline === 'water'
            ? 'Zinker alternatief voor drinkwaterleiding (NEN-EN 805)'
            : 'Open kruising afgewezen: keur waterschap',
        ],
      },
      discipline
    );
  }

  return metDisciplineEis(
    {
      methode: 'nanodrill',
      methodeLabel: KRUISINGS_METHODE_LABELS.nanodrill,
      legtechniek: 'sleufloos',
      beheerder: 'Waterschap',
      vergunning: 'Watervergunning of melding (keur waterschap)',
      normReferentie: 'Keur waterschap',
      afweging: [
        'Nanodrill gekozen: smalle watergang/duiker, taluds blijven onaangetast',
        'Open kruising met tijdelijke dam afgewezen: beschadigt talud en profiel (keur)',
      ],
    },
    discipline
  );
}

export function beoordeelSpoorkruising(discipline: Discipline): KruisingsBesluit {
  return metDisciplineEis(
    {
      methode: 'persing',
      methodeLabel: 'Persing/boring in mantelbuis',
      legtechniek: 'persing',
      beheerder: 'ProRail',
      vergunning: 'Vergunning ProRail (Spoorwegwet)',
      normReferentie: 'NEN 3654 · ProRail OVS00030',
      afweging: [
        'Avegaarboring/persing in stalen mantelbuis: verplicht onder spoor (ProRail OVS)',
        'Open kruising uitgesloten: spoor mag niet onderbroken',
        'Gestuurde boring alternatief bij grotere diepteligging',
      ],
    },
    discipline
  );
}
