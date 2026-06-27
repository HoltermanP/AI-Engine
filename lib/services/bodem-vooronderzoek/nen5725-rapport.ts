/**
 * Generator voor een CONCEPT-vooronderzoek bodem volgens de hoofdstukstructuur
 * van NEN 5725.
 *
 * HARDE SCOPE-GRENS (ingebakken, geen losse disclaimer):
 *  - Deze generator automatiseert alléén de aggregatie van open geodata (~60%).
 *  - Elke sectie die op mens-werk leunt krijgt een ⚠ Handmatige verificatie
 *    vereist-markering.
 *  - De output claimt NERGENS dat het vooronderzoek compleet of conform is.
 *    De status blijft 'concept' en de eindverantwoordelijkheid ligt bij een
 *    gekwalificeerd persoon (BRL SIKB 2000).
 */

import type { BodemSignaal, SignaalType } from './types';

const HANDMATIG = '⚠ **Handmatige verificatie vereist**';

export interface RapportSectie {
  nummer: string;
  titel: string;
  markdown: string;
  /** Of deze sectie (deels) op niet-geautomatiseerd mens-werk leunt. */
  handmatigeVerificatie: boolean;
  /** Signaaltypes die in deze sectie zijn verwerkt. */
  signaalTypes: SignaalType[];
}

export interface Nen5725Rapport {
  titel: string;
  /** Vaste, ingebakken disclaimer over de scope-grens. */
  disclaimer: string;
  secties: RapportSectie[];
  markdown: string;
  gegenereerdOp: string;
  /** Status blijft altijd 'concept' — nooit 'compleet'/'conform'. */
  status: 'concept';
}

export interface RapportContext {
  /** Korte omschrijving van het projectgebied (bv. tracénaam of bbox). */
  gebiedOmschrijving: string;
  /** Bufferbreedte rond het tracé (m), indien van toepassing. */
  bufferM?: number;
  /** Of er een tracé is gedefinieerd (anders alleen bbox-overzicht). */
  heeftTrace: boolean;
  /** ISO-datum van genereren. */
  gegenereerdOp?: string;
}

const DISCLAIMER =
  'Dit is een door InfraEngine automatisch gegenereerd **concept**. Het aggregeert ' +
  'uitsluitend openbare geodata en leidt daar ruimtelijke signaleringen uit af ' +
  '(circa 60% van een vooronderzoek). Het is **geen volledig en geen conform ' +
  'NEN 5725-vooronderzoek**. De met ⚠ gemarkeerde onderdelen vergen dossieronderzoek, ' +
  'historische analyse en een terreininspectie, en moeten worden uitgevoerd en ' +
  'geaccordeerd door een gekwalificeerd persoon (BRL SIKB 2000).';

function filter(signalen: BodemSignaal[], type: SignaalType): BodemSignaal[] {
  return signalen.filter((s) => s.type === type);
}

function signaalRegels(signalen: BodemSignaal[]): string {
  if (signalen.length === 0) return '_Geen signaleringen afgeleid._';
  return signalen
    .map((s) => {
      const mark = s.handmatigeVerificatie ? '⚠ ' : '';
      const afst =
        s.afstandM !== undefined && s.afstandM > 0 ? ` (afstand ${s.afstandM} m)` : '';
      const datum = s.bronDatum.slice(0, 10);
      return `- ${mark}**${s.titel}**${afst}\n  ${s.toelichting}\n  _Bron: ${s.bron} · opgehaald ${datum}_`;
    })
    .join('\n');
}

