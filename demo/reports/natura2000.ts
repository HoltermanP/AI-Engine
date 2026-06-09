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

export function rapportNatura2000(trace: DemoTrace): string {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const n2000 = gebied.natura2000 ?? {
    naam: 'Wolderwijd en Eemmeer (NL9803001)',
    code: 'NL9803001',
    afstandM: 450,
  };
  const binnen500m = n2000.afstandM < 500;
  const pbVereist = n2000.afstandM < 200;

  const header = rapportHeader({
    titel: 'Passende Beoordeling / Natuurtoets',
    ondertitel: 'Natura 2000-quick scan en effectbeoordeling',
    prefix: 'N2000',
    trace,
    norm: 'Habitatrichtlijn / Wet natuurbescherming — passende beoordeling',
    extraVelden: [
      ['Natura2000-gebied', n2000.naam],
      ['Habitatrichtlijncode', n2000.code],
      ['Afstand tracé tot gebied', `ca. ${n2000.afstandM} m`],
      ['Gemeente', gebied.gemeente],
      ['Uitvoerder', gebied.ecologieAdviesbureau],
    ],
  });

  return `${header}

${inhoudsopgave([
  { nummer: 1, titel: 'Management summary' },
  { nummer: 2, titel: 'Onderzoeksopzet' },
  { nummer: 3, titel: 'Relevante Natura2000-gebieden' },
  { nummer: 4, titel: 'Beoordeling effecten' },
  { nummer: 5, titel: 'Stikstof (PAS/Wnb)' },
  { nummer: 6, titel: 'Maatregelen en voorwaarden' },
  { nummer: 7, titel: 'Conclusie en advies' },
  { nummer: 8, titel: 'Referenties' },
  { nummer: 9, titel: 'Bijlagen' },
])}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace)}

${samenvattingBlok(
  `Het geplande tracé ${trace.code} langs ${trace.wegnaam} ligt **${binnen500m ? 'in de nabijheid van' : 'buiten'}** het Natura2000-gebied ${n2000.naam}, op circa **${n2000.afstandM} meter** van de dichtstbijzijnde gebiedsgrens.`,
  pbVereist
    ? 'Een volledige passende beoordeling (PB) kan vereist zijn. Overleg met bevoegd gezag (provincie/OD) aanbevolen.'
    : 'Geen significante effecten op Natura2000-gebieden te verwachten. Een volledige passende beoordeling (PB) is **niet vereist**. Wel ecologische quickscan (Wnb) uitvoeren.',
  [
    `Afstand tot N2000: ${n2000.afstandM} m`,
    'Geen habitatverlies of fragmentatie in N2000',
    'Stikstofdepositie: niet significant',
    'Ecologische quickscan Wnb aanbevolen',
    binnen500m ? 'Bufferzone-maatregelen: werk buiten broedseizoen' : 'Geen N2000-buffer effecten',
  ]
)}`
)}

${divider()}

${sectie(
  2,
  'Onderzoeksopzet',
  `${subsectie('2.1', 'Doel', `Beoordelen of het project significante effecten heeft op Natura2000-gebieden in de omgeving van tracé ${trace.code} (${ctx.lengteM} m).`)}

${subsectie(
  '2.2',
  'Methodiek',
  bulletLijst([
    'Inventarisatie Natura2000-gebieden binnen straal 5 km (PDOK/NDFF)',
    'Afstandsbeoordeling tot gebiedsgrenzen',
    'Effectbeoordeling per effectcategorie (habitat, geluid, water, stikstof, licht)',
    'Quick scan conform handreiking passende beoordeling (LNV)',
    'Afstemming met ecologische quickscan Wnb',
  ])
)}`
)}

${divider()}

${sectie(
  3,
  'Relevante Natura2000-gebieden',
  `${subsectie(
    '3.1',
    n2000.naam,
    tabelFromRows(
      ['Kenmerk', 'Waarde'],
      [
        ['Habitatrichtlijncode', n2000.code],
        ['Oppervlakte', n2000.code.includes('9803003') ? '8.200 ha' : '3.420 ha'],
        ['Afstand tot tracé', `${n2000.afstandM} m (dichtstbijzijnde punt)`],
        ['Habitattypen', '3130 (Oligotrofe wateren), 3150 (Natuurlijke eutrofe meren), 6410 (Graslanden)'],
        ['Aangewezen soorten', 'Fietsschildpad, Bittervoorn, Zwarte stern (indien van toepassing)'],
        ['Effectbeoordeling', binnen500m ? 'Geen directe effecten — bufferzone' : 'Geen effecten — voldoende afstand'],
      ]
    )
  )}

${subsectie('3.2', 'Overige gebieden in straal 5 km', 'Geen overige Natura2000-gebieden met significante nabijheid tot het tracé, behoudens het hierboven genoemde gebied.')}`
)}

