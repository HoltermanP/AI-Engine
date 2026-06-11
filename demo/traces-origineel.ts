import type { Discipline, TraceFase } from '@/lib/db/types';
import { disciplineColor } from '@/lib/discipline-colors';
import {
  traceRouteLines,
  flattenTraceLines,
  type TraceSegment,
  type TraceRouteSegment,
} from './roads';

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

function makeTrace(
  base: Omit<DemoTrace, 'coordinates' | 'traceLines'> & {
    route: TraceRouteSegment[];
  }
): DemoTrace {
  const traceLines = traceRouteLines(base.route);
  const { route: _route, ...rest } = base;
  return {
    ...rest,
    traceLines,
    coordinates: flattenTraceLines(traceLines),
  };
}

/** LS-tracé: wijziging laagspanningsnet, typisch 50–500 m */
function makeLsTrace(opts: {
  id: string;
  projectId: string;
  code: string;
  naam: string;
  netType: string;
  fase: TraceFase;
  wegId: string;
  wegnaam: string;
  leglocatie: string;
  omschrijving: string;
  startChainage: number;
  endChainage: number;
  offsetM?: number;
  diepteNap?: number;
  legtechniek?: TraceSegment['legtechniek'];
  segmenten?: TraceSegment[];
}): DemoTrace {
  const lengteM = opts.endChainage - opts.startChainage;
  const offsetM = opts.offsetM ?? -1.5;
  const diepteNap = opts.diepteNap ?? -0.65;
  const legtechniek = opts.legtechniek ?? 'open_ontgraving';

  return makeTrace({
    id: opts.id,
    projectId: opts.projectId,
    code: opts.code,
    naam: opts.naam,
    discipline: 'elektra_ls',
    netType: opts.netType,
    fase: opts.fase,
    vereisteDekking: 0.6,
    kleur: disciplineColor('elektra_ls'),
    wegnaam: opts.wegnaam,
    leglocatie: opts.leglocatie,
    omschrijving: opts.omschrijving,
    route: [
      {
        wegId: opts.wegId,
        offsetM,
        diepteNap,
        startChainage: opts.startChainage,
        endChainage: opts.endChainage,
      },
    ],
    segmenten: opts.segmenten ?? [
      {
        volgorde: 1,
        wegId: opts.wegId,
        wegnaam: opts.wegnaam,
        leglocatie: opts.leglocatie.includes('berm') ? 'berm' : 'onder_verharding',
        legtechniek,
        lengteM,
      },
    ],
  });
}

