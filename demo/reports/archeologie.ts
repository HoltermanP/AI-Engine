import type { DemoTrace } from '../traces';
import { getRapportContext } from './context';
import {
  rapportHeader,
  sectie,
  subsectie,
  samenvattingBlok,
  tabelFromRows,
  segmentenTabel,
  bulletLijst,
  divider,
  rapportFooter,
  inhoudsopgave,
  referentiesBlok,
  bijlagenOverzicht,
  scopeBlok,
  uitvoeringsOrganisatie,
} from './format';

export function rapportArcheologie(trace: DemoTrace): string {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const verwachting = gebied.archeologischeVerwachting;
  const proefsleuvenNodig = verwachting === 'middel' || verwachting === 'hoog';

  const header = rapportHeader({
    titel: 'Bureauonderzoek Archeologie',
    ondertitel: 'Archeologische verwachting conform Erfgoedwet / KNA',
    prefix: 'ARC',
    trace,
    norm: 'Kwaliteitsnorm Nederlandse Archeologie (KNA) — bureauonderzoek niveau 2',
    extraVelden: [
      ['Onderzoekstype', 'Bureauonderzoek (niveau 2)'],
      ['Gemeente', gebied.gemeente],
      ['Uitvoerder', gebied.archeologiePartner],
      ['Breedte onderzoeksgebied', '20 m langs tracé'],
      ['Verwachting', verwachting],
    ],
  });

  const segmentRisico = trace.segmenten.map((s) => [
    s.volgorde,
    s.wegnaam,
    s.legtechniek.replace(/_/g, ' '),
    verwachting === 'negatief' ? 'Laag' : 'Laag-middel',
    s.legtechniek === 'hdd'
      ? 'Geen ontgraving — risico verwaarloosbaar'
      : 'Waarnemingsprotocol aanbevolen bij grondverzet',
  ]);

  return `${header}

${inhoudsopgave([
  { nummer: 1, titel: 'Management summary' },
  { nummer: 2, titel: 'Onderzoeksopzet' },
  { nummer: 3, titel: 'Historische analyse' },
  { nummer: 4, titel: 'Cultuurhistorische context' },
  { nummer: 5, titel: 'Beoordeling per tracésegment' },
  { nummer: 6, titel: 'Conclusie en advies' },
  { nummer: 7, titel: 'Referenties' },
  { nummer: 8, titel: 'Bijlagen' },
])}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace)}

${samenvattingBlok(
  `Het tracé ${trace.code} langs ${trace.wegnaam} in ${gebied.gemeente} heeft een archeologische verwachting van **${verwachting}**. ${gebied.historischeContext}`,
  proefsleuvenNodig
    ? 'Proefsleuvenonderzoek wordt aanbevolen vóór start grondverzet.'
    : 'Geen proefsleuvenonderzoek vereist. Wel waarnemingsprotocol opnemen bij open ontgraving en melding bij onverwachte vondsten.',
  [
    'RCE verwachtingskaart: geen hoge waarden in direct onderzoeksgebied',
    ctx.heeftHdd ? 'HDD-segmenten: geen grondverzet, archeologisch risico verwaarloosbaar' : 'Open ontgraving: waarnemingsprotocol standaard',
    `Archeologisch bureau: ${gebied.archeologiePartner}`,
    'Melding RCE bij onverwachte vondst verplicht (Erfgoedwet art. 5.1)',
  ]
)}`
)}

${divider()}

