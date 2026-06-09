import type { DemoTrace } from '../traces';
import { getRapportContext } from './context';
import {
  rapportHeader,
  sectie,
  subsectie,
  samenvattingBlok,
  tabelFromRows,
  bulletLijst,
  genummerdeLijst,
  divider,
  rapportFooter,
  inhoudsopgave,
  referentiesBlok,
  bijlagenOverzicht,
  scopeBlok,
} from './format';

export function rapportNgeCe(trace: DemoTrace): string {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const veldonderzoekNodig = gebied.ngeRisico === 'middel' || gebied.ngeRisico === 'hoog';

  const header = rapportHeader({
    titel: 'Bureauonderzoek Niet-Gesprongen Explosieven',
    ondertitel: 'NGE/CE-risicobeoordeling conform CROW-publicatie 132',
    prefix: 'NGE',
    trace,
    norm: 'CROW-publicatie 132 — Niet-gesprongen explosieven',
    extraVelden: [
      ['Onderzoeksgebied', '25 m breed langs tracé'],
      ['Onderzoekstype', 'Bureauonderzoek (fase 1)'],
      ['Gemeente', gebied.gemeente],
      ['Risicoklasse', gebied.ngeRisico],
      ['Uitvoerder', gebied.geotechnischBureau],
    ],
  });

  return `${header}

${inhoudsopgave([
  { nummer: 1, titel: 'Management summary' },
  { nummer: 2, titel: 'Onderzoeksopzet en methodiek' },
  { nummer: 3, titel: 'Historische context' },
  { nummer: 4, titel: 'Risicobeoordeling' },
  { nummer: 5, titel: 'Beoordeling per legtechniek' },
  { nummer: 6, titel: 'Advies en vervolgacties' },
  { nummer: 7, titel: 'Conclusie' },
  { nummer: 8, titel: 'Referenties' },
  { nummer: 9, titel: 'Bijlagen' },
])}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace)}

${samenvattingBlok(
  `Het onderzoeksgebied in ${gebied.gemeente} heeft een NGE/CE-risico van **${gebied.ngeRisico}**. ${gebied.historischeContext}`,
  veldonderzoekNodig
    ? 'Aanvullend veldonderzoek (proefsleuven/magnetometrie) wordt aanbevolen vóór start grondverzet.'
    : 'Veldonderzoek (proefsleuven/sondering) is **niet aanbevolen**. Neem een EOD-procedure op in het werkplan.',
  [
    'BOM-kaart en CE-kaart: geen registraties in onderzoeksgebied',
    'WOII-archieven: geen militaire operaties in tracégebied',
    'Standaard procedure EOD (0800-0201) opnemen in werkplan',
    'Toolbox UXO-herkenning voor grondverzetploeg',
    ctx.heeftHdd ? 'HDD: minimaal grondverzet, risico verder verlaagd' : 'Open ontgraving: visuele inspectie per sleuf',
  ]
)}`
)}

${divider()}