/** Eén representatief LS-tracé per demo-project (50–500 m) */
export const DEMO_TRACES: DemoTrace[] = [
  makeLsTrace({
    id: 'trace-ls-001',
    projectId: 'demo-project-001',
    code: 'EL-LS-001',
    naam: 'LS-verzwaring Schokkerweg woonwijk',
    netType: 'GPLK 4x240 Al (vervanging 4x150)',
    fase: 'DO',
    wegId: 'weg-schokkerweg',
    wegnaam: 'Lange Dreef (Schokkerwal)',
    leglocatie: 'Berm zuidzijde, 1,5 m uit de kant',
    startChainage: 60,
    endChainage: 240,
    offsetM: -4.5,
    omschrijving:
      'Vervanging bestaand LS-net (4x150 Al) door 4x240 Al langs 48 nieuwe huisaansluitingen. Tracé volgt bestaande kabelroute in zuidberm conform Liander.',
  }),
  makeLsTrace({
    id: 'trace-ls-002',
    projectId: 'demo-project-002',
    code: 'EL-LS-002',
    naam: 'LS-ringvoeding Almere Poort',
    netType: 'GPLK 4x185 Al',
    fase: 'DO',
    wegId: 'weg-almere-poort',
    wegnaam: 'Poortdreef (Almere Poort)',
    leglocatie: 'Berm zuid, 1,2 m onder trottoir',
    startChainage: 40,
    endChainage: 240,
    offsetM: -1.4,
    diepteNap: -0.7,
    omschrijving:
      'Nieuwe LS-ringvoeding voor wijktransformator Almere Poort. Tracé langs Poortdreef (NWB); parallel aan bestaand LS-net in bebouwde kom.',
    segmenten: [
      {
        volgorde: 1,
        wegId: 'weg-almere-poort',
        wegnaam: 'Poortdreef (Almere Poort)',
        leglocatie: 'berm',
        legtechniek: 'open_ontgraving',
        lengteM: 80,
      },
      {
        volgorde: 2,
        wegId: 'weg-almere-poort',
        wegnaam: 'Poortdreef — kruising sloot',
        leglocatie: 'onder_verharding',
        legtechniek: 'persing',
        lengteM: 60,
      },
      {
        volgorde: 3,
        wegId: 'weg-almere-poort',
        wegnaam: 'Poortdreef (Almere Poort)',
        leglocatie: 'berm',
        legtechniek: 'sleufloos',
        lengteM: 60,
      },
    ],
  }),
  makeLsTrace({
    id: 'trace-ls-003',
    projectId: 'demo-project-003',
    code: 'EL-LS-003',
    naam: 'LS-kabelvervanging Purmerend Zuid',
    netType: 'GPLK 4x240 Al',
    fase: 'UO',
    wegId: 'weg-purmerend-zuid',
    wegnaam: 'Purmerend-Zuid 4',
    leglocatie: 'Berm zuidzijde, 2 m uit de kant',
    startChainage: 400,
    endChainage: 650,
    offsetM: -1.6,
    omschrijving:
      'Vervanging verouderd LS-net aluminium door nieuwe GPLK-kabel. Tracé in zuidberm langs bestaande infrastructuurzone Purmerend-Zuid.',
  }),
  makeLsTrace({
    id: 'trace-ls-004',
    projectId: 'demo-project-004',
    code: 'EL-LS-004',
    naam: 'LS-concepttracé Flevopolder Noord',
    netType: 'GPLK 4x185 Al (concept)',
    fase: 'VO',
    wegId: 'weg-provincialeweg',
    wegnaam: 'Provincialeweg N50 (Kuinderweg)',
    leglocatie: 'Berm zuid, parallel bestaand LS',
    startChainage: 3200,
    endChainage: 3350,
    offsetM: -1.5,
    omschrijving:
      'Concepttracé voor LS-netuitbreiding bij nieuwe bedrijfskavels. Wijziging distributiering: aftakking van bestaande LS-kabel richting perceelgrenzen.',
  }),
  makeLsTrace({
    id: 'trace-ls-005',
    projectId: 'demo-project-005',
    code: 'EL-LS-005',
    naam: 'LS-verzwaring havengebied Lelystad',
    netType: 'GPLK 4x240 Cu',
    fase: 'DO',
    wegId: 'weg-markerwaardweg',
    wegnaam: 'Kennemerlandlaan (Lelystad Haven)',
    leglocatie: 'Berm oostzijde, 1,2 m uit de kant',
    startChainage: 200,
    endChainage: 500,
    offsetM: 3,
    diepteNap: -0.68,
    omschrijving:
      'Verzwaring LS-net voor 120 bedrijfs- en havenaansluitingen. Vervanging 4x95 door 4x240; capaciteit ring voldoet niet meer aan piekvraag.',
  }),
  makeLsTrace({
    id: 'trace-ls-006',
    projectId: 'demo-project-006',
    code: 'EL-LS-006',
    naam: 'LS-aansluiting Espelerweg woonwijk',
    netType: 'GPLK 4x185 Al',
    fase: 'UO',
    wegId: 'weg-espelerweg-emmeloord',
    wegnaam: 'Espelerweg (Emmeloord)',
    leglocatie: 'Berm zuid, parallel aan bestaande LS-ring',
    startChainage: 1200,
    endChainage: 1450,
    offsetM: -1.5,
    omschrijving:
      'Nieuwe LS-aansluitkabel langs Espelerweg richting bestaande LS-distributiering. Tracé volgt NWB-wegvak in zuidberm.',
  }),
  makeLsTrace({
    id: 'trace-ls-007',
    projectId: 'demo-project-007',
    code: 'EL-LS-007',
    naam: 'LS-distributie nieuwbouw Dronten West',
    netType: 'GPLK 4x150 Al',
    fase: 'DO',
    wegId: 'weg-dronten-de-noord',
    wegnaam: 'De Noord (Dronten)',
    leglocatie: 'Onder trottoir, 1,8 m uit de kant',
    startChainage: 300,
    endChainage: 550,
    offsetM: -1.8,
    diepteNap: -0.72,
    legtechniek: 'sleufloos',
    omschrijving:
      'Nieuw LS-distributienet voor 200 woningen in Dronten West. Hoofdkabel langs De Noord; aftakkingen per bouwblok via bestaande LS-sleuf.',
  }),
  makeLsTrace({
    id: 'trace-ls-008',
    projectId: 'demo-project-008',
    code: 'EL-LS-008',
    naam: 'LS-HDD onder Oostvaardersdijk',
    netType: 'GPLK 4x185 Al',
    fase: 'VO',
    wegId: 'weg-oostvaardersdijk',
    wegnaam: 'Oostvaardersdijk (Lelystad)',
    leglocatie: 'Gestuurd geboord onder ecologische zone',
    startChainage: 400,
    endChainage: 650,
    offsetM: -2,
    diepteNap: -0.85,
    legtechniek: 'hdd',
    omschrijving:
      'LS-kabelwijziging: omlegging bestaand LS-net uit kwetsbare zone langs Oostvaardersdijk. Vervanging open sleuftracé door HDD onder de dijk.',
  }),
  makeLsTrace({
    id: 'trace-ls-009',
    projectId: 'demo-project-009',
    code: 'EL-LS-009',
    naam: 'LS-net industrieterrein Urk',
    netType: 'GPLK 4x240 Al',
    fase: 'DO',
    wegId: 'weg-urk-ambachtsweg',
    wegnaam: 'Urkerweg (industrieterrein)',
    leglocatie: 'Utiliteitsstrook gecombineerd tracé',
    startChainage: 500,
    endChainage: 750,
    offsetM: -2,
    diepteNap: -0.75,
    omschrijving:
      'Verzwaring LS-net voor uitbreiding industrieterrein Urk. Tracé langs Urkerweg in gezamenlijke utiliteitsstrook; 18 nieuwe bedrijfsaansluitingen.',
  }),
  makeLsTrace({
    id: 'trace-ls-010',
    projectId: 'demo-project-010',
    code: 'EL-LS-010',
    naam: 'LS-vervanging NOP West (as-built)',
    netType: 'GPLK 4x185 Al',
    fase: 'as_built',
    wegId: 'weg-schokkerweg',
    wegnaam: 'Schokkerweg (west)',
    leglocatie: 'Berm zuidzijde, bestaande kabelroute',
    startChainage: 80,
    endChainage: 280,
    offsetM: -4,
    omschrijving:
      'As-built: vervangen LS-kabelsectie na capaciteitsproblemen distributiegebied west. Bestaand net buiten bedrijf gesteld; nieuwe kabel in zelfde sleuf.',
  }),
];

export { DEMO_PROJECT, DEMO_PROJECTS } from './projects';