/** Genereert het concept-rapport uit de afgeleide signaleringen. */
export function genereerNen5725Rapport(
  signalen: BodemSignaal[],
  context: RapportContext
): Nen5725Rapport {
  const gegenereerdOp = context.gegenereerdOp ?? new Date().toISOString();
  const buffer = context.bufferM ?? 25;

  const verontreiniging = filter(signalen, 'bekende_verontreiniging');
  const ophoging = filter(signalen, 'ophoging_demping');
  const bkk = filter(signalen, 'bodemkwaliteitsklasse');
  const archief = filter(signalen, 'archief_gat');

  const kritisch = signalen.filter((s) => s.ernst === 'kritisch');
  const verdacht = kritisch.length > 0;

  const secties: RapportSectie[] = [
    {
      nummer: '1',
      titel: 'Inleiding, aanleiding en doel',
      handmatigeVerificatie: false,
      signaalTypes: [],
      markdown:
        `Dit concept-vooronderzoek bodem is opgesteld voor **${context.gebiedOmschrijving}** ` +
        'in het kader van voorgenomen graaf-/aanlegwerkzaamheden voor ondergrondse ' +
        'infrastructuur. Doel is het in beeld brengen van de bodemkwaliteit en de ' +
        'mogelijke aanwezigheid van verontreiniging, ter onderbouwing van de ' +
        'onderzoeksstrategie (NEN 5740) en de uitvoering.\n\n' +
        `> ${DISCLAIMER}`,
    },
    {
      nummer: '2',
      titel: 'Afbakening onderzoekslocatie',
      handmatigeVerificatie: false,
      signaalTypes: [],
      markdown: context.heeftTrace
        ? `De onderzoekslocatie is het tracé met een invloedszone (buffer) van **${buffer} m** ` +
          'aan weerszijden. Binnen deze zone zijn de open databronnen geraadpleegd en ' +
          'ruimtelijk getoetst tegen het tracé.'
        : 'De onderzoekslocatie is het opgegeven projectgebied (bbox). Er is nog geen ' +
          'tracé gedefinieerd; een afstands- en doorsnijdingsanalyse volgt zodra het ' +
          'tracé bekend is.',
    },
    {
      nummer: '3.1',
      titel: 'Geraadpleegde open databronnen',
      handmatigeVerificatie: false,
      signaalTypes: [],
      markdown:
        'Geautomatiseerd geraadpleegd (met ophaaldatum per signalering):\n' +
        '- Bodemloket — WBB-locaties (Wet bodembescherming), vector\n' +
        '- PDOK AHN — maaiveldhoogte (ophogingen/dempingen)\n' +
        '- BRO Bodemkaart en Geomorfologische kaart (landschapscontext)\n\n' +
        'Niet automatisch ontsloten en daarom als mens-werk gemarkeerd: bevoegd-gezag-' +
        'archief, historische vergunningen/tanks, historische luchtfoto’s en het ' +
        'locatiebezoek (zie §3.5–§3.6).',
    },
    {
      nummer: '3.2',
      titel: 'Bekende bodemlocaties en eerder onderzoek',
      handmatigeVerificatie: false,
      signaalTypes: ['bekende_verontreiniging'],
      markdown: signaalRegels(verontreiniging),
    },
    {
      nummer: '3.3',
      titel: 'Bodemopbouw en maaiveld (ophogingen/dempingen)',
      handmatigeVerificatie: ophoging.length > 0,
      signaalTypes: ['ophoging_demping'],
      markdown:
        ophoging.length > 0
          ? signaalRegels(ophoging)
          : '_Geen significante hoogteafwijkingen (> 0,5 m) langs het tracé gedetecteerd in de AHN-data._',
    },
    {
      nummer: '3.4',
      titel: 'Bodemkwaliteit (bodemkwaliteitskaart)',
      handmatigeVerificatie: true,
      signaalTypes: ['bodemkwaliteitsklasse'],
      markdown: signaalRegels(bkk),
    },
    {
      nummer: '3.5',
      titel: 'Historisch gebruik en bevoegd-gezag-archief',
      handmatigeVerificatie: true,
      signaalTypes: ['archief_gat'],
      markdown:
        `${HANDMATIG} — de onderstaande onderdelen zijn leidend in het vooronderzoek ` +
        'maar niet via open data te automatiseren:\n\n' +
        signaalRegels(archief.filter((s) => !s.titel.toLowerCase().includes('locatiebezoek'))),
    },
    {
      nummer: '3.6',
      titel: 'Terreininspectie / locatiebezoek',
      handmatigeVerificatie: true,
      signaalTypes: ['archief_gat'],
      markdown:
        `${HANDMATIG} — het verplichte locatiebezoek is niet uitgevoerd en kan niet ` +
        'worden geautomatiseerd.\n\n' +
        signaalRegels(archief.filter((s) => s.titel.toLowerCase().includes('locatiebezoek'))),
    },
    {
      nummer: '4',
      titel: 'Interpretatie en hypothese',
      handmatigeVerificatie: true,
      signaalTypes: ['bekende_verontreiniging', 'ophoging_demping'],
      markdown:
        (verdacht
          ? `Op basis van de geautomatiseerde signalering is de locatie vooralsnog als ` +
            `**verdacht** te beschouwen: er zijn ${kritisch.length} kritische signalering(en) ` +
            'langs of op het tracé. '
          : 'Op basis van de geautomatiseerde signalering zijn geen kritische ' +
            'verontreinigingen langs het tracé gevonden. ') +
        `\n\n${HANDMATIG} — de definitieve hypothese (verdacht/onverdacht, eventueel per ` +
        'deellocatie) kan pas worden vastgesteld na het mens-werk uit §3.4–§3.6.',
    },
    {
      nummer: '5',
      titel: 'Conclusie en vervolgadvies (concept)',
      handmatigeVerificatie: true,
      signaalTypes: [],
      markdown:
        'Dit concept geeft een eerste, op open data gebaseerd beeld. Het is **geen ' +
        'afgerond en geen conform vooronderzoek**. Vervolg:\n' +
        '1. Voltooi de met ⚠ gemarkeerde onderdelen (archief, historie, luchtfoto’s, locatiebezoek).\n' +
        '2. Laat het vooronderzoek toetsen en accorderen door een gekwalificeerd persoon (BRL SIKB 2000).\n' +
        '3. Bepaal op basis daarvan de onderzoeksstrategie en eventueel veldonderzoek (NEN 5740).\n\n' +
        `> ${DISCLAIMER}`,
    },
  ];

  const titel = `Concept-vooronderzoek bodem (NEN 5725) — ${context.gebiedOmschrijving}`;
  const markdown = [
    `# ${titel}`,
    `_Gegenereerd: ${gegenereerdOp.slice(0, 10)} · status: **concept**_`,
    '',
    `> ${DISCLAIMER}`,
    '',
    ...secties.map(
      (s) =>
        `## ${s.nummer} ${s.titel}${s.handmatigeVerificatie ? ' ⚠' : ''}\n\n${s.markdown}`
    ),
  ].join('\n');

  return {
    titel,
    disclaimer: DISCLAIMER,
    secties,
    markdown,
    gegenereerdOp,
    status: 'concept',
  };
}
