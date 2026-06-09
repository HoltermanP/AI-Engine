import type { DemoTrace } from '../traces';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import {
  BODEM_NABIJ_THRESHOLD_M,
} from '@/lib/services/bodem-risico';
import {
  GEBIED_TYPE_LABEL,
  RISICO_LABEL,
  type BodemGebiedType,
  type BodemRisicoklasse,
} from '@/lib/services/bodem-risico/types';
import { getRapportContext } from './context';
import {
  rapportHeader,
  sectie,
  subsectie,
  samenvattingBlok,
  tabelFromRows,
  segmentenTabel,
  genummerdeLijst,
  bulletLijst,
  divider,
  rapportFooter,
  inhoudsopgave,
  referentiesBlok,
  bijlagenOverzicht,
  scopeBlok,
  uitvoeringsOrganisatie,
} from './format';

function risicoNiveauLabel(klasse: BodemRisicoklasse): string {
  const map: Record<BodemRisicoklasse, string> = {
    zeer_hoog: 'zeer hoog',
    hoog: 'hoog',
    middel: 'middel',
    laag: 'laag',
    beheer: 'beheer (gesaneerd/nazorg)',
    geen: 'geen',
    onbekend: 'onbekend',
  };
  return map[klasse];
}

function faseBenoemd(klasse: BodemRisicoklasse): string {
  if (klasse === 'zeer_hoog' || klasse === 'hoog') return 'Fase B/C vereist';
  if (klasse === 'middel') return 'Fase B aanbevolen';
  return 'Fase A volstaat';
}