${divider()}

${sectie(
  4,
  'Beoordeling effecten',
  tabelFromRows(
    ['Effectcategorie', 'Beoordeling', 'Toelichting'],
    [
      ['Habitatverlies', 'Geen', 'Tracé in bestaande utiliteitsstrook'],
      ['Habitatfragmentatie', 'Geen', 'Geen N2000-habitat in tracégebied'],
      ['Verstoring (geluid/trilling)', n2000.afstandM > 300 ? 'Verwaarloosbaar' : 'Laag', `Afstand ${n2000.afstandM} m tot N2000`],
      ['Waterhuishouding', 'Geen', 'Geen hydrologische verbinding met N2000'],
      ['Stikstofdepositie', 'Geen', 'Buiten kritische depositiegebieden'],
      ['Lichtverstoring', 'Geen', 'Geen nachtwerk nabij N2000'],
      ['Voedselweb / migratie', 'Geen', 'Geen ecologische corridor naar N2000'],
      ['Drukactiviteiten (Wnb)', 'Geen', 'Geen significante recreatiedruk'],
    ]
  )
)}

${divider()}

${sectie(
  5,
  'Stikstof (PAS/Wnb)',
  bulletLijst([
    'Het project valt **niet** onder de PAS-meldingplicht',
    'Geen aanwijzing dat het project significante stikstofdepositie veroorzaakt op Natura2000-gebieden',
    'Geen stikstofgevoelige habitattypen in directe nabijheid van het tracé',
    'Bij wijziging werkmethodiek: herbeoordeling stikstofeffecten',
    'Aansluiting op provinciaal stikstofbeleid niet vereist',
  ])
)}

${divider()}

${sectie(
  6,
  'Maatregelen en voorwaarden',
  genummerdeLijst([
    pbVereist ? 'Volledige passende beoordeling (PB) overleggen met OD/provincie' : 'Geen aanvullende Natura2000-maatregelen vereist',
    'Ecologische quickscan (Wnb) uitvoeren voor broedvogels in slootkanten',
    'Werkzaamheden bij waterkruisingen: geen uitvoering in broedseizoen (15 maart – 15 juli)',
    'Bij onverwachte natuurwaarden: werkzaamheden staken en ecologisch adviseur raadplegen',
    'Monitoring niet vereist — geen significante effecten verwacht',
    'Documenteer N2000-toets in projectdossier (OMO/OMA)',
  ])
)}

${divider()}

${sectie(
  7,
  'Conclusie en advies',
  tabelFromRows(
    ['Onderdeel', 'Status', 'Toelichting'],
    [
      ['Passende beoordeling (PB)', pbVereist ? 'Overleg vereist' : '✗ Niet vereist', pbVereist ? 'Nabijheid < 200 m' : 'Geen significante effecten'],
      ['Natuurtoets Omgevingswet', '✗ Niet vereist', 'Geen significante effecten'],
      ['Ecologische quickscan (Wnb)', '✓ Aanbevolen', 'Beschermde soorten in tracégebied'],
      ['Broedseizoentoets', '✓ Vereist', 'Bij waterkruisingen en bufferzones'],
      ['Stikstofanalyse', '✗ Niet vereist', 'Geen PAS-plicht'],
    ]
  )
)}

${referentiesBlok([
  'Habitatrichtlijn (92/43/EEG) — Bescherming habitats en wilde flora en fauna',
  'Wet natuurbescherming — Passende beoordeling',
  'Handreiking Passende Beoordeling — Ministerie LNV',
  'Programma Aanpak Stikstof (PAS) — Afbakening en vrijstellingen',
  'PDOK Natura2000 — Geografische data beschermde gebieden',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'Kaart N2000-buffer', beschrijving: 'Tracé en N2000-grenzen (5 km)' },
  { letter: 'B', titel: 'Effectbeoordelingsmatrix', beschrijving: 'Per effectcategorie' },
  { letter: 'C', titel: 'Habitattype-overzicht', beschrijving: 'Relevante habitattypen N2000' },
])}

${rapportFooter('Ecologie / Natura 2000', trace)}`;
}