${sectie(
  2,
  'Onderzoeksopzet en methodiek',
  `${subsectie('2.1', 'Doel', `Beoordelen of aanvullend NGE/CE-veldonderzoek noodzakelijk is voor de aanleg van ${trace.netType} langs ${trace.wegnaam} (${ctx.lengteM} m).`)}

${subsectie(
  '2.2',
  'Onderzoeksmethoden',
  tabelFromRows(
    ['Bron / methode', 'Resultaat', 'Betrouwbaarheid'],
    [
      ['BOM-kaart (munitierisico)', 'Geen registraties in onderzoeksgebied', 'Hoog'],
      ['CE-kaart (conventionele explosieven)', 'Geen registraties', 'Hoog'],
      ['Historisch onderzoek WOII', 'Geen militaire operaties gedocumenteerd', 'Hoog'],
      ['Archieven Rijkswaterstaat / gemeente', 'Geen explosieven gerelateerd', 'Middel'],
      ['Veteranen / getuigenverhalen', 'Geen relevante meldingen', 'Laag'],
      ['Luchtfoto-analyse 1944–1945', 'Geen militaire structuren', 'Middel'],
      ['NCE-register (Nederlandse CE)', 'Geen registraties', 'Hoog'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  3,
  'Historische context',
  bulletLijst([
    gebied.historischeContext,
    'WOII: Geen gevechtshandelingen of munitiedumps gedocumenteerd in onderzoeksgebied',
    'Na 1945: Landbouw, infrastructuur en utiliteitsstroken — geen militair gebruik',
    `${trace.wegnaam}: Infrastructuurzone, geen militaire functie`,
    trace.projectId === 'demo-project-005' ? 'Havengebied: beperkte kans op klein kaliber uit training (laag risico)' : 'Geen haven- of militaire activiteiten',
  ])
)}

${divider()}

${sectie(
  4,
  'Risicobeoordeling',
  tabelFromRows(
    ['Factor', 'Score (1–5)', 'Toelichting'],
    [
      ['Militaire activiteit historisch', gebied.ngeRisico === 'verwaarloosbaar' ? '1' : '2', gebied.historischeContext],
      ['Munitierelikwieën bekend', '1', 'Geen registraties BOM/CE'],
      ['Droogmakerij-/grondverzet historisch', '1', 'Geen explosieven gebruikt'],
      ['Landbouw/grondverzet historisch', '1', 'Standaard bewerking'],
      ['BOM/CE-kaart indicaties', '1', 'Geen'],
      ['**Totaalrisico**', `**${gebied.ngeRisico}**`, veldonderzoekNodig ? 'Veldonderzoek aanbevolen' : 'Veldonderzoek niet nodig'],
    ]
  )
)}

${divider()}

${sectie(
  5,
  'Beoordeling per legtechniek',
  tabelFromRows(
    ['Legtechniek', 'NGE-risico', 'Maatregel'],
    trace.segmenten.map((s) => [
      `${s.wegnaam} — ${s.legtechniek.replace(/_/g, ' ')}`,
      s.legtechniek === 'hdd' ? 'Verwaarloosbaar' : gebied.ngeRisico === 'laag' ? 'Laag' : 'Laag-middel',
      s.legtechniek === 'hdd' ? 'Geen aanvullend onderzoek' : 'Visuele inspectie + EOD-procedure bij ontgraving',
    ])
  )
)}

${divider()}

${sectie(
  6,
  'Advies en vervolgacties',
  genummerdeLijst([
    veldonderzoekNodig ? '**Aanvullend NGE/CE-veldonderzoek** aanbevolen (proefsleuven of magnetometrie)' : '**Geen** aanvullend NGE/CE-veldonderzoek vereist',
    'Bij **onverwachte vondst**: werkzaamheden staken, 10 m veiligheidszone, melden bij EOD (0800-0201)',
    'Opnemen in werkplan: procedure bij verdacht object (vorm, kleur, metaaldetectie)',
    'Toolbox-meeting: herkenning UXO voor grondverzetploeg (CROW 132)',
    'Documenteer vondsten in projectlogboek conform CROW 132',
    'Coördinator EOD-aanspreekpunt aanwijzen op project',
  ])
)}

${divider()}

${sectie(
  7,
  'Conclusie',
  tabelFromRows(
    ['Onderdeel', 'Beoordeling', 'Status'],
    [
      ['NGE-risico', gebied.ngeRisico, '✓'],
      ['Veldonderzoek NGE', veldonderzoekNodig ? 'Aanbevolen' : 'Niet vereist', veldonderzoekNodig ? '✓' : '✗'],
      ['CE-onderzoek', 'Niet vereist', '✗'],
      ['EOD-procedure werkplan', 'Opnemen', '✓'],
      ['Toolbox UXO', 'Aanbevolen', '✓'],
    ]
  )
)}

${referentiesBlok([
  'CROW-publicatie 132 — Niet-gesprongen explosieven bij grondverzet',
  'BOM-kaart — Basisregistratie Ondergrond (munitierisico)',
  'CE-kaart — Conventionele explosieven',
  'Handreiking NCE — Rijkswaterstaat',
  'EOD Dienst — Procedure bij vondst explosieven (0800-0201)',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'BOM/CE-kaart uittreksel', beschrijving: 'Onderzoeksgebied 25 m buffer' },
  { letter: 'B', titel: 'Historische analyse WOII', beschrijving: 'Archiefonderzoek' },
  { letter: 'C', titel: 'EOD-procedure werkplan', beschrijving: 'Stappenplan bij vondst UXO' },
])}

${rapportFooter('NGE/CE', trace)}`;
}