${sectie(
  2,
  'Onderzoeksopzet',
  `${subsectie('2.1', 'Doel en methodiek', `Het bureauonderzoek bepaalt de archeologische verwachting voor de aanleg van ${trace.netType} langs ${trace.wegnaam}. Methodiek: historisch onderzoek, bronnenonderzoek, reconstructiekaartanalyse en beoordeling per tracésegment conform KNA niveau 2.`)}

${subsectie('2.2', 'Uitvoeringsorganisatie', uitvoeringsOrganisatie(ctx.project?.opdrachtgever ?? 'Opdrachtgever', gebied.archeologiePartner, 'Dr. M. Jansen'))}

${subsectie(
  '2.3',
  'Gebruikte bronnen',
  tabelFromRows(
    ['Bron', 'Type', 'Peildatum', 'Resultaat'],
    [
      ['RCE — Archeologische verwachtingskaart', 'Digitaal', '2026', `Verwachting: ${verwachting}`],
      ['Regionaal Historisch Centrum', 'Archief', '2026', 'Geen relevante registraties'],
      ['TOP10NL / BGT', 'Topografisch', '2026', 'Infrastructuur en bebouwing'],
      ['Luchtfoto\'s 1944–heden', 'Remote sensing', '1944–2026', 'Ontwikkelingsgeschiedenis gebied'],
      ['Historische kadastrale kaarten', 'Archief', '1900–heden', gebied.historischeContext],
      ['Amersfoortse Archief / RCE', 'Digitaal', '2026', 'Geen meldingen archeologische monumenten'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  3,
  'Historische analyse',
  `${subsectie('3.1', 'Reconstructiekaarten en ontwikkeling', bulletLijst([
    gebied.historischeContext,
    'Infrastructuurzone langs weg: utiliteitsstrook, geen nederzettingspatronen',
    'Geen aanwijzingen voor militaire activiteiten in direct onderzoeksgebied',
    'Bodemsporen uit droogmakerij: niet relevant voor archeologische waarden',
  ]))}

${subsectie('3.2', 'Historische bronnen en registraties', bulletLijst([
    'Rijksdienst voor het Cultureel Erfgoed (RCE) — verwachtingskaart geconsulteerd',
    `Gemeente ${gebied.gemeente} — geen archeologische monumenten in tracé`,
    'Provinciaal archeologisch beleid: standaard waarnemingsprotocol bij grondverzet',
    'Geen meldingen in Archis / RCE databank voor onderzoeksgebied',
  ]))}`
)}

${divider()}

${sectie(
  4,
  'Cultuurhistorische context',
  `Het onderzoeksgebied in ${gebied.gemeente} (${gebied.provincie}) kent de volgende cultuurhistorische context:

${gebied.historischeContext}

Er zijn geen aanwijzingen voor:
${bulletLijst([
  'Prehistorische bewoning in het directe tracégebied',
  'Romeinse of middeleeuwse nederzettingen',
  'Historische bedrijvigheid met cultuurhistorische waarde',
  'Militaire structuren of munitierelikwieën',
])}`
)}

${divider()}

${sectie(
  5,
  'Beoordeling per tracésegment',
  `${segmentenTabel(trace)}

${subsectie(
  '5.1',
  'Archeologisch risico per segment',
  tabelFromRows(
    ['Segment', 'Weg', 'Legtechniek', 'Risico', 'Toelichting'],
    segmentRisico
  )
)}

${subsectie(
  '5.2',
  'Beoordelingsmatrix',
  tabelFromRows(
    ['Criterium', 'Score (1–5)', 'Toelichting'],
    [
      ['Historische bewoning', verwachting === 'negatief' ? '1' : '2', gebied.historischeContext],
      ['RCE-verwachtingskaart', verwachting === 'negatief' ? '1' : '2', 'Geen hoge waarden'],
      ['Grondverzet omvang', ctx.heeftHdd ? '1' : '2', ctx.heeftHdd ? 'Minimaal (HDD)' : 'Beperkt (sleuf)'],
      ['Cultuurhistorische waarde', '1', 'Geen monumenten'],
      ['**Totaalrisico**', verwachting === 'negatief' ? 'Laag' : 'Laag-middel', proefsleuvenNodig ? 'Proefsleuven aanbevolen' : 'Bureauonderzoek volstaat'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  6,
  'Conclusie en advies',
  tabelFromRows(
    ['Maatregel', 'Vereist', 'Toelichting'],
    [
      ['Bureauonderzoek niveau 2', '✓ Uitgevoerd', 'Conform KNA'],
      ['Proefsleuvenonderzoek', proefsleuvenNodig ? '✓ Aanbevolen' : '✗ Niet vereist', proefsleuvenNodig ? 'Verhoogde verwachting' : 'Negatieve verwachting'],
      ['Waarnemingsprotocol bij ontgraving', '✓ Aanbevolen', `Standaard bij grondverzet ${gebied.gemeente}`],
      ['Melding RCE bij vondsten', '✓ Verplicht', 'Erfgoedwet art. 5.1'],
      ['Archeologisch veldonderzoek HDD', ctx.heeftHdd ? '✗ Niet vereist' : 'n.v.t.', 'Geen ontgraving bij gestuurde boring'],
      ['Archeologische opgravingsvergunning', '✗ Niet vereist', 'Geen positieve verwachting'],
    ]
  )
)}

${referentiesBlok([
  'Erfgoedwet (2016) — Bescherming archeologisch erfgoed',
  'Kwaliteitsnorm Nederlandse Archeologie (KNA) — Bureauonderzoek niveau 2',
  'CROW-publicatie 132a — Archeologie bij infrastructuur',
  'Handreiking archeologie Rijkswaterstaat / ProRail',
  'RCE — Archeologische verwachtingskaart Nederland',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'Overzichtskaart onderzoeksgebied', beschrijving: 'Tracé en buffer 20 m' },
  { letter: 'B', titel: 'Historische kaarten', beschrijving: 'Reconstructiekaarten 1900–heden' },
  { letter: 'C', titel: 'RCE-uittreksel', beschrijving: 'Verwachtingskaart en monumenten' },
])}

${rapportFooter('Archeologie', trace)}`;
}