export function rapportBodemQuickscan(
  trace: DemoTrace,
  sonderingen: number,
  collected?: CollectedTraceData
): string {
  const ctx = getRapportContext(trace);
  const { gebied } = ctx;
  const samenvatting = collected?.bodemRisicoSamenvatting;
  const locaties = collected?.vervuildeGrond ?? [];
  const gebieden = collected?.bodemRisicoGebieden ?? [];
  const kruisingen = collected?.bodemTraceKruisingen ?? [];
  const doorschreden = kruisingen.filter((k) => k.relatie === 'doorschreden');
  const nabij = kruisingen.filter((k) => k.relatie === 'nabij');
  const heeftData = locaties.length > 0 && samenvatting;
  const heeftKruising = kruisingen.length > 0;

  const risicoNiveau = heeftData
    ? risicoNiveauLabel(samenvatting.hoogsteRisicoklasse)
    : trace.projectId === 'demo-project-003'
      ? 'laag-middel'
      : 'laag';

  const verdiependNodig =
    (heeftData &&
      (samenvatting!.hoogsteRisicoklasse === 'zeer_hoog' ||
        samenvatting!.hoogsteRisicoklasse === 'hoog' ||
        samenvatting!.hoogsteRisicoklasse === 'middel')) ||
    doorschreden.some((k) => k.risicoklasse === 'zeer_hoog' || k.risicoklasse === 'hoog') ||
    (doorschreden.some((k) => k.risicoklasse === 'middel') && doorschreden.length > 0);

  const header = rapportHeader({
    titel: 'Quick Scan Bodem',
    ondertitel: 'Vooronderzoek conform NEN 5725:2009 — Fase A',
    prefix: 'QS-BOD',
    trace,
    norm: 'NEN 5725:2009 / Besluit bodemkwaliteit (Bbk) / SIKB 2000',
    status: 'Definitief',
    extraVelden: [
      ['Onderzoeksfase', 'Fase A — Quick scan / vooronderzoek'],
      ['Uitvoerder', gebied.bodemAdviesbureau],
      ['BRO-sonderingen', `${sonderingen} CPT-punten in onderzoeksgebied`],
      ['Breedte onderzoeksgebied', '20 m (10 m aan weerszijden tracé)'],
      ['Gemeente', gebied.gemeente],
    ],
  });

  const inhoud = inhoudsopgave([
    { nummer: 1, titel: 'Management summary' },
    { nummer: 2, titel: 'Onderzoeksopzet en methodiek' },
    { nummer: 3, titel: 'Bodemopbouw en geotechniek' },
    { nummer: 4, titel: 'Historisch bodemgebruik' },
    { nummer: 5, titel: 'Verontreinigingsrisico' },
    { nummer: 6, titel: 'Toepasselijke normen en kwaliteitsklassen' },
    { nummer: 7, titel: 'Aanbevelingen en vervolgacties' },
    { nummer: 8, titel: 'Conclusie' },
    { nummer: 9, titel: 'Referenties' },
    { nummer: 10, titel: 'Bijlagen' },
  ]);

  return `${header}

${inhoud}

${divider()}

${sectie(
  1,
  'Management summary',
  `${scopeBlok(trace, `Onderzoeksgebied: ${gebied.gemeente}, ${gebied.provincie}.`)}

${samenvattingBlok(
  `Het tracé **${trace.code}** langs ${trace.wegnaam} (${ctx.lengteM} m, ${trace.netType}) kent een **${risicoNiveau} risico** op bodemverontreiniging voor de geplande werkzaamheden.`,
  verdiependNodig
    ? samenvatting?.aanbeveling ??
      'Verdiepend bodemonderzoek aanbevolen op basis van geregistreerde bodemrisico\'s in het onderzoeksgebied.'
    : risicoNiveau === 'laag' || risicoNiveau === 'geen' || risicoNiveau === 'beheer (gesaneerd/nazorg)'
      ? 'Vooronderzoek bodem (fase A) volstaat. Verdiepend onderzoek (fase B) is **niet** aanbevolen, tenzij bij open ontgraving visuele of olfactorische indicaties worden aangetroffen.'
      : 'Vooronderzoek bodem (fase A) volstaat als basis. Bij open ontgraving aanvullende visuele inspectie en eventueel monstername op kritieke locaties (utiliteitszone).',
  [
    heeftData
      ? `${locaties.length} bodemlocatie(s) geïnventariseerd (BRO, gemeentelijk, PFAS, regionaal)`
      : `Geen live bodemregistraties in onderzoeksgebied — demo/quick scan op basis van context (${gebied.gemeente})`,
    heeftKruising
      ? `${doorschreden.length} risicogebied(en) doorschreden, ${nabij.length} nabij tracé (≤${BODEM_NABIJ_THRESHOLD_M} m)`
      : heeftData && gebieden.length > 0
        ? `${gebieden.length} risicogebied(en) in onderzoeksgebied — geen doorsnijding met tracé`
        : `${sonderingen} BRO-sonderingen: ${gebied.bodemopbouwSamenvatting}`,
    `Historisch gebruik: ${gebied.historischeContext}`,
    ctx.heeftHdd
      ? 'HDD-segmenten: geen bodemverwijdering — beperkte blootstelling'
      : 'Open ontgraving: visuele en olfactorische inspectie per sleuf verplicht',
    'Vrijgekomen grond: classificatie als niet-verontreinigde grond (AVG) verwacht',
  ]
)}`
)}

${divider()}

${sectie(
  2,
  'Onderzoeksopzet en methodiek',
  `${subsectie('2.1', 'Doel en scope', `Dit vooronderzoek beoordeelt of aanvullend bodemonderzoek noodzakelijk is voor de aanleg van ${trace.netType} langs ${trace.wegnaam}. De scope omvat het tracé (${ctx.lengteM} m) en een buffer van 10 m aan weerszijden conform NEN 5725.`)}

${subsectie('2.2', 'Uitvoeringsorganisatie', uitvoeringsOrganisatie(trace.projectId ? (ctx.project?.opdrachtgever ?? 'Opdrachtgever') : 'Opdrachtgever', gebied.bodemAdviesbureau, 'Ir. P. van der Berg'))}

${subsectie(
  '2.3',
  'Gebruikte bronnen en datasets',
  tabelFromRows(
    ['Bron', 'Type', 'Peildatum', 'Resultaat'],
    [
      ['BRO CPT-sonderingen', 'Veldmeting', '2025–2026', `${sonderingen} punten, diepte tot -12 m NAP`],
      ['BRO Grondwater', 'Monitoring', '2025', gebied.grondwaterPeil],
      ['BRO SLD/SAD + Bodemloket WMS', 'Landelijk', '2026', heeftData ? `${locaties.filter((l) => l.bron.startsWith('sld_') || l.bron.startsWith('sad_')).length} BRO-locatie(s)` : 'Referentiekaart'],
      ['Gemeentelijk + regionaal register', 'WFS/ArcGIS', '2026', heeftData ? `${locaties.filter((l) => !l.bron.startsWith('sld_') && !l.bron.startsWith('sad_') && !l.bron.startsWith('pfas')).length} locatie(s)` : 'Niet opgehaald'],
      ['RIVM PFAS', 'WFS', '2026', heeftData ? `${locaties.filter((l) => l.bron.startsWith('pfas')).length} meetlocatie(s)` : 'Referentie WMS'],
      ['SIKB 2000 registraties', 'Historisch', '2026', 'Geen relevante onderzoeken'],
      ['OOG-kaart', 'Historisch', '2026', 'Geen oliehoudende activiteiten'],
      ['Historische topografische kaarten', 'Archief', '1940–heden', gebied.historischeContext],
      ['Luchtfoto-analyse', 'Remote sensing', '2024–2026', 'Geen afwijkende bodemverkleuring'],
    ]
  )
)}

${subsectie('2.4', 'Tracésegmenten', segmentenTabel(trace))}`
)}

${divider()}

${sectie(
  3,
  'Bodemopbouw en geotechniek',
  `${subsectie(
    '3.1',
    'BRO-sonderingen — samenvatting',
    tabelFromRows(
      ['Diepte (m NAP)', 'Grondsoort', 'qc (MPa)', 'γ (kN/m³)', 'Conclusie'],
      [
        ['+0,0 tot -1,2', 'Veen (zwak)', '0,6 – 1,0', '10 – 12', 'Oppervlakkig veen, verwijderen bij ontgraving'],
        ['-1,2 tot -4,5', 'Klei (slank)', '1,5 – 2,8', '16 – 18', 'Stijve kleilaag, draagkracht voldoende'],
        ['-4,5 tot -12,0', 'Zand (vast)', '12 – 18', '19 – 20', 'Draagkracht goed, geschikt voor sleuf'],
      ]
    )
  )}

${subsectie(
  '3.2',
  'Grondwater',
  bulletLijst([
    `**Grondwaterstand:** ${gebied.grondwaterPeil}`,
    '**Seizoensvariatie:** ±0,15 m (winter hoger, zomer lager)',
    '**Infiltratie:** Geen aanwijzingen voor grondwaterverontreiniging',
    `**Werkzaamheden:** Sleufbemaling ${ctx.heeftOpenOntgraving ? 'mogelijk bij ontgraving > 1,5 m' : 'niet verwacht bij sleufloze/HDD-techniek'}`,
    '**Drainage:** Functioneel peilgebied, geen kwelwater verwacht',
  ])
)}

${subsectie(
  '3.3',
  'Geotechnische parameters ontwerp',
  tabelFromRows(
    ['Parameter', 'Waarde', 'Toepassing'],
    [
      ['Vereiste dekking', `${trace.vereisteDekking} m`, 'Ontwerpeis tracé'],
      ['Sleufbreedte (indicatief)', trace.discipline.includes('gas_hd') ? '1,2 m' : '0,8 m', 'Open ontgraving'],
      ['Graafdiepte', `${Math.abs(trace.coordinates[0]?.[2] ?? 1).toFixed(1)} m`, 'Ontwerptracé'],
      ['Werkbaarheid', 'Goed', 'Zand/klei wissellagen'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  4,
  'Historisch bodemgebruik',
  tabelFromRows(
    ['Periode', 'Functie', 'Risico', 'Toelichting'],
    [
      ['Vóór ontginning', 'Water / niet ontgonnen', 'Geen', gebied.historischeContext.split(';')[0]],
      ['Ontginning', 'Landbouw / infrastructuur', 'Laag', 'Eerste ontginning, geen chemische industrie'],
      ['1960 – heden', 'Agrarisch + infrastructuur', 'Laag', 'Standaard polder-/stedelijke bewerking'],
      ['Infrastructuurzone', `Utiliteitsstrook ${trace.wegnaam}`, 'Laag-middel', 'Nutsvoorzieningen, geen chemische opslag'],
    ]
  )
)}

${divider()}

${sectie(
  5,
  'Verontreinigingsrisico',
  heeftData
    ? `${subsectie('5.1', 'Risicoklassen (geïntegreerde bronnen)', tabelFromRows(
        ['Risicoklasse', 'Aantal locaties', 'Gebiedtypes'],
        Object.entries(samenvatting!.perKlasse)
          .filter(([, n]) => n > 0)
          .map(([klasse, n]) => {
            const types = Object.entries(samenvatting!.perGebiedType)
              .filter(([, c]) => c > 0)
              .map(([t]) => GEBIED_TYPE_LABEL[t as BodemGebiedType])
              .slice(0, 3)
              .join(', ');
            return [RISICO_LABEL[klasse as BodemRisicoklasse], String(n), types || '—'];
          })
      ))}

${subsectie(
  '5.2',
  'Risicogebieden',
  gebieden.length > 0
    ? tabelFromRows(
        ['Gebied', 'Locaties', 'Dichtstbij tracé', 'Risicoklasse'],
        gebieden.map((g) => [
          g.label,
          String(g.telling),
          g.minAfstandTraceM != null ? `${g.minAfstandTraceM} m` : '—',
          RISICO_LABEL[g.risicoklasse as BodemRisicoklasse],
        ])
      )
    : 'Geen afgebakende risicogebieden — alleen puntlocaties.'
)}

${subsectie(
  '5.3',
  'Locaties in onderzoeksgebied',
  locaties.length > 0
    ? tabelFromRows(
        ['Locatie', 'Bron', 'Gebiedtype', 'Risicoklasse', 'Afstand tracé'],
        locaties.slice(0, 25).map((l) => [
          l.naam,
          l.bron,
          l.gebiedType ? GEBIED_TYPE_LABEL[l.gebiedType as BodemGebiedType] : '—',
          l.risicoklasse ? RISICO_LABEL[l.risicoklasse as BodemRisicoklasse] : '—',
          l.afstandTraceM != null ? `${l.afstandTraceM} m` : '—',
        ])
      ) + (locaties.length > 25 ? `\n\n*… en ${locaties.length - 25} overige locaties (zie GIS-dossier).*` : '')
    : 'Geen geregistreerde locaties in onderzoeksgebied.'
)}

${subsectie(
  '5.4',
  'Tracé-kruising met risicogebieden',
  heeftKruising
    ? `${bulletLijst([
        doorschreden.length > 0
          ? `**${doorschreden.length} locatie(s) doorschreden** door het tracé — verdiepend onderzoek en overleg bevoegd gezag vereist`
          : 'Geen risicogebieden direct doorschreden',
        nabij.length > 0
          ? `**${nabij.length} locatie(s) nabij tracé** (≤${BODEM_NABIJ_THRESHOLD_M} m) — extra aandacht bij ontgraving`
          : `Geen locaties binnen ${BODEM_NABIJ_THRESHOLD_M} m van het tracé`,
      ])}

${tabelFromRows(
  ['Locatie', 'Relatie', 'Afstand', 'Risicoklasse', 'Gebiedtype'],
  kruisingen.map((k) => [
    k.naam,
    k.relatie === 'doorschreden' ? 'Doorschreden' : 'Nabij',
    k.relatie === 'doorschreden' ? '0 m (overlap)' : `${k.afstandTraceM} m`,
    RISICO_LABEL[k.risicoklasse as BodemRisicoklasse],
    GEBIED_TYPE_LABEL[k.gebiedType as BodemGebiedType],
  ])
)}`
    : 'Geen kruising of nabijheid met geregistreerde risicogebieden binnen het onderzoeksgebied.'
)}`
    : tabelFromRows(
        ['Bron / aspect', 'Afstand tot tracé', 'Risico', 'Beoordeling'],
        [
          ['Bodemloket meldingen', '> 500 m', 'Geen', 'Geen registraties in onderzoeksgebied'],
          ['PFAS-gebieden', 'Buiten onderzoeksgebied', 'Geen', 'Geen relevante bronnen'],
          ['Haven/industrie (indien van toepassing)', trace.projectId === 'demo-project-005' ? '< 200 m' : 'n.v.t.', trace.projectId === 'demo-project-005' ? 'Laag-middel' : 'Geen', trace.projectId === 'demo-project-005' ? 'Extra visuele inspectie bij ontgraving' : 'Niet van toepassing'],
        ]
      )
)}

${divider()}

${sectie(
  6,
  'Toepasselijke normen en kwaliteitsklassen',
  `${bulletLijst([
    'NEN 5725:2009 — Bodemonderzoek voor milieuhygiënisch en agronomisch onderzoek',
    'Besluit bodemkwaliteit (Bbk) — interventiewaarden niet van toepassing bij quick scan',
    'SIKB 2000 protocol — niet vereist bij fase A quick scan',
    'CROW-publicatie 500 — Richtlijn bodem bij infrastructuur (referentie)',
    'AVG-classificatie: niet-verontreinigde grond verwacht bij vrijkomende grond',
  ])}

${subsectie(
  '6.1',
  'Indicatieve kwaliteitsclassificatie vrijkomende grond',
  tabelFromRows(
    ['Grondsoort / laag', 'Verwachte classificatie', 'Toepassing'],
    [
      ['Veen (oppervlakkig)', 'AVG — niet verontreinigd', 'Afvoer naar grondbank'],
      ['Klei/zand (sleuf)', 'AVG — niet verontreinigd', 'Her gebruik in sleuf of afvoer'],
      ['Vrijgekomen verharding', 'AVG / bouwstoffen', 'Scheiden en registreren'],
    ]
  )
)}`
)}

${divider()}

${sectie(
  7,
  'Aanbevelingen en vervolgacties',
  genummerdeLijst([
    verdiependNodig
      ? `**${faseBenoemd(samenvatting!.hoogsteRisicoklasse)}** — ${samenvatting!.aanbeveling}`
      : '**Quick scan volstaat** — geen verdiepend bodemonderzoek (fase B) nodig bij start werkzaamheden',
    'Bij **open ontgraving**: visuele inspectie en olfactorische beoordeling per sleuf conform NEN 5725',
    '**Vrijgekomen grond:** afvoeren als niet-verontreinigde grond (AVG-classificatie) na visuele controle',
    ctx.heeftHdd ? '**HDD-boringen:** geen bodemverwijdering, geen aanvullend onderzoek vereist' : '**Sleufloze techniek:** beperkte grondverwijdering — inspectie bij start-/eindputten',
    'Melden bij bevoegd gezag indien onverwachte verontreiniging wordt aangetroffen (omgevingsdienst)',
    'Bodemmanagementplan opnemen in werkplan (conform NEN 5725 bijlage B)',
    'Registratie vrijkomende grond in projectlogboek (hoeveelheid, classificatie, bestemming)',
  ])
)}

${divider()}

${sectie(
  8,
  'Conclusie',
  tabelFromRows(
    ['Onderdeel', 'Beoordeling', 'Status'],
    [
      ['Verontreinigingsrisico', risicoNiveau.charAt(0).toUpperCase() + risicoNiveau.slice(1), '✓'],
      ['Fase A (quick scan)', verdiependNodig ? 'Onvoldoende alleen' : 'Voldoende', verdiependNodig ? '△' : '✓'],
      ['Fase B (verdiepend)', verdiependNodig ? 'Aanbevolen/vereist' : 'Niet vereist', verdiependNodig ? '✓' : '✗'],
      ['Bodemlocaties geïnventariseerd', heeftData ? String(locaties.length) : 'Demo', '✓'],
      [
        'Tracé-kruising risicogebied',
        heeftKruising
          ? `${doorschreden.length} doorschreden, ${nabij.length} nabij`
          : 'Geen',
        heeftKruising && doorschreden.length > 0 ? '△' : '✓',
      ],
      ['Grondafvoer AVG', 'Toegestaan na visuele controle', '✓'],
      ['Werkplan bodem', 'Opnemen', '✓'],
      ['BRO-data beschikbaar', `${sonderingen} sonderingen`, '✓'],
    ]
  )
)}

${referentiesBlok([
  'NEN 5725:2009 — Bodemonderzoek voor milieuhygiënisch en agronomisch onderzoek',
  'Besluit bodemkwaliteit (Staatsblad 2008, 286) — regels bodemkwaliteit',
  'SIKB 2000 — Protocol voor milieuhygiënisch en agronomisch bodemonderzoek',
  'CROW-publicatie 500 — Richtlijnen voor bodem bij infrastructuur',
  'Handreiking Bodemkwaliteit Rijkswaterstaat / CROW',
  'BRO Handboek CPT-sonderingen — Basisregistratie Ondergrond',
])}

${bijlagenOverzicht([
  { letter: 'A', titel: 'Overzichtskaart onderzoeksgebied', beschrijving: 'Tracé en buffer 10 m (RD, EPSG:28992)' },
  { letter: 'B', titel: 'BRO-sonderingprofielen', beschrijving: `${sonderingen} CPT-profielen langs tracé` },
  { letter: 'C', titel: 'Historische kaarten', beschrijving: 'Topografische kaarten 1940–heden' },
  { letter: 'D', titel: 'Bodemloket-uittreksel', beschrijving: 'Registraties binnen straal 500 m' },
])}

${rapportFooter('Bodem & Milieu', trace)}`;
}
