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
  uitvoeringsOrganisatie,
} from './format';

export function rapportEcologieWnb(trace: DemoTrace): string {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const heeftWater = ctx.waterkruisingen.length > 0 || trace.segmenten.some((s) => s.leglocatie.includes('water'));

  const header = rapportHeader({
    titel: 'Ecologische Quickscan',
    ondertitel: 'Toetsing Wet natuurbescherming (Wnb) en Habitatrichtlijn',
    prefix: 'ECO',
    trace,
    norm: 'Wet natuurbescherming / Handreiking Ecologische Quickscan',
    extraVelden: [
      ['Onderzoeksgebied', '50 m breed langs tracé'],
      ['Uitvoerder', gebied.ecologieAdviesbureau],
      ['Onderzoeksmethode', 'Literatuur + veldwaarneming (1 dag)'],
      ['Broedseizoen', '15 maart – 15 juli'],
      ['Gemeente', gebied.gemeente],
    ],
  });

  return `${header}

${inhoudsopgave([
  { nummer: 1, titel: 'Management summary' },
  { nummer: 2, titel: 'Onderzoeksopzet' },
  { nummer: 3, titel: 'Beschermde soorten' },
  { nummer: 4, titel: 'Broedvogelonderzoek' },
  { nummer: 5, titel: 'Waterkruisingen en habitats' },
  { nummer: 6, titel: 'Mitigerende maatregelen' },
  { nummer: 7, titel: 'Conclusie' },
  { nummer: 8, titel: 'Referenties' },
  { nummer: 9, titel: 'Bijlagen' },
])}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace, `Ecologische quickscan voor ${gebied.gemeente}, ${gebied.provincie}.`)}

${samenvattingBlok(
  `In het onderzoeksgebied langs ${trace.wegnaam} zijn **5–7 beschermde soorten** en **2–3 beschermde habitattypen** van belang. Bij naleving van mitigatiemaatregelen zijn **geen onaanvaardbare effecten** op beschermde soorten te verwachten.`,
  `Werkzaamheden uitvoeren **buiten het broedseizoen** (15 maart – 15 juli). ${heeftWater ? 'Ecologisch toezicht bij waterkruisingen.' : 'Geen ecologisch toezicht vereist bij ontbreken waterkruisingen.'}`,
  [
    'Wnb-toets: doorgang mogelijk met maatregelen',
    'Broedseizoentoets: planning aanpassen',
    'Ecologisch veldonderzoek niet vereist (quick scan volstaat)',
    heeftWater ? 'Ecologisch toezicht aanbevolen bij waterkruising' : 'Geen waterkruisingen in tracé',
    gebied.natura2000 ? `Natura2000 ${gebied.natura2000.naam} op ${gebied.natura2000.afstandM} m` : 'Geen N2000 in directe nabijheid',
  ]
)}`
)}

${divider()}

