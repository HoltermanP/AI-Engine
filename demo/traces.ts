import type { Discipline, TraceFase } from '@/lib/db/types';
import type { TraceSegment } from './roads';

export interface DemoTrace {
  id: string;
  projectId: string;
  code: string;
  naam: string;
  discipline: Discipline;
  netType: string;
  fase: TraceFase;
  vereisteDekking: number;
  coordinates: [number, number, number][];
  /** Losse lijnen voor kaart (geen diagonalen bij kruisingen) */
  traceLines: [number, number, number][][];
  kleur: string;
  wegnaam: string;
  leglocatie: string;
  segmenten: TraceSegment[];
  omschrijving: string;
}

/**
 * GEGENEREERD met scripts/generate-demo-traces.ts — niet handmatig bewerken.
 * Elk tracé is ontworpen door de routeringsengine op live PDOK-data en voldoet
 * daarmee aan de ontwerpregels: wegvolgend, nooit door bebouwing (1 m marge),
 * AVOI-ligging, boomafstand, risicozones en situatie-afhankelijke
 * kruisingstechnieken met afweging.
 */
export const DEMO_TRACES: DemoTrace[] = [
  {
    "id": "trace-ls-001",
    "projectId": "demo-project-001",
    "code": "EL-LS-001",
    "naam": "LS-verzwaring Schokkerweg woonwijk",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x240 Al (vervanging 4x150)",
    "fase": "DO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Korte Dreef",
    "leglocatie": "berm",
    "omschrijving": "Vervanging bestaand LS-net (4x150 Al) door 4x240 Al langs 48 nieuwe huisaansluitingen. Tracé volgt bestaande kabelroute in zuidberm conform Liander.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "korte-dreef",
        "wegnaam": "Korte Dreef",
        "leglocatie": "berm",
        "legtechniek": "persing",
        "lengteM": 1169,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 4,
            "legtechniek": "persing",
            "normReferentie": "NEN 3650 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring gekozen: watergang ≈4 m",
              "Avegaarboring of persing gelijkwaardig alternatief bij draagkrachtige bodem",
              "Open kruising afgewezen: keur waterschap",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179178.3,
            "y": 524355.2
          },
          {
            "type": "weg",
            "naam": "Jupiterstraat",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179199.3,
            "y": 524326.9
          },
          {
            "type": "weg",
            "naam": "Schorpioenstraat",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179213.4,
            "y": 524288.8
          },
          {
            "type": "weg",
            "naam": "de Deel",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179662.7,
            "y": 524773.4
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179215.9,
            "y": 524283.3
          },
          {
            "type": "weg",
            "naam": "fietspad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179149,
            "y": 524385.7
          },
          {
            "type": "weg",
            "naam": "voetpad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 179412.4,
            "y": 524674.9
          }
        ],
        "afwijkingen": [
          "Doorkruist Natura 2000-gebied \"Wolderwijd en Eemmeer (NL9803001)\" (risico hoog) — geen omleiding binnen de corridor zonder grotere bezwaren; maatregel: Wnb-toets en AERIUS-berekening; werken buiten broedseizoen (flora & fauna)"
        ]
      }
    ],
    "traceLines": [
      [
        [
          179923.8,
          524820.8,
          -0.65
        ],
        [
          179896.3,
          524818.1,
          -0.65
        ],
        [
          179868.8,
          524815.3,
          -0.65
        ],
        [
          179841.7,
          524812.5,
          -0.65
        ],
        [
          179831.6,
          524820,
          -0.65
        ],
        [
          179791.4,
          524817.2,
          -0.65
        ],
        [
          179772.7,
          524804.8,
          -0.65
        ],
        [
          179755.3,
          524802.6,
          -0.65
        ],
        [
          179730.2,
          524793.5,
          -0.65
        ],
        [
          179705.3,
          524784.5,
          -0.65
        ],
        [
          179681.1,
          524778.2,
          -0.65
        ],
        [
          179656.9,
          524771.9,
          -0.65
        ],
        [
          179632.6,
          524765.5,
          -0.65
        ],
        [
          179608.3,
          524759.2,
          -0.65
        ],
        [
          179584,
          524752.9,
          -0.65
        ],
        [
          179559.8,
          524746.6,
          -0.65
        ],
        [
          179535.5,
          524740.3,
          -0.65
        ],
        [
          179511.2,
          524734,
          -0.65
        ],
        [
          179487,
          524727.7,
          -0.65
        ],
        [
          179462.7,
          524721.4,
          -0.65
        ],
        [
          179437.8,
          524714.8,
          -0.65
        ],
        [
          179417.7,
          524682.1,
          -0.65
        ],
        [
          179396.9,
          524653.8,
          -0.65
        ],
        [
          179378.8,
          524640.6,
          -0.65
        ],
        [
          179355.6,
          524636.9,
          -0.65
        ],
        [
          179332.5,
          524627.1,
          -0.65
        ],
        [
          179308.1,
          524610.9,
          -0.65
        ],
        [
          179295,
          524604.8,
          -0.65
        ],
        [
          179252.5,
          524592.6,
          -0.65
        ],
        [
          179244,
          524578,
          -0.65
        ],
        [
          179248.1,
          524548.5,
          -0.65
        ],
        [
          179252.3,
          524519.9,
          -0.65
        ],
        [
          179231.2,
          524482.5,
          -0.65
        ],
        [
          179212.6,
          524466.2,
          -0.65
        ],
        [
          179193.7,
          524449.6,
          -0.65
        ],
        [
          179174.8,
          524433.1,
          -0.65
        ],
        [
          179156,
          524416.5,
          -0.65
        ],
        [
          179136.6,
          524398.8,
          -0.65
        ],
        [
          179156.9,
          524377.3,
          -0.65
        ],
        [
          179176.7,
          524356.8,
          -0.65
        ],
        [
          179196.4,
          524336.6,
          -0.65
        ],
        [
          179205.8,
          524305.2,
          -0.65
        ],
        [
          179224.9,
          524263.7,
          -0.65
        ],
        [
          179231.9,
          524254.8,
          -0.65
        ],
        [
          179234.9,
          524244.6,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        179923.8,
        524820.8,
        -0.65
      ],
      [
        179896.3,
        524818.1,
        -0.65
      ],
      [
        179868.8,
        524815.3,
        -0.65
      ],
      [
        179841.7,
        524812.5,
        -0.65
      ],
      [
        179831.6,
        524820,
        -0.65
      ],
      [
        179791.4,
        524817.2,
        -0.65
      ],
      [
        179772.7,
        524804.8,
        -0.65
      ],
      [
        179755.3,
        524802.6,
        -0.65
      ],
      [
        179730.2,
        524793.5,
        -0.65
      ],
      [
        179705.3,
        524784.5,
        -0.65
      ],
      [
        179681.1,
        524778.2,
        -0.65
      ],
      [
        179656.9,
        524771.9,
        -0.65
      ],
      [
        179632.6,
        524765.5,
        -0.65
      ],
      [
        179608.3,
        524759.2,
        -0.65
      ],
      [
        179584,
        524752.9,
        -0.65
      ],
      [
        179559.8,
        524746.6,
        -0.65
      ],
      [
        179535.5,
        524740.3,
        -0.65
      ],
      [
        179511.2,
        524734,
        -0.65
      ],
      [
        179487,
        524727.7,
        -0.65
      ],
      [
        179462.7,
        524721.4,
        -0.65
      ],
      [
        179437.8,
        524714.8,
        -0.65
      ],
      [
        179417.7,
        524682.1,
        -0.65
      ],
      [
        179396.9,
        524653.8,
        -0.65
      ],
      [
        179378.8,
        524640.6,
        -0.65
      ],
      [
        179355.6,
        524636.9,
        -0.65
      ],
      [
        179332.5,
        524627.1,
        -0.65
      ],
      [
        179308.1,
        524610.9,
        -0.65
      ],
      [
        179295,
        524604.8,
        -0.65
      ],
      [
        179252.5,
        524592.6,
        -0.65
      ],
      [
        179244,
        524578,
        -0.65
      ],
      [
        179248.1,
        524548.5,
        -0.65
      ],
      [
        179252.3,
        524519.9,
        -0.65
      ],
      [
        179231.2,
        524482.5,
        -0.65
      ],
      [
        179212.6,
        524466.2,
        -0.65
      ],
      [
        179193.7,
        524449.6,
        -0.65
      ],
      [
        179174.8,
        524433.1,
        -0.65
      ],
      [
        179156,
        524416.5,
        -0.65
      ],
      [
        179136.6,
        524398.8,
        -0.65
      ],
      [
        179156.9,
        524377.3,
        -0.65
      ],
      [
        179176.7,
        524356.8,
        -0.65
      ],
      [
        179196.4,
        524336.6,
        -0.65
      ],
      [
        179205.8,
        524305.2,
        -0.65
      ],
      [
        179224.9,
        524263.7,
        -0.65
      ],
      [
        179231.9,
        524254.8,
        -0.65
      ],
      [
        179234.9,
        524244.6,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-002",
    "projectId": "demo-project-002",
    "code": "EL-LS-002",
    "naam": "LS-ringvoeding Almere Poort",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x185 Al",
    "fase": "DO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Blanchardpad",
    "leglocatie": "onder verharding",
    "omschrijving": "Nieuwe LS-ringvoeding voor wijktransformator Almere Poort. Tracé langs Poortdreef (NWB); parallel aan bestaand LS-net in bebouwde kom.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "blanchardpad",
        "wegnaam": "Blanchardpad",
        "leglocatie": "onder_verharding",
        "legtechniek": "hdd",
        "lengteM": 1361,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 4,
            "legtechniek": "sleufloos",
            "normReferentie": "Keur waterschap",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning of melding (keur waterschap)",
            "afweging": [
              "Nanodrill gekozen: smalle watergang/duiker, taluds blijven onaangetast",
              "Open kruising met tijdelijke dam afgewezen: beschadigt talud en profiel (keur)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 139122.7,
            "y": 482548.6
          },
          {
            "type": "weg",
            "naam": "Almere-Poort 2",
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · Wet beheer rijkswaterstaatswerken",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Rijkswaterstaat",
            "vergunning": "Wbr-vergunning (RWS)",
            "afweging": [
              "Gestuurde boring gekozen: kruising rijksweg vereist gesloten front (eis RWS)",
              "Open ontgraving/asfaltzagen afgewezen: niet toegestaan in rijksweg",
              "Persing als alternatief bij korte, ondiepe kruising",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 139014.2,
            "y": 482690.1
          },
          {
            "type": "weg",
            "naam": "A6",
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · Wet beheer rijkswaterstaatswerken",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Rijkswaterstaat",
            "vergunning": "Wbr-vergunning (RWS)",
            "afweging": [
              "Gestuurde boring gekozen: kruising rijksweg vereist gesloten front (eis RWS)",
              "Open ontgraving/asfaltzagen afgewezen: niet toegestaan in rijksweg",
              "Persing als alternatief bij korte, ondiepe kruising",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 138990.8,
            "y": 482719.6
          },
          {
            "type": "weg",
            "naam": "Zilverstrandweg",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 139088.5,
            "y": 482574.4
          },
          {
            "type": "weg",
            "naam": "transitie · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 138941.4,
            "y": 482734.4
          },
          {
            "type": "weg",
            "naam": "rijbaan autosnelweg · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 138947.5,
            "y": 482733.6
          },
          {
            "type": "weg",
            "naam": "fietspad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 139602.9,
            "y": 482815
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 139081.2,
            "y": 482583.5
          }
        ],
        "afwijkingen": [
          "Ligging deels over privaat terrein — geen openbare corridor beschikbaar; maatregel: zakelijk recht (opstalrecht) overeenkomen met eigenaar"
        ]
      }
    ],
    "traceLines": [
      [
        [
          138908.6,
          482738.6,
          -0.65
        ],
        [
          138933.6,
          482735.4,
          -0.65
        ],
        [
          138958.7,
          482732.1,
          -0.65
        ],
        [
          138983.3,
          482729,
          -0.65
        ],
        [
          139005.2,
          482701.4,
          -0.65
        ],
        [
          139027.3,
          482673.6,
          -0.65
        ],
        [
          139038.6,
          482640.5,
          -0.65
        ],
        [
          139045.2,
          482628.2,
          -0.65
        ],
        [
          139065.1,
          482603.4,
          -0.65
        ],
        [
          139085.1,
          482578.6,
          -0.65
        ],
        [
          139105.3,
          482553.5,
          -0.65
        ],
        [
          139152.3,
          482540.4,
          -0.65
        ],
        [
          139168.5,
          482521.3,
          -0.65
        ],
        [
          139185.1,
          482501.9,
          -0.65
        ],
        [
          139201.6,
          482482.6,
          -0.65
        ],
        [
          139218.2,
          482463.2,
          -0.65
        ],
        [
          139234.8,
          482443.8,
          -0.65
        ],
        [
          139246.5,
          482433.9,
          -0.65
        ],
        [
          139268.9,
          482433.7,
          -0.65
        ],
        [
          139298.5,
          482450.2,
          -0.65
        ],
        [
          139328.1,
          482466.7,
          -0.65
        ],
        [
          139352.3,
          482495.3,
          -0.65
        ],
        [
          139376.4,
          482523.9,
          -0.65
        ],
        [
          139389.2,
          482545.9,
          -0.65
        ],
        [
          139402,
          482567.9,
          -0.65
        ],
        [
          139414.8,
          482589.8,
          -0.65
        ],
        [
          139427.6,
          482611.7,
          -0.65
        ],
        [
          139440.4,
          482633.7,
          -0.65
        ],
        [
          139453.2,
          482655.6,
          -0.65
        ],
        [
          139466,
          482677.5,
          -0.65
        ],
        [
          139478.7,
          482699.5,
          -0.65
        ],
        [
          139491.5,
          482721.4,
          -0.65
        ],
        [
          139504.3,
          482743.3,
          -0.65
        ],
        [
          139517.1,
          482765.3,
          -0.65
        ],
        [
          139529.8,
          482787.1,
          -0.65
        ],
        [
          139539.3,
          482797,
          -0.65
        ],
        [
          139560.6,
          482811.3,
          -0.65
        ],
        [
          139573.2,
          482816.4,
          -0.65
        ],
        [
          139583.8,
          482817.5,
          -0.65
        ],
        [
          139611.4,
          482813.9,
          -0.65
        ],
        [
          139639.1,
          482810.3,
          -0.65
        ],
        [
          139666.8,
          482806.7,
          -0.65
        ],
        [
          139694.5,
          482803.1,
          -0.65
        ],
        [
          139722.3,
          482799.4,
          -0.65
        ],
        [
          139734.9,
          482801,
          -0.65
        ],
        [
          139756.5,
          482808.1,
          -0.65
        ],
        [
          139778.4,
          482820,
          -0.65
        ],
        [
          139786.2,
          482827,
          -0.65
        ],
        [
          139794,
          482839.8,
          -0.65
        ],
        [
          139794.9,
          482851.2,
          -0.65
        ],
        [
          139791.6,
          482877.9,
          -0.65
        ],
        [
          139788.2,
          482904.4,
          -0.65
        ],
        [
          139787.7,
          482917.8,
          -0.65
        ],
        [
          139792.4,
          482943.5,
          -0.65
        ],
        [
          139788.1,
          482958.2,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        138908.6,
        482738.6,
        -0.65
      ],
      [
        138933.6,
        482735.4,
        -0.65
      ],
      [
        138958.7,
        482732.1,
        -0.65
      ],
      [
        138983.3,
        482729,
        -0.65
      ],
      [
        139005.2,
        482701.4,
        -0.65
      ],
      [
        139027.3,
        482673.6,
        -0.65
      ],
      [
        139038.6,
        482640.5,
        -0.65
      ],
      [
        139045.2,
        482628.2,
        -0.65
      ],
      [
        139065.1,
        482603.4,
        -0.65
      ],
      [
        139085.1,
        482578.6,
        -0.65
      ],
      [
        139105.3,
        482553.5,
        -0.65
      ],
      [
        139152.3,
        482540.4,
        -0.65
      ],
      [
        139168.5,
        482521.3,
        -0.65
      ],
      [
        139185.1,
        482501.9,
        -0.65
      ],
      [
        139201.6,
        482482.6,
        -0.65
      ],
      [
        139218.2,
        482463.2,
        -0.65
      ],
      [
        139234.8,
        482443.8,
        -0.65
      ],
      [
        139246.5,
        482433.9,
        -0.65
      ],
      [
        139268.9,
        482433.7,
        -0.65
      ],
      [
        139298.5,
        482450.2,
        -0.65
      ],
      [
        139328.1,
        482466.7,
        -0.65
      ],
      [
        139352.3,
        482495.3,
        -0.65
      ],
      [
        139376.4,
        482523.9,
        -0.65
      ],
      [
        139389.2,
        482545.9,
        -0.65
      ],
      [
        139402,
        482567.9,
        -0.65
      ],
      [
        139414.8,
        482589.8,
        -0.65
      ],
      [
        139427.6,
        482611.7,
        -0.65
      ],
      [
        139440.4,
        482633.7,
        -0.65
      ],
      [
        139453.2,
        482655.6,
        -0.65
      ],
      [
        139466,
        482677.5,
        -0.65
      ],
      [
        139478.7,
        482699.5,
        -0.65
      ],
      [
        139491.5,
        482721.4,
        -0.65
      ],
      [
        139504.3,
        482743.3,
        -0.65
      ],
      [
        139517.1,
        482765.3,
        -0.65
      ],
      [
        139529.8,
        482787.1,
        -0.65
      ],
      [
        139539.3,
        482797,
        -0.65
      ],
      [
        139560.6,
        482811.3,
        -0.65
      ],
      [
        139573.2,
        482816.4,
        -0.65
      ],
      [
        139583.8,
        482817.5,
        -0.65
      ],
      [
        139611.4,
        482813.9,
        -0.65
      ],
      [
        139639.1,
        482810.3,
        -0.65
      ],
      [
        139666.8,
        482806.7,
        -0.65
      ],
      [
        139694.5,
        482803.1,
        -0.65
      ],
      [
        139722.3,
        482799.4,
        -0.65
      ],
      [
        139734.9,
        482801,
        -0.65
      ],
      [
        139756.5,
        482808.1,
        -0.65
      ],
      [
        139778.4,
        482820,
        -0.65
      ],
      [
        139786.2,
        482827,
        -0.65
      ],
      [
        139794,
        482839.8,
        -0.65
      ],
      [
        139794.9,
        482851.2,
        -0.65
      ],
      [
        139791.6,
        482877.9,
        -0.65
      ],
      [
        139788.2,
        482904.4,
        -0.65
      ],
      [
        139787.7,
        482917.8,
        -0.65
      ],
      [
        139792.4,
        482943.5,
        -0.65
      ],
      [
        139788.1,
        482958.2,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-003",
    "projectId": "demo-project-003",
    "code": "EL-LS-003",
    "naam": "LS-kabelvervanging Purmerend Zuid",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x240 Al",
    "fase": "UO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Purmerend-Zuid 4",
    "leglocatie": "berm",
    "omschrijving": "Vervanging verouderd LS-net aluminium door nieuwe GPLK-kabel. Tracé in zuidberm langs bestaande infrastructuurzone Purmerend-Zuid.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "purmerend-zuid-4",
        "wegnaam": "Purmerend-Zuid 4",
        "leglocatie": "berm",
        "legtechniek": "hdd",
        "lengteM": 1170,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 38,
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring (HDD) gekozen: watergang ≈38 m breed",
              "Open kruising/tijdelijke dam afgewezen: niet toegestaan op legger-watergang",
              "Persing afgewezen: kruising te lang voor gesloten front",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124845.6,
            "y": 502226.2
          },
          {
            "type": "weg",
            "naam": "Wolgalaan",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124716.7,
            "y": 502244.4
          },
          {
            "type": "weg",
            "naam": "Rykswg",
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · Wet beheer rijkswaterstaatswerken",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Rijkswaterstaat",
            "vergunning": "Wbr-vergunning (RWS)",
            "afweging": [
              "Gestuurde boring gekozen: kruising rijksweg vereist gesloten front (eis RWS)",
              "Open ontgraving/asfaltzagen afgewezen: niet toegestaan in rijksweg",
              "Persing als alternatief bij korte, ondiepe kruising",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124355.9,
            "y": 502348.5
          },
          {
            "type": "weg",
            "naam": "Genuahaven",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124793.5,
            "y": 502210.4
          },
          {
            "type": "weg",
            "naam": "Melkwegbrug",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124898.3,
            "y": 502284.3
          },
          {
            "type": "weg",
            "naam": "Piraeushaven",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124672.9,
            "y": 502275.4
          },
          {
            "type": "weg",
            "naam": "Kanaaldijk",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124853.4,
            "y": 502236.7
          },
          {
            "type": "weg",
            "naam": "Tramplein",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124924.2,
            "y": 502297.9
          },
          {
            "type": "weg",
            "naam": "transitie · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124359,
            "y": 502351
          },
          {
            "type": "weg",
            "naam": "transitie · onverhard",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "open_ontgraving",
            "methodeLabel": "Open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Open ontgraving: onverhard, geen verhardingsherstel nodig",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124422.9,
            "y": 502389.9
          },
          {
            "type": "weg",
            "naam": "voetpad · onverhard",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "open_ontgraving",
            "methodeLabel": "Open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Open ontgraving: onverhard, geen verhardingsherstel nodig",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124424.3,
            "y": 502390.7
          },
          {
            "type": "weg",
            "naam": "voetpad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124812,
            "y": 502210.5
          },
          {
            "type": "weg",
            "naam": "voetgangersgebied · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124925.9,
            "y": 502298.8
          },
          {
            "type": "weg",
            "naam": "fietspad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124855.5,
            "y": 502239.8
          },
          {
            "type": "weg",
            "naam": "OV-baan · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124913.7,
            "y": 502292.4
          },
          {
            "type": "weg",
            "naam": "fietspad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124949.7,
            "y": 502301.8
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124897.2,
            "y": 502283.7
          },
          {
            "type": "weg",
            "naam": "parkeervlak · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 124813.7,
            "y": 502211.3
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          124171.1,
          502080.7,
          -0.65
        ],
        [
          124192.1,
          502101.6,
          -0.65
        ],
        [
          124213,
          502122.5,
          -0.65
        ],
        [
          124234,
          502143.4,
          -0.65
        ],
        [
          124255,
          502164.3,
          -0.65
        ],
        [
          124276.1,
          502188.6,
          -0.65
        ],
        [
          124296.2,
          502216.8,
          -0.65
        ],
        [
          124315.7,
          502252.6,
          -0.65
        ],
        [
          124327.2,
          502280.2,
          -0.65
        ],
        [
          124334.8,
          502309.3,
          -0.65
        ],
        [
          124342.1,
          502337.7,
          -0.65
        ],
        [
          124370.8,
          502360.3,
          -0.65
        ],
        [
          124394.9,
          502374,
          -0.65
        ],
        [
          124419.1,
          502387.7,
          -0.65
        ],
        [
          124442.6,
          502401.2,
          -0.65
        ],
        [
          124468.9,
          502387.2,
          -0.65
        ],
        [
          124495.8,
          502373.2,
          -0.65
        ],
        [
          124506,
          502360.6,
          -0.65
        ],
        [
          124515.1,
          502355.4,
          -0.65
        ],
        [
          124552,
          502339.5,
          -0.65
        ],
        [
          124577,
          502326.3,
          -0.65
        ],
        [
          124602.1,
          502312.9,
          -0.65
        ],
        [
          124627.2,
          502299.6,
          -0.65
        ],
        [
          124652.3,
          502286.3,
          -0.65
        ],
        [
          124677.4,
          502273,
          -0.65
        ],
        [
          124702.2,
          502259.8,
          -0.65
        ],
        [
          124725.6,
          502234.9,
          -0.65
        ],
        [
          124751.7,
          502225.4,
          -0.65
        ],
        [
          124777.4,
          502216.1,
          -0.65
        ],
        [
          124803.9,
          502206.7,
          -0.65
        ],
        [
          124846.8,
          502226.7,
          -0.65
        ],
        [
          124862.5,
          502250.4,
          -0.65
        ],
        [
          124877.6,
          502273.4,
          -0.65
        ],
        [
          124907,
          502288.9,
          -0.65
        ],
        [
          124936.5,
          502304.4,
          -0.65
        ],
        [
          124946.5,
          502303.2,
          -0.65
        ],
        [
          124964.2,
          502295.4,
          -0.65
        ],
        [
          124994.2,
          502278,
          -0.65
        ],
        [
          125015.4,
          502258.3,
          -0.65
        ],
        [
          125036.8,
          502238.5,
          -0.65
        ],
        [
          125058.2,
          502218.7,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        124171.1,
        502080.7,
        -0.65
      ],
      [
        124192.1,
        502101.6,
        -0.65
      ],
      [
        124213,
        502122.5,
        -0.65
      ],
      [
        124234,
        502143.4,
        -0.65
      ],
      [
        124255,
        502164.3,
        -0.65
      ],
      [
        124276.1,
        502188.6,
        -0.65
      ],
      [
        124296.2,
        502216.8,
        -0.65
      ],
      [
        124315.7,
        502252.6,
        -0.65
      ],
      [
        124327.2,
        502280.2,
        -0.65
      ],
      [
        124334.8,
        502309.3,
        -0.65
      ],
      [
        124342.1,
        502337.7,
        -0.65
      ],
      [
        124370.8,
        502360.3,
        -0.65
      ],
      [
        124394.9,
        502374,
        -0.65
      ],
      [
        124419.1,
        502387.7,
        -0.65
      ],
      [
        124442.6,
        502401.2,
        -0.65
      ],
      [
        124468.9,
        502387.2,
        -0.65
      ],
      [
        124495.8,
        502373.2,
        -0.65
      ],
      [
        124506,
        502360.6,
        -0.65
      ],
      [
        124515.1,
        502355.4,
        -0.65
      ],
      [
        124552,
        502339.5,
        -0.65
      ],
      [
        124577,
        502326.3,
        -0.65
      ],
      [
        124602.1,
        502312.9,
        -0.65
      ],
      [
        124627.2,
        502299.6,
        -0.65
      ],
      [
        124652.3,
        502286.3,
        -0.65
      ],
      [
        124677.4,
        502273,
        -0.65
      ],
      [
        124702.2,
        502259.8,
        -0.65
      ],
      [
        124725.6,
        502234.9,
        -0.65
      ],
      [
        124751.7,
        502225.4,
        -0.65
      ],
      [
        124777.4,
        502216.1,
        -0.65
      ],
      [
        124803.9,
        502206.7,
        -0.65
      ],
      [
        124846.8,
        502226.7,
        -0.65
      ],
      [
        124862.5,
        502250.4,
        -0.65
      ],
      [
        124877.6,
        502273.4,
        -0.65
      ],
      [
        124907,
        502288.9,
        -0.65
      ],
      [
        124936.5,
        502304.4,
        -0.65
      ],
      [
        124946.5,
        502303.2,
        -0.65
      ],
      [
        124964.2,
        502295.4,
        -0.65
      ],
      [
        124994.2,
        502278,
        -0.65
      ],
      [
        125015.4,
        502258.3,
        -0.65
      ],
      [
        125036.8,
        502238.5,
        -0.65
      ],
      [
        125058.2,
        502218.7,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-004",
    "projectId": "demo-project-004",
    "code": "EL-LS-004",
    "naam": "LS-concepttracé Flevopolder Noord",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x185 Al (concept)",
    "fase": "VO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "rijbaan regionale weg · gesloten verharding",
    "leglocatie": "berm",
    "omschrijving": "Concepttracé voor LS-netuitbreiding bij nieuwe bedrijfskavels. Wijziging distributiering: aftakking van bestaande LS-kabel richting perceelgrenzen.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "rijbaan-regionale-weg-gesloten-verharding",
        "wegnaam": "rijbaan regionale weg · gesloten verharding",
        "leglocatie": "berm",
        "legtechniek": "sleufloos",
        "lengteM": 908,
        "kruisingen": [
          {
            "type": "weg",
            "naam": "Casteleynsweg",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 183095,
            "y": 528081.8
          },
          {
            "type": "weg",
            "naam": "inrit · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 182905.1,
            "y": 527778.4
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          183196.2,
          528254.2,
          -0.65
        ],
        [
          183183.1,
          528231.9,
          -0.65
        ],
        [
          183170,
          528209.6,
          -0.65
        ],
        [
          183156.9,
          528187.3,
          -0.65
        ],
        [
          183143.8,
          528165,
          -0.65
        ],
        [
          183130.7,
          528142.7,
          -0.65
        ],
        [
          183117.6,
          528120.3,
          -0.65
        ],
        [
          183104.5,
          528098,
          -0.65
        ],
        [
          183091.4,
          528075.7,
          -0.65
        ],
        [
          183078.3,
          528053.4,
          -0.65
        ],
        [
          183065.2,
          528031.1,
          -0.65
        ],
        [
          183052.1,
          528008.7,
          -0.65
        ],
        [
          183039,
          527986.4,
          -0.65
        ],
        [
          183025.9,
          527964.1,
          -0.65
        ],
        [
          183012.8,
          527941.8,
          -0.65
        ],
        [
          182999.7,
          527919.5,
          -0.65
        ],
        [
          182986.6,
          527897.2,
          -0.65
        ],
        [
          182973.6,
          527874.9,
          -0.65
        ],
        [
          182958.4,
          527854.1,
          -0.65
        ],
        [
          182943.2,
          527833.2,
          -0.65
        ],
        [
          182927.9,
          527812.3,
          -0.65
        ],
        [
          182912.7,
          527791.3,
          -0.65
        ],
        [
          182897.4,
          527765.4,
          -0.65
        ],
        [
          182882.2,
          527739.6,
          -0.65
        ],
        [
          182867,
          527713.8,
          -0.65
        ],
        [
          182853.8,
          527691.1,
          -0.65
        ],
        [
          182840.5,
          527668.5,
          -0.65
        ],
        [
          182827.2,
          527645.9,
          -0.65
        ],
        [
          182814,
          527623.2,
          -0.65
        ],
        [
          182800.7,
          527600.6,
          -0.65
        ],
        [
          182787.5,
          527578,
          -0.65
        ],
        [
          182774.2,
          527555.3,
          -0.65
        ],
        [
          182760.8,
          527532.4,
          -0.65
        ],
        [
          182760.9,
          527512.4,
          -0.65
        ],
        [
          182738.2,
          527473.8,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        183196.2,
        528254.2,
        -0.65
      ],
      [
        183183.1,
        528231.9,
        -0.65
      ],
      [
        183170,
        528209.6,
        -0.65
      ],
      [
        183156.9,
        528187.3,
        -0.65
      ],
      [
        183143.8,
        528165,
        -0.65
      ],
      [
        183130.7,
        528142.7,
        -0.65
      ],
      [
        183117.6,
        528120.3,
        -0.65
      ],
      [
        183104.5,
        528098,
        -0.65
      ],
      [
        183091.4,
        528075.7,
        -0.65
      ],
      [
        183078.3,
        528053.4,
        -0.65
      ],
      [
        183065.2,
        528031.1,
        -0.65
      ],
      [
        183052.1,
        528008.7,
        -0.65
      ],
      [
        183039,
        527986.4,
        -0.65
      ],
      [
        183025.9,
        527964.1,
        -0.65
      ],
      [
        183012.8,
        527941.8,
        -0.65
      ],
      [
        182999.7,
        527919.5,
        -0.65
      ],
      [
        182986.6,
        527897.2,
        -0.65
      ],
      [
        182973.6,
        527874.9,
        -0.65
      ],
      [
        182958.4,
        527854.1,
        -0.65
      ],
      [
        182943.2,
        527833.2,
        -0.65
      ],
      [
        182927.9,
        527812.3,
        -0.65
      ],
      [
        182912.7,
        527791.3,
        -0.65
      ],
      [
        182897.4,
        527765.4,
        -0.65
      ],
      [
        182882.2,
        527739.6,
        -0.65
      ],
      [
        182867,
        527713.8,
        -0.65
      ],
      [
        182853.8,
        527691.1,
        -0.65
      ],
      [
        182840.5,
        527668.5,
        -0.65
      ],
      [
        182827.2,
        527645.9,
        -0.65
      ],
      [
        182814,
        527623.2,
        -0.65
      ],
      [
        182800.7,
        527600.6,
        -0.65
      ],
      [
        182787.5,
        527578,
        -0.65
      ],
      [
        182774.2,
        527555.3,
        -0.65
      ],
      [
        182760.8,
        527532.4,
        -0.65
      ],
      [
        182760.9,
        527512.4,
        -0.65
      ],
      [
        182738.2,
        527473.8,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-005",
    "projectId": "demo-project-005",
    "code": "EL-LS-005",
    "naam": "LS-verzwaring havengebied Lelystad",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x240 Cu",
    "fase": "DO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "voetpad · open verharding",
    "leglocatie": "berm",
    "omschrijving": "Verzwaring LS-net voor 120 bedrijfs- en havenaansluitingen. Vervanging 4x95 door 4x240; capaciteit ring voldoet niet meer aan piekvraag.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "voetpad-open-verharding",
        "wegnaam": "voetpad · open verharding",
        "leglocatie": "berm",
        "legtechniek": "hdd",
        "lengteM": 1112,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 25,
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring (HDD) gekozen: watergang ≈25 m breed",
              "Open kruising/tijdelijke dam afgewezen: niet toegestaan op legger-watergang",
              "Persing afgewezen: kruising te lang voor gesloten front",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178191.8,
            "y": 525817.1
          },
          {
            "type": "weg",
            "naam": "Kennemerlandlaan",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178064.2,
            "y": 526049.5
          },
          {
            "type": "weg",
            "naam": "Haarlemmermeer",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178129.1,
            "y": 525950.7
          },
          {
            "type": "weg",
            "naam": "Land van Heusden",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178414.4,
            "y": 525550.5
          },
          {
            "type": "weg",
            "naam": "Amstelland",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178153.8,
            "y": 525864.7
          },
          {
            "type": "weg",
            "naam": "Fietspad",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178135.1,
            "y": 525915.4
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178414.6,
            "y": 525549.4
          },
          {
            "type": "weg",
            "naam": "voetpad · transitie",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178317.7,
            "y": 525786
          },
          {
            "type": "weg",
            "naam": "parkeervlak · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178318.8,
            "y": 525785.4
          },
          {
            "type": "weg",
            "naam": "Kennemerlandlaan (Lelystad Haven)",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 178064.2,
            "y": 526049.5
          }
        ],
        "afwijkingen": [
          "AVOI-bermligging (Berm zuid, offset -1.2 m) plaatselijk niet haalbaar — ligging op hartlijn wegprofiel; reden: bebouwing direct langs de weg"
        ]
      }
    ],
    "traceLines": [
      [
        [
          178065.2,
          526148.4,
          -0.65
        ],
        [
          178064,
          526110,
          -0.65
        ],
        [
          178053.1,
          526086.7,
          -0.65
        ],
        [
          178051.8,
          526058.7,
          -0.65
        ],
        [
          178076.1,
          526040.5,
          -0.65
        ],
        [
          178100.4,
          526022.4,
          -0.65
        ],
        [
          178129,
          526004.7,
          -0.65
        ],
        [
          178129,
          525968.2,
          -0.65
        ],
        [
          178129.1,
          525931.7,
          -0.65
        ],
        [
          178138.3,
          525906.6,
          -0.65
        ],
        [
          178147.6,
          525881.4,
          -0.65
        ],
        [
          178156.9,
          525856.3,
          -0.65
        ],
        [
          178166.2,
          525831.2,
          -0.65
        ],
        [
          178192.5,
          525816.7,
          -0.65
        ],
        [
          178218.9,
          525802.2,
          -0.65
        ],
        [
          178229.7,
          525801.1,
          -0.65
        ],
        [
          178243.7,
          525793.1,
          -0.65
        ],
        [
          178257.4,
          525796.4,
          -0.65
        ],
        [
          178300.8,
          525795.9,
          -0.65
        ],
        [
          178324.2,
          525782.2,
          -0.65
        ],
        [
          178324.1,
          525771.5,
          -0.65
        ],
        [
          178335.3,
          525755.5,
          -0.65
        ],
        [
          178367.6,
          525753.9,
          -0.65
        ],
        [
          178391.6,
          525741.6,
          -0.65
        ],
        [
          178391.6,
          525716.2,
          -0.65
        ],
        [
          178391.5,
          525690.9,
          -0.65
        ],
        [
          178391.5,
          525665.5,
          -0.65
        ],
        [
          178391.5,
          525640.2,
          -0.65
        ],
        [
          178391.4,
          525614.9,
          -0.65
        ],
        [
          178405.6,
          525573.3,
          -0.65
        ],
        [
          178412.3,
          525562.3,
          -0.65
        ],
        [
          178420.5,
          525516,
          -0.65
        ],
        [
          178431.8,
          525488.6,
          -0.65
        ],
        [
          178458.4,
          525479.4,
          -0.65
        ],
        [
          178485.1,
          525470.3,
          -0.65
        ],
        [
          178511.7,
          525461.1,
          -0.65
        ],
        [
          178551.7,
          525461.9,
          -0.65
        ],
        [
          178579.2,
          525460.9,
          -0.65
        ],
        [
          178606.6,
          525459.9,
          -0.65
        ],
        [
          178634.1,
          525458.9,
          -0.65
        ],
        [
          178651.1,
          525460.6,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        178065.2,
        526148.4,
        -0.65
      ],
      [
        178064,
        526110,
        -0.65
      ],
      [
        178053.1,
        526086.7,
        -0.65
      ],
      [
        178051.8,
        526058.7,
        -0.65
      ],
      [
        178076.1,
        526040.5,
        -0.65
      ],
      [
        178100.4,
        526022.4,
        -0.65
      ],
      [
        178129,
        526004.7,
        -0.65
      ],
      [
        178129,
        525968.2,
        -0.65
      ],
      [
        178129.1,
        525931.7,
        -0.65
      ],
      [
        178138.3,
        525906.6,
        -0.65
      ],
      [
        178147.6,
        525881.4,
        -0.65
      ],
      [
        178156.9,
        525856.3,
        -0.65
      ],
      [
        178166.2,
        525831.2,
        -0.65
      ],
      [
        178192.5,
        525816.7,
        -0.65
      ],
      [
        178218.9,
        525802.2,
        -0.65
      ],
      [
        178229.7,
        525801.1,
        -0.65
      ],
      [
        178243.7,
        525793.1,
        -0.65
      ],
      [
        178257.4,
        525796.4,
        -0.65
      ],
      [
        178300.8,
        525795.9,
        -0.65
      ],
      [
        178324.2,
        525782.2,
        -0.65
      ],
      [
        178324.1,
        525771.5,
        -0.65
      ],
      [
        178335.3,
        525755.5,
        -0.65
      ],
      [
        178367.6,
        525753.9,
        -0.65
      ],
      [
        178391.6,
        525741.6,
        -0.65
      ],
      [
        178391.6,
        525716.2,
        -0.65
      ],
      [
        178391.5,
        525690.9,
        -0.65
      ],
      [
        178391.5,
        525665.5,
        -0.65
      ],
      [
        178391.5,
        525640.2,
        -0.65
      ],
      [
        178391.4,
        525614.9,
        -0.65
      ],
      [
        178405.6,
        525573.3,
        -0.65
      ],
      [
        178412.3,
        525562.3,
        -0.65
      ],
      [
        178420.5,
        525516,
        -0.65
      ],
      [
        178431.8,
        525488.6,
        -0.65
      ],
      [
        178458.4,
        525479.4,
        -0.65
      ],
      [
        178485.1,
        525470.3,
        -0.65
      ],
      [
        178511.7,
        525461.1,
        -0.65
      ],
      [
        178551.7,
        525461.9,
        -0.65
      ],
      [
        178579.2,
        525460.9,
        -0.65
      ],
      [
        178606.6,
        525459.9,
        -0.65
      ],
      [
        178634.1,
        525458.9,
        -0.65
      ],
      [
        178651.1,
        525460.6,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-006",
    "projectId": "demo-project-006",
    "code": "EL-LS-006",
    "naam": "LS-aansluiting Espelerweg woonwijk",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x185 Al",
    "fase": "UO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Espelerweg",
    "leglocatie": "berm",
    "omschrijving": "Nieuwe LS-aansluitkabel langs Espelerweg richting bestaande LS-distributiering. Tracé volgt NWB-wegvak in zuidberm.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "espelerweg",
        "wegnaam": "Espelerweg",
        "leglocatie": "berm",
        "legtechniek": "persing",
        "lengteM": 1116,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 7,
            "legtechniek": "persing",
            "normReferentie": "NEN 3650 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring gekozen: watergang ≈7 m",
              "Avegaarboring of persing gelijkwaardig alternatief bij draagkrachtige bodem",
              "Open kruising afgewezen: keur waterschap",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177502.6,
            "y": 526182
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177553.2,
            "y": 526045.2
          },
          {
            "type": "weg",
            "naam": "inrit · transitie",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177004.8,
            "y": 526342.2
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          176721.8,
          526353.3,
          -0.65
        ],
        [
          176747.2,
          526353,
          -0.65
        ],
        [
          176772.7,
          526352.7,
          -0.65
        ],
        [
          176798.1,
          526352.4,
          -0.65
        ],
        [
          176823.6,
          526352.1,
          -0.65
        ],
        [
          176849.1,
          526351.9,
          -0.65
        ],
        [
          176874.5,
          526351.6,
          -0.65
        ],
        [
          176900,
          526351.3,
          -0.65
        ],
        [
          176925.4,
          526351,
          -0.65
        ],
        [
          176950.9,
          526350.7,
          -0.65
        ],
        [
          176976.1,
          526350.4,
          -0.65
        ],
        [
          176997.6,
          526342.2,
          -0.65
        ],
        [
          177013.4,
          526342.2,
          -0.65
        ],
        [
          177021.6,
          526350,
          -0.65
        ],
        [
          177046.5,
          526349.7,
          -0.65
        ],
        [
          177071.8,
          526349.4,
          -0.65
        ],
        [
          177097,
          526349.1,
          -0.65
        ],
        [
          177122.3,
          526348.8,
          -0.65
        ],
        [
          177147.6,
          526348.6,
          -0.65
        ],
        [
          177172.8,
          526348.3,
          -0.65
        ],
        [
          177198.1,
          526348,
          -0.65
        ],
        [
          177223.3,
          526347.8,
          -0.65
        ],
        [
          177248.6,
          526347.5,
          -0.65
        ],
        [
          177273.9,
          526347.2,
          -0.65
        ],
        [
          177299.1,
          526346.9,
          -0.65
        ],
        [
          177324.4,
          526346.7,
          -0.65
        ],
        [
          177349.7,
          526346.4,
          -0.65
        ],
        [
          177374.9,
          526346.1,
          -0.65
        ],
        [
          177400.2,
          526345.9,
          -0.65
        ],
        [
          177425.1,
          526345.6,
          -0.65
        ],
        [
          177445,
          526333.4,
          -0.65
        ],
        [
          177465.1,
          526329.2,
          -0.65
        ],
        [
          177474.5,
          526322.3,
          -0.65
        ],
        [
          177486.6,
          526300.1,
          -0.65
        ],
        [
          177498.6,
          526278.2,
          -0.65
        ],
        [
          177496.5,
          526250.1,
          -0.65
        ],
        [
          177494.5,
          526221.7,
          -0.65
        ],
        [
          177492.5,
          526192.6,
          -0.65
        ],
        [
          177512.3,
          526171.8,
          -0.65
        ],
        [
          177531.7,
          526151.7,
          -0.65
        ],
        [
          177545.9,
          526124.8,
          -0.65
        ],
        [
          177560.1,
          526098.1,
          -0.65
        ],
        [
          177559.4,
          526066.3,
          -0.65
        ],
        [
          177556.3,
          526048,
          -0.65
        ],
        [
          177547.6,
          526040,
          -0.65
        ],
        [
          177542.9,
          526029,
          -0.65
        ],
        [
          177541.9,
          526015.6,
          -0.65
        ],
        [
          177545.2,
          526004.5,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        176721.8,
        526353.3,
        -0.65
      ],
      [
        176747.2,
        526353,
        -0.65
      ],
      [
        176772.7,
        526352.7,
        -0.65
      ],
      [
        176798.1,
        526352.4,
        -0.65
      ],
      [
        176823.6,
        526352.1,
        -0.65
      ],
      [
        176849.1,
        526351.9,
        -0.65
      ],
      [
        176874.5,
        526351.6,
        -0.65
      ],
      [
        176900,
        526351.3,
        -0.65
      ],
      [
        176925.4,
        526351,
        -0.65
      ],
      [
        176950.9,
        526350.7,
        -0.65
      ],
      [
        176976.1,
        526350.4,
        -0.65
      ],
      [
        176997.6,
        526342.2,
        -0.65
      ],
      [
        177013.4,
        526342.2,
        -0.65
      ],
      [
        177021.6,
        526350,
        -0.65
      ],
      [
        177046.5,
        526349.7,
        -0.65
      ],
      [
        177071.8,
        526349.4,
        -0.65
      ],
      [
        177097,
        526349.1,
        -0.65
      ],
      [
        177122.3,
        526348.8,
        -0.65
      ],
      [
        177147.6,
        526348.6,
        -0.65
      ],
      [
        177172.8,
        526348.3,
        -0.65
      ],
      [
        177198.1,
        526348,
        -0.65
      ],
      [
        177223.3,
        526347.8,
        -0.65
      ],
      [
        177248.6,
        526347.5,
        -0.65
      ],
      [
        177273.9,
        526347.2,
        -0.65
      ],
      [
        177299.1,
        526346.9,
        -0.65
      ],
      [
        177324.4,
        526346.7,
        -0.65
      ],
      [
        177349.7,
        526346.4,
        -0.65
      ],
      [
        177374.9,
        526346.1,
        -0.65
      ],
      [
        177400.2,
        526345.9,
        -0.65
      ],
      [
        177425.1,
        526345.6,
        -0.65
      ],
      [
        177445,
        526333.4,
        -0.65
      ],
      [
        177465.1,
        526329.2,
        -0.65
      ],
      [
        177474.5,
        526322.3,
        -0.65
      ],
      [
        177486.6,
        526300.1,
        -0.65
      ],
      [
        177498.6,
        526278.2,
        -0.65
      ],
      [
        177496.5,
        526250.1,
        -0.65
      ],
      [
        177494.5,
        526221.7,
        -0.65
      ],
      [
        177492.5,
        526192.6,
        -0.65
      ],
      [
        177512.3,
        526171.8,
        -0.65
      ],
      [
        177531.7,
        526151.7,
        -0.65
      ],
      [
        177545.9,
        526124.8,
        -0.65
      ],
      [
        177560.1,
        526098.1,
        -0.65
      ],
      [
        177559.4,
        526066.3,
        -0.65
      ],
      [
        177556.3,
        526048,
        -0.65
      ],
      [
        177547.6,
        526040,
        -0.65
      ],
      [
        177542.9,
        526029,
        -0.65
      ],
      [
        177541.9,
        526015.6,
        -0.65
      ],
      [
        177545.2,
        526004.5,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-007",
    "projectId": "demo-project-007",
    "code": "EL-LS-007",
    "naam": "LS-distributie nieuwbouw Dronten West",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x150 Al",
    "fase": "DO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "De Oeverloper",
    "leglocatie": "berm",
    "omschrijving": "Nieuw LS-distributienet voor 200 woningen in Dronten West. Hoofdkabel langs De Noord; aftakkingen per bouwblok via bestaande LS-sleuf.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "de-oeverloper",
        "wegnaam": "De Oeverloper",
        "leglocatie": "berm",
        "legtechniek": "sleufloos",
        "lengteM": 1142,
        "kruisingen": [
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177613.9,
            "y": 504653.2
          },
          {
            "type": "weg",
            "naam": "voetpad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177616.5,
            "y": 504650.3
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 177945.7,
            "y": 504558.5
          }
        ],
        "afwijkingen": [
          "Minimale boomafstand (2 m) plaatselijk niet haalbaar bij 2 boom/bomen — geen alternatieve ligging zonder grotere bezwaren; maatregel: groeiplaatsonderzoek + handmatig graven"
        ]
      }
    ],
    "traceLines": [
      [
        [
          177621.3,
          505005.3,
          -0.65
        ],
        [
          177626.1,
          504997.2,
          -0.65
        ],
        [
          177620.7,
          504960.8,
          -0.65
        ],
        [
          177621.2,
          504940.1,
          -0.65
        ],
        [
          177617.3,
          504912.6,
          -0.65
        ],
        [
          177613.3,
          504885,
          -0.65
        ],
        [
          177609.3,
          504857.4,
          -0.65
        ],
        [
          177605.4,
          504829.9,
          -0.65
        ],
        [
          177601.4,
          504802.3,
          -0.65
        ],
        [
          177597.4,
          504774.7,
          -0.65
        ],
        [
          177593.5,
          504747.1,
          -0.65
        ],
        [
          177589.5,
          504719.1,
          -0.65
        ],
        [
          177603.6,
          504691.7,
          -0.65
        ],
        [
          177610.8,
          504656.6,
          -0.65
        ],
        [
          177630.7,
          504634.6,
          -0.65
        ],
        [
          177650.7,
          504612.7,
          -0.65
        ],
        [
          177689.2,
          504602,
          -0.65
        ],
        [
          177706.2,
          504610.5,
          -0.65
        ],
        [
          177731.2,
          504605,
          -0.65
        ],
        [
          177756.8,
          504599.4,
          -0.65
        ],
        [
          177782.3,
          504593.9,
          -0.65
        ],
        [
          177807.8,
          504588.4,
          -0.65
        ],
        [
          177833.3,
          504582.9,
          -0.65
        ],
        [
          177858.8,
          504577.3,
          -0.65
        ],
        [
          177884.3,
          504571.8,
          -0.65
        ],
        [
          177909.8,
          504566.3,
          -0.65
        ],
        [
          177935.3,
          504560.7,
          -0.65
        ],
        [
          177960.8,
          504555.2,
          -0.65
        ],
        [
          177986,
          504549.8,
          -0.65
        ],
        [
          178002.6,
          504534.4,
          -0.65
        ],
        [
          178046.6,
          504525,
          -0.65
        ],
        [
          178065.3,
          504511.2,
          -0.65
        ],
        [
          178090.3,
          504505.9,
          -0.65
        ],
        [
          178115.1,
          504500.6,
          -0.65
        ],
        [
          178139.9,
          504495.3,
          -0.65
        ],
        [
          178165,
          504490,
          -0.65
        ],
        [
          178177.3,
          504497,
          -0.65
        ],
        [
          178202.4,
          504491.8,
          -0.65
        ],
        [
          178227.9,
          504486.7,
          -0.65
        ],
        [
          178253.4,
          504481.5,
          -0.65
        ],
        [
          178278.7,
          504476.4,
          -0.65
        ],
        [
          178300.6,
          504466.9,
          -0.65
        ],
        [
          178309.1,
          504446.7,
          -0.65
        ],
        [
          178310.2,
          504435.5,
          -0.65
        ],
        [
          178318.6,
          504425.4,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        177621.3,
        505005.3,
        -0.65
      ],
      [
        177626.1,
        504997.2,
        -0.65
      ],
      [
        177620.7,
        504960.8,
        -0.65
      ],
      [
        177621.2,
        504940.1,
        -0.65
      ],
      [
        177617.3,
        504912.6,
        -0.65
      ],
      [
        177613.3,
        504885,
        -0.65
      ],
      [
        177609.3,
        504857.4,
        -0.65
      ],
      [
        177605.4,
        504829.9,
        -0.65
      ],
      [
        177601.4,
        504802.3,
        -0.65
      ],
      [
        177597.4,
        504774.7,
        -0.65
      ],
      [
        177593.5,
        504747.1,
        -0.65
      ],
      [
        177589.5,
        504719.1,
        -0.65
      ],
      [
        177603.6,
        504691.7,
        -0.65
      ],
      [
        177610.8,
        504656.6,
        -0.65
      ],
      [
        177630.7,
        504634.6,
        -0.65
      ],
      [
        177650.7,
        504612.7,
        -0.65
      ],
      [
        177689.2,
        504602,
        -0.65
      ],
      [
        177706.2,
        504610.5,
        -0.65
      ],
      [
        177731.2,
        504605,
        -0.65
      ],
      [
        177756.8,
        504599.4,
        -0.65
      ],
      [
        177782.3,
        504593.9,
        -0.65
      ],
      [
        177807.8,
        504588.4,
        -0.65
      ],
      [
        177833.3,
        504582.9,
        -0.65
      ],
      [
        177858.8,
        504577.3,
        -0.65
      ],
      [
        177884.3,
        504571.8,
        -0.65
      ],
      [
        177909.8,
        504566.3,
        -0.65
      ],
      [
        177935.3,
        504560.7,
        -0.65
      ],
      [
        177960.8,
        504555.2,
        -0.65
      ],
      [
        177986,
        504549.8,
        -0.65
      ],
      [
        178002.6,
        504534.4,
        -0.65
      ],
      [
        178046.6,
        504525,
        -0.65
      ],
      [
        178065.3,
        504511.2,
        -0.65
      ],
      [
        178090.3,
        504505.9,
        -0.65
      ],
      [
        178115.1,
        504500.6,
        -0.65
      ],
      [
        178139.9,
        504495.3,
        -0.65
      ],
      [
        178165,
        504490,
        -0.65
      ],
      [
        178177.3,
        504497,
        -0.65
      ],
      [
        178202.4,
        504491.8,
        -0.65
      ],
      [
        178227.9,
        504486.7,
        -0.65
      ],
      [
        178253.4,
        504481.5,
        -0.65
      ],
      [
        178278.7,
        504476.4,
        -0.65
      ],
      [
        178300.6,
        504466.9,
        -0.65
      ],
      [
        178309.1,
        504446.7,
        -0.65
      ],
      [
        178310.2,
        504435.5,
        -0.65
      ],
      [
        178318.6,
        504425.4,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-008",
    "projectId": "demo-project-008",
    "code": "EL-LS-008",
    "naam": "LS-HDD onder Oostvaardersdijk",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x185 Al",
    "fase": "VO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Oostvaardersdijk",
    "leglocatie": "onder verharding",
    "omschrijving": "LS-kabelwijziging: omlegging bestaand LS-net uit kwetsbare zone langs Oostvaardersdijk. Vervanging open sleuftracé door HDD onder de dijk.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "oostvaardersdijk",
        "wegnaam": "Oostvaardersdijk",
        "leglocatie": "onder_verharding",
        "legtechniek": "persing",
        "lengteM": 1246,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 6,
            "legtechniek": "persing",
            "normReferentie": "NEN 3650 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring gekozen: watergang ≈6 m",
              "Avegaarboring of persing gelijkwaardig alternatief bij draagkrachtige bodem",
              "Open kruising afgewezen: keur waterschap",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158256.2,
            "y": 502552
          },
          {
            "type": "weg",
            "naam": "Houtribweg",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158267.9,
            "y": 502522.2
          },
          {
            "type": "weg",
            "naam": "parkeervlak · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158433.3,
            "y": 502301.5
          },
          {
            "type": "weg",
            "naam": "voetpad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158435.2,
            "y": 502298.6
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158249.5,
            "y": 502564.8
          },
          {
            "type": "weg",
            "naam": "fietspad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158260.9,
            "y": 502537.7
          },
          {
            "type": "weg",
            "naam": "OV-baan · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158269.1,
            "y": 502520.7
          },
          {
            "type": "weg",
            "naam": "inrit · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 158414.1,
            "y": 502361.5
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          157556.4,
          502103.1,
          -0.65
        ],
        [
          157577.1,
          502120,
          -0.65
        ],
        [
          157597.8,
          502137,
          -0.65
        ],
        [
          157618.5,
          502153.9,
          -0.65
        ],
        [
          157639.2,
          502170.9,
          -0.65
        ],
        [
          157660,
          502187.8,
          -0.65
        ],
        [
          157680.7,
          502204.7,
          -0.65
        ],
        [
          157701.4,
          502221.7,
          -0.65
        ],
        [
          157722.3,
          502238.8,
          -0.65
        ],
        [
          157740.2,
          502265.9,
          -0.65
        ],
        [
          157758,
          502292.8,
          -0.65
        ],
        [
          157772.1,
          502306.9,
          -0.65
        ],
        [
          157795.3,
          502323.4,
          -0.65
        ],
        [
          157818.5,
          502339.9,
          -0.65
        ],
        [
          157841.7,
          502356.4,
          -0.65
        ],
        [
          157864.9,
          502372.9,
          -0.65
        ],
        [
          157888.1,
          502389.4,
          -0.65
        ],
        [
          157911.3,
          502405.9,
          -0.65
        ],
        [
          157934.5,
          502422.4,
          -0.65
        ],
        [
          157959.3,
          502438.9,
          -0.65
        ],
        [
          157984.1,
          502455.4,
          -0.65
        ],
        [
          158009,
          502471.9,
          -0.65
        ],
        [
          158032.3,
          502486.1,
          -0.65
        ],
        [
          158055.6,
          502500.4,
          -0.65
        ],
        [
          158079,
          502514.6,
          -0.65
        ],
        [
          158102.3,
          502528.8,
          -0.65
        ],
        [
          158125,
          502541.4,
          -0.65
        ],
        [
          158147.6,
          502553.9,
          -0.65
        ],
        [
          158170.3,
          502566.5,
          -0.65
        ],
        [
          158192.9,
          502579,
          -0.65
        ],
        [
          158215.3,
          502591.5,
          -0.65
        ],
        [
          158231.9,
          502588.8,
          -0.65
        ],
        [
          158254.1,
          502558.5,
          -0.65
        ],
        [
          158264.5,
          502526.9,
          -0.65
        ],
        [
          158281.5,
          502503.9,
          -0.65
        ],
        [
          158298.4,
          502481.1,
          -0.65
        ],
        [
          158315.3,
          502458.2,
          -0.65
        ],
        [
          158332.2,
          502435.4,
          -0.65
        ],
        [
          158349.1,
          502412.5,
          -0.65
        ],
        [
          158366,
          502389.7,
          -0.65
        ],
        [
          158373.8,
          502381.7,
          -0.65
        ],
        [
          158411.3,
          502367.5,
          -0.65
        ],
        [
          158428.7,
          502329.7,
          -0.65
        ],
        [
          158429,
          502308,
          -0.65
        ],
        [
          158449.1,
          502277.5,
          -0.65
        ],
        [
          158447.5,
          502267.7,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        157556.4,
        502103.1,
        -0.65
      ],
      [
        157577.1,
        502120,
        -0.65
      ],
      [
        157597.8,
        502137,
        -0.65
      ],
      [
        157618.5,
        502153.9,
        -0.65
      ],
      [
        157639.2,
        502170.9,
        -0.65
      ],
      [
        157660,
        502187.8,
        -0.65
      ],
      [
        157680.7,
        502204.7,
        -0.65
      ],
      [
        157701.4,
        502221.7,
        -0.65
      ],
      [
        157722.3,
        502238.8,
        -0.65
      ],
      [
        157740.2,
        502265.9,
        -0.65
      ],
      [
        157758,
        502292.8,
        -0.65
      ],
      [
        157772.1,
        502306.9,
        -0.65
      ],
      [
        157795.3,
        502323.4,
        -0.65
      ],
      [
        157818.5,
        502339.9,
        -0.65
      ],
      [
        157841.7,
        502356.4,
        -0.65
      ],
      [
        157864.9,
        502372.9,
        -0.65
      ],
      [
        157888.1,
        502389.4,
        -0.65
      ],
      [
        157911.3,
        502405.9,
        -0.65
      ],
      [
        157934.5,
        502422.4,
        -0.65
      ],
      [
        157959.3,
        502438.9,
        -0.65
      ],
      [
        157984.1,
        502455.4,
        -0.65
      ],
      [
        158009,
        502471.9,
        -0.65
      ],
      [
        158032.3,
        502486.1,
        -0.65
      ],
      [
        158055.6,
        502500.4,
        -0.65
      ],
      [
        158079,
        502514.6,
        -0.65
      ],
      [
        158102.3,
        502528.8,
        -0.65
      ],
      [
        158125,
        502541.4,
        -0.65
      ],
      [
        158147.6,
        502553.9,
        -0.65
      ],
      [
        158170.3,
        502566.5,
        -0.65
      ],
      [
        158192.9,
        502579,
        -0.65
      ],
      [
        158215.3,
        502591.5,
        -0.65
      ],
      [
        158231.9,
        502588.8,
        -0.65
      ],
      [
        158254.1,
        502558.5,
        -0.65
      ],
      [
        158264.5,
        502526.9,
        -0.65
      ],
      [
        158281.5,
        502503.9,
        -0.65
      ],
      [
        158298.4,
        502481.1,
        -0.65
      ],
      [
        158315.3,
        502458.2,
        -0.65
      ],
      [
        158332.2,
        502435.4,
        -0.65
      ],
      [
        158349.1,
        502412.5,
        -0.65
      ],
      [
        158366,
        502389.7,
        -0.65
      ],
      [
        158373.8,
        502381.7,
        -0.65
      ],
      [
        158411.3,
        502367.5,
        -0.65
      ],
      [
        158428.7,
        502329.7,
        -0.65
      ],
      [
        158429,
        502308,
        -0.65
      ],
      [
        158449.1,
        502277.5,
        -0.65
      ],
      [
        158447.5,
        502267.7,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-009",
    "projectId": "demo-project-009",
    "code": "EL-LS-009",
    "naam": "LS-net industrieterrein Urk",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x240 Al",
    "fase": "DO",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "Rotholm",
    "leglocatie": "parallelweg",
    "omschrijving": "Verzwaring LS-net voor uitbreiding industrieterrein Urk. Tracé langs Urkerweg in gezamenlijke utiliteitsstrook; 18 nieuwe bedrijfsaansluitingen.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "rotholm",
        "wegnaam": "Rotholm",
        "leglocatie": "parallelweg",
        "legtechniek": "sleufloos",
        "lengteM": 1251,
        "kruisingen": [
          {
            "type": "weg",
            "naam": "Ketel",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170705.2,
            "y": 519576.4
          },
          {
            "type": "weg",
            "naam": "Toppad",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170373.8,
            "y": 519488
          },
          {
            "type": "weg",
            "naam": "De Reede",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170041.4,
            "y": 519270.7
          },
          {
            "type": "weg",
            "naam": "Fietspad",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170324.8,
            "y": 519470.8
          },
          {
            "type": "weg",
            "naam": "Zandplaat",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170223.2,
            "y": 519403.4
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170376.9,
            "y": 519489.4
          },
          {
            "type": "weg",
            "naam": "voetpad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 169931.3,
            "y": 519188.8
          },
          {
            "type": "weg",
            "naam": "fietspad · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170312,
            "y": 519466.9
          },
          {
            "type": "weg",
            "naam": "rijbaan lokale weg · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170743.4,
            "y": 519535.9
          },
          {
            "type": "weg",
            "naam": "inrit · open verharding",
            "legtechniek": "open_ontgraving",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "bestrating_openen",
            "methodeLabel": "Bestrating openen + herstraten",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Bestrating openen gekozen: elementenverharding kan worden herstraat",
              "Boring afgewezen: onnodig kostbaar bij open verharding",
              "Herstel en degeneratievergoeding conform AVOI",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 170695.7,
            "y": 519595.9
          },
          {
            "type": "weg",
            "naam": "Urkerweg (industrieterrein)",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 169930.2,
            "y": 519197.4
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          170014.7,
          519098.4,
          -0.65
        ],
        [
          169994,
          519119.5,
          -0.65
        ],
        [
          169973.3,
          519140.5,
          -0.65
        ],
        [
          169952.6,
          519161.6,
          -0.65
        ],
        [
          169932.2,
          519182.3,
          -0.65
        ],
        [
          169929.8,
          519200.6,
          -0.65
        ],
        [
          169936.8,
          519213.8,
          -0.65
        ],
        [
          169950.8,
          519230.2,
          -0.65
        ],
        [
          169976.2,
          519241.5,
          -0.65
        ],
        [
          170001.9,
          519253,
          -0.65
        ],
        [
          170027.6,
          519264.5,
          -0.65
        ],
        [
          170053.3,
          519276,
          -0.65
        ],
        [
          170079.1,
          519287.5,
          -0.65
        ],
        [
          170104.8,
          519298.9,
          -0.65
        ],
        [
          170130.6,
          519310.5,
          -0.65
        ],
        [
          170151.9,
          519323.3,
          -0.65
        ],
        [
          170168.8,
          519342.2,
          -0.65
        ],
        [
          170185.4,
          519361,
          -0.65
        ],
        [
          170202.1,
          519379.7,
          -0.65
        ],
        [
          170218.8,
          519398.5,
          -0.65
        ],
        [
          170235.5,
          519417.3,
          -0.65
        ],
        [
          170252,
          519435.9,
          -0.65
        ],
        [
          170270.3,
          519451.3,
          -0.65
        ],
        [
          170282.6,
          519457.9,
          -0.65
        ],
        [
          170307.6,
          519465.6,
          -0.65
        ],
        [
          170332.8,
          519473.3,
          -0.65
        ],
        [
          170358.1,
          519481.1,
          -0.65
        ],
        [
          170382.4,
          519491.8,
          -0.65
        ],
        [
          170410.4,
          519501.2,
          -0.65
        ],
        [
          170438.5,
          519510.6,
          -0.65
        ],
        [
          170466.6,
          519520.1,
          -0.65
        ],
        [
          170494.9,
          519529.5,
          -0.65
        ],
        [
          170516.7,
          519542,
          -0.65
        ],
        [
          170536.7,
          519560.8,
          -0.65
        ],
        [
          170556.4,
          519579.3,
          -0.65
        ],
        [
          170576.1,
          519593.6,
          -0.65
        ],
        [
          170607.3,
          519604.3,
          -0.65
        ],
        [
          170638.7,
          519615.2,
          -0.65
        ],
        [
          170668.7,
          519626.1,
          -0.65
        ],
        [
          170700.8,
          519590.2,
          -0.65
        ],
        [
          170709.6,
          519562.9,
          -0.65
        ],
        [
          170715,
          519553.3,
          -0.65
        ],
        [
          170724.2,
          519544.1,
          -0.65
        ],
        [
          170735.5,
          519537.5,
          -0.65
        ],
        [
          170745.9,
          519535.4,
          -0.65
        ],
        [
          170753.3,
          519523.9,
          -0.65
        ],
        [
          170753.1,
          519498.6,
          -0.65
        ],
        [
          170767.8,
          519480.3,
          -0.65
        ],
        [
          170780,
          519476.6,
          -0.65
        ],
        [
          170822,
          519476.5,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        170014.7,
        519098.4,
        -0.65
      ],
      [
        169994,
        519119.5,
        -0.65
      ],
      [
        169973.3,
        519140.5,
        -0.65
      ],
      [
        169952.6,
        519161.6,
        -0.65
      ],
      [
        169932.2,
        519182.3,
        -0.65
      ],
      [
        169929.8,
        519200.6,
        -0.65
      ],
      [
        169936.8,
        519213.8,
        -0.65
      ],
      [
        169950.8,
        519230.2,
        -0.65
      ],
      [
        169976.2,
        519241.5,
        -0.65
      ],
      [
        170001.9,
        519253,
        -0.65
      ],
      [
        170027.6,
        519264.5,
        -0.65
      ],
      [
        170053.3,
        519276,
        -0.65
      ],
      [
        170079.1,
        519287.5,
        -0.65
      ],
      [
        170104.8,
        519298.9,
        -0.65
      ],
      [
        170130.6,
        519310.5,
        -0.65
      ],
      [
        170151.9,
        519323.3,
        -0.65
      ],
      [
        170168.8,
        519342.2,
        -0.65
      ],
      [
        170185.4,
        519361,
        -0.65
      ],
      [
        170202.1,
        519379.7,
        -0.65
      ],
      [
        170218.8,
        519398.5,
        -0.65
      ],
      [
        170235.5,
        519417.3,
        -0.65
      ],
      [
        170252,
        519435.9,
        -0.65
      ],
      [
        170270.3,
        519451.3,
        -0.65
      ],
      [
        170282.6,
        519457.9,
        -0.65
      ],
      [
        170307.6,
        519465.6,
        -0.65
      ],
      [
        170332.8,
        519473.3,
        -0.65
      ],
      [
        170358.1,
        519481.1,
        -0.65
      ],
      [
        170382.4,
        519491.8,
        -0.65
      ],
      [
        170410.4,
        519501.2,
        -0.65
      ],
      [
        170438.5,
        519510.6,
        -0.65
      ],
      [
        170466.6,
        519520.1,
        -0.65
      ],
      [
        170494.9,
        519529.5,
        -0.65
      ],
      [
        170516.7,
        519542,
        -0.65
      ],
      [
        170536.7,
        519560.8,
        -0.65
      ],
      [
        170556.4,
        519579.3,
        -0.65
      ],
      [
        170576.1,
        519593.6,
        -0.65
      ],
      [
        170607.3,
        519604.3,
        -0.65
      ],
      [
        170638.7,
        519615.2,
        -0.65
      ],
      [
        170668.7,
        519626.1,
        -0.65
      ],
      [
        170700.8,
        519590.2,
        -0.65
      ],
      [
        170709.6,
        519562.9,
        -0.65
      ],
      [
        170715,
        519553.3,
        -0.65
      ],
      [
        170724.2,
        519544.1,
        -0.65
      ],
      [
        170735.5,
        519537.5,
        -0.65
      ],
      [
        170745.9,
        519535.4,
        -0.65
      ],
      [
        170753.3,
        519523.9,
        -0.65
      ],
      [
        170753.1,
        519498.6,
        -0.65
      ],
      [
        170767.8,
        519480.3,
        -0.65
      ],
      [
        170780,
        519476.6,
        -0.65
      ],
      [
        170822,
        519476.5,
        -0.65
      ]
    ]
  },
  {
    "id": "trace-ls-010",
    "projectId": "demo-project-010",
    "code": "EL-LS-010",
    "naam": "LS-vervanging NOP West (as-built)",
    "discipline": "elektra_ls",
    "netType": "GPLK 4x185 Al",
    "fase": "as_built",
    "vereisteDekking": 0.6,
    "kleur": "#960000",
    "wegnaam": "rijbaan lokale weg · gesloten verharding",
    "leglocatie": "berm",
    "omschrijving": "As-built: vervangen LS-kabelsectie na capaciteitsproblemen distributiegebied west. Bestaand net buiten bedrijf gesteld; nieuwe kabel in zelfde sleuf.",
    "segmenten": [
      {
        "volgorde": 1,
        "wegId": "rijbaan-lokale-weg-gesloten-verharding",
        "wegnaam": "rijbaan lokale weg · gesloten verharding",
        "leglocatie": "berm",
        "legtechniek": "hdd",
        "lengteM": 917,
        "kruisingen": [
          {
            "type": "water",
            "naam": "BGT-object",
            "breedteM": 31,
            "legtechniek": "hdd",
            "normReferentie": "NEN 3650/3651 · keur waterschap",
            "methode": "gestuurde_boring",
            "methodeLabel": "Gestuurde boring (HDD)",
            "beheerder": "Waterschap",
            "vergunning": "Watervergunning (keur/legger waterschap)",
            "afweging": [
              "Gestuurde boring (HDD) gekozen: watergang ≈31 m breed",
              "Open kruising/tijdelijke dam afgewezen: niet toegestaan op legger-watergang",
              "Persing afgewezen: kruising te lang voor gesloten front",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 180706.9,
            "y": 524876.4
          },
          {
            "type": "weg",
            "naam": "Geuzenbrug",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 180104,
            "y": 524838
          },
          {
            "type": "weg",
            "naam": "Lange Achterzijde",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 180362.1,
            "y": 524858.5
          },
          {
            "type": "weg",
            "naam": "Marknesserweg",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · NEN 7171",
            "methode": "nanodrill",
            "methodeLabel": "Nanodrill (kleine gestuurde boring)",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Nanodrill gekozen: asfalt rijbaan blijft intact, minimale verkeershinder",
              "Asfaltzagen alternatief bij gelijktijdige wegwerkzaamheden (bespaart degeneratiekosten)",
              "Avegaarboring of persing alternatief bij grotere diameters of bundels (mantelbuis)",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 180474.2,
            "y": 524858.5
          },
          {
            "type": "weg",
            "naam": "fietspad · gesloten verharding",
            "legtechniek": "sleufloos",
            "normReferentie": "AVOI gemeente · CROW 500",
            "methode": "asfaltzagen",
            "methodeLabel": "Asfaltzagen + open ontgraving",
            "beheerder": "Gemeente (AVOI)",
            "vergunning": "Instemmingsbesluit gemeente (AVOI)",
            "afweging": [
              "Asfaltzagen gekozen: fiets-/voetpad, korte afzetting en beperkte hinder",
              "Nanodrill afgewezen: niet kosteneffectief voor smal pad",
              "Herstel asfalt conform eisen gemeente",
              "Liander: kruising uitvoeren in mantelbuis, kabel doorgaand zonder mof onder de kruising"
            ],
            "x": 180459.4,
            "y": 524847.7
          }
        ],
        "afwijkingen": []
      }
    ],
    "traceLines": [
      [
        [
          179953.3,
          524821.4,
          -0.65
        ],
        [
          179979.5,
          524824.4,
          -0.65
        ],
        [
          180005.8,
          524827.4,
          -0.65
        ],
        [
          180032.1,
          524830.4,
          -0.65
        ],
        [
          180058.4,
          524833.4,
          -0.65
        ],
        [
          180084.6,
          524836.5,
          -0.65
        ],
        [
          180111.4,
          524838.6,
          -0.65
        ],
        [
          180138.2,
          524840.7,
          -0.65
        ],
        [
          180165,
          524842.8,
          -0.65
        ],
        [
          180191.9,
          524845,
          -0.65
        ],
        [
          180218.7,
          524847.1,
          -0.65
        ],
        [
          180245.5,
          524849.2,
          -0.65
        ],
        [
          180272.3,
          524851.3,
          -0.65
        ],
        [
          180299.1,
          524853.5,
          -0.65
        ],
        [
          180325.9,
          524855.6,
          -0.65
        ],
        [
          180352.8,
          524857.7,
          -0.65
        ],
        [
          180379.6,
          524859.9,
          -0.65
        ],
        [
          180406.4,
          524862,
          -0.65
        ],
        [
          180432.7,
          524864.2,
          -0.65
        ],
        [
          180438.9,
          524852,
          -0.65
        ],
        [
          180456.1,
          524846.3,
          -0.65
        ],
        [
          180469.9,
          524852.3,
          -0.65
        ],
        [
          180475.4,
          524860.2,
          -0.65
        ],
        [
          180502.1,
          524861.3,
          -0.65
        ],
        [
          180529.2,
          524862.3,
          -0.65
        ],
        [
          180556.3,
          524863.4,
          -0.65
        ],
        [
          180583.4,
          524864.5,
          -0.65
        ],
        [
          180610.4,
          524865.6,
          -0.65
        ],
        [
          180637.5,
          524866.7,
          -0.65
        ],
        [
          180664.6,
          524867.7,
          -0.65
        ],
        [
          180691.9,
          524868.9,
          -0.65
        ],
        [
          180715.4,
          524880.7,
          -0.65
        ],
        [
          180741.9,
          524883,
          -0.65
        ],
        [
          180768.6,
          524885.3,
          -0.65
        ],
        [
          180795.3,
          524887.6,
          -0.65
        ],
        [
          180822.2,
          524890,
          -0.65
        ],
        [
          180831.5,
          524895.8,
          -0.65
        ],
        [
          180849.8,
          524893.8,
          -0.65
        ]
      ]
    ],
    "coordinates": [
      [
        179953.3,
        524821.4,
        -0.65
      ],
      [
        179979.5,
        524824.4,
        -0.65
      ],
      [
        180005.8,
        524827.4,
        -0.65
      ],
      [
        180032.1,
        524830.4,
        -0.65
      ],
      [
        180058.4,
        524833.4,
        -0.65
      ],
      [
        180084.6,
        524836.5,
        -0.65
      ],
      [
        180111.4,
        524838.6,
        -0.65
      ],
      [
        180138.2,
        524840.7,
        -0.65
      ],
      [
        180165,
        524842.8,
        -0.65
      ],
      [
        180191.9,
        524845,
        -0.65
      ],
      [
        180218.7,
        524847.1,
        -0.65
      ],
      [
        180245.5,
        524849.2,
        -0.65
      ],
      [
        180272.3,
        524851.3,
        -0.65
      ],
      [
        180299.1,
        524853.5,
        -0.65
      ],
      [
        180325.9,
        524855.6,
        -0.65
      ],
      [
        180352.8,
        524857.7,
        -0.65
      ],
      [
        180379.6,
        524859.9,
        -0.65
      ],
      [
        180406.4,
        524862,
        -0.65
      ],
      [
        180432.7,
        524864.2,
        -0.65
      ],
      [
        180438.9,
        524852,
        -0.65
      ],
      [
        180456.1,
        524846.3,
        -0.65
      ],
      [
        180469.9,
        524852.3,
        -0.65
      ],
      [
        180475.4,
        524860.2,
        -0.65
      ],
      [
        180502.1,
        524861.3,
        -0.65
      ],
      [
        180529.2,
        524862.3,
        -0.65
      ],
      [
        180556.3,
        524863.4,
        -0.65
      ],
      [
        180583.4,
        524864.5,
        -0.65
      ],
      [
        180610.4,
        524865.6,
        -0.65
      ],
      [
        180637.5,
        524866.7,
        -0.65
      ],
      [
        180664.6,
        524867.7,
        -0.65
      ],
      [
        180691.9,
        524868.9,
        -0.65
      ],
      [
        180715.4,
        524880.7,
        -0.65
      ],
      [
        180741.9,
        524883,
        -0.65
      ],
      [
        180768.6,
        524885.3,
        -0.65
      ],
      [
        180795.3,
        524887.6,
        -0.65
      ],
      [
        180822.2,
        524890,
        -0.65
      ],
      [
        180831.5,
        524895.8,
        -0.65
      ],
      [
        180849.8,
        524893.8,
        -0.65
      ]
    ]
  }
];

export { DEMO_PROJECT, DEMO_PROJECTS } from './projects';