${sectie(
  2,
  'Onderzoeksopzet',
  `${subsectie('2.1', 'Doel en scope', `De ecologische quickscan beoordeelt effecten van de aanleg van ${trace.netType} op beschermde soorten en habitats conform de Wet natuurbescherming. Onderzoeksgebied: 50 m buffer langs het tracé (${ctx.lengteM} m).`)}

${subsectie('2.2', 'Uitvoeringsorganisatie', uitvoeringsOrganisatie(ctx.project?.opdrachtgever ?? 'Opdrachtgever', gebied.ecologieAdviesbureau, 'Ir. S. de Vries'))}

${subsectie(
  '2.3',
  'Methodiek',
  tabelFromRows(
    ['Methode', 'Uitvoering', 'Resultaat'],
    [
      ['Literatuuronderzoek', 'NDFF, Sovon, provinciale atlas', '5–7 relevante soorten geïdentificeerd'],
      ['Veldwaarneming', '1 dag, voorjaar 2026', 'Nestplaatsen zanglijster en roodborst'],
      ['Habitatbeoordeling', 'BGT + terrestrisch', '2–3 Wnb-habitattypen in bufferzone'],
      ['Effectbeoordeling', 'Quick scan methode', 'Geen onaanvaardbare effecten bij maatregelen'],
      ['Broedseizoentoets', 'Kalenderanalyse', 'Werk buiten 15 mrt – 15 jul in gevoelige zones'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  3,
  'Beschermde soorten in onderzoeksgebied',
  tabelFromRows(
    ['Soort', 'Wet', 'Status', 'Kans aanwezigheid', 'Effect werkzaamheden'],
    [
      ['Kauw (Corvus monedula)', 'Wnb Bijlage II', 'Broedend in nestkasten', 'Matig', 'Laag bij juiste timing'],
      ['Zanglijster (Turdus philomelos)', 'Wnb Bijlage II', 'Broedend in hagen', 'Hoog', 'Matig — broedseizoen vermijden'],
      ['Roodborst (Erithacus rubecula)', 'Wnb Bijlage II', 'Broedend in beplanting', 'Hoog', 'Matig — broedseizoen vermijden'],
      ['Gewone pad (Bufo bufo)', 'Wnb Bijlage II', 'In slootkanten', heeftWater ? 'Matig' : 'Laag', heeftWater ? 'Matig bij waterkruising' : 'Verwaarloosbaar'],
      ['Das (Meles meles)', 'Wnb Bijlage II', 'In perifeer gebied', 'Laag', 'Verwaarloosbaar'],
      ['Bittervoorn (Rhodeus amarus)', 'Habitatrichtlijn', 'In nabijgelegen sloot', heeftWater ? 'Matig' : 'Laag', heeftWater ? 'Laag bij maatregelen' : 'Geen'],
      ['Huismus (Passer domesticus)', '—', 'Niet beschermd sinds 2023', 'Aanwezig', 'Geen'],
    ]
  )
)}

${divider()}

${sectie(
  4,
  'Broedvogelonderzoek',
  `${subsectie('4.1', 'Methode en uitvoering', 'Literatuuronderzoek gecombineerd met veldwaarneming. Inventarisatie langs het tracé en in bufferzone van 50 m. Waarnemingsperiode: maart–april 2026.')}

${subsectie('4.2', 'Resultaten', bulletLijst([
  'Nestplaatsen zanglijster en roodborst in slootkanten, hagen en nestkasten',
  'Geen nesten in het directe tracé, wel binnen 30 m (hagen en nestkasten)',
  'Kauw broedt in nestkasten op perceelgrenzen — niet in sleuflocatie',
  'Geen broedende roofvogels of uilen in onderzoeksgebied',
  'Geen beschermde vleermuizen in directe nabijheid tracé',
]))}

${subsectie('4.3', 'Advies timing', 'Tracéwerkzaamheden plannen **vóór 15 maart** of **na 15 juli**. Bij uitzonderlijke omstandigheden: overleg met ecologisch adviseur en eventueel nestcontrole.')}`
)}

${divider()}

${sectie(
  5,
  'Waterkruisingen en aquatische habitats',
  heeftWater
    ? tabelFromRows(
        ['Watergang', 'Kruising tracé', 'Beschermde soorten', 'Maatregel'],
        [
          ['Prinsengracht Noord / slootkruising', 'Ja', 'Bittervoorn, gewone pad', 'Ecologisch toezicht, werkvak afzetten'],
          ['Overige sloten', 'Eventueel', 'Amfibieën', 'Bouwhekken bij schemering'],
        ]
      )
    : `Geen waterkruisingen in het tracé ${trace.code}. Aquatische habitats bevinden zich buiten het directe werkgebied. Geen aanvullende maatregelen voor watergerelateerde soorten vereist.`
)}

${divider()}

${sectie(
  6,
  'Mitigerende maatregelen',
  genummerdeLijst([
    '**Timing:** Geen werkzaamheden 15 maart – 15 juli in ecologisch gevoelige zones',
    heeftWater ? '**Ecologisch toezicht:** Bij waterkruising (1 ecoloog, 2 bezoeken)' : '**Ecologisch toezicht:** Niet vereist (geen waterkruising)',
    '**Nestkasten:** Niet verwijderen; eventueel tijdelijk verplaatsen in overleg met grondeigenaar',
    '**Slootkanten:** Minimaal 2 m breed groen buffer handhaven na werkzaamheden',
    '**Bouwhekken:** Voorkomen dat amfibieën in sleuf vallen (afdekken bij schemering)',
    '**Verlichting:** Geen nachtwerk in broedseizoen nabij nestplaatsen',
    '**Habitatherstel:** Herstel beplanting in berm na werkzaamheden',
  ])
)}

${divider()}

${sectie(
  7,
  'Conclusie',
  tabelFromRows(
    ['Aspect', 'Beoordeling', 'Status'],
    [
      ['Wnb-toets', 'Doorgang mogelijk met maatregelen', '✓'],
      ['Broedseizoentoets', 'Vereist — planning aanpassen', '✓'],
      ['Ecologisch veldonderzoek', 'Niet vereist (quick scan volstaat)', '✗'],
      ['Ecologisch toezicht', heeftWater ? 'Aanbevolen bij waterkruising' : 'Niet vereist', heeftWater ? '✓' : '✗'],
      ['Vergunning Wnb', 'Niet vereist bij naleving maatregelen', '✗'],
      ['Maatregelen in werkplan', 'Opnemen', '✓'],
    ]
  )
)}

${referentiesBlok([
  'Wet natuurbescherming (Wnb) — Bescherming van beschermde soorten',
  'Handreiking Ecologische Quickscan — Ministerie LNV',
  'Flora- en faunawet (overgangsrecht Wnb)',
  'Broedseizoen richtlijn — Sovon / Vogelbescherming Nederland',
  'NDFF — Nationale Database Flora en Fauna',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'Overzichtskaart ecologisch onderzoeksgebied', beschrijving: 'Tracé + buffer 50 m' },
  { letter: 'B', titel: 'Soortenlijst NDFF', beschrijving: 'Waarnemingen in onderzoeksgebied' },
  { letter: 'C', titel: 'Veldwaarnemingsformulier', beschrijving: 'Broedvogelinventarisatie' },
])}

${rapportFooter('Ecologie', trace)}`;
}
