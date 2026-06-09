import type { DemoTrace } from '../traces';
import { getDemoProjectById } from '../projects';
import { traceLengthM } from '@/lib/geo';

export interface GebiedProfiel {
  gemeente: string;
  provincie: string;
  waterschap: string;
  omgevingsdienst: string;
  archeologiePartner: string;
  bodemAdviesbureau: string;
  ecologieAdviesbureau: string;
  geotechnischBureau: string;
  historischeContext: string;
  bodemopbouwSamenvatting: string;
  grondwaterPeil: string;
  natura2000?: { naam: string; code: string; afstandM: number };
  archeologischeVerwachting: 'negatief' | 'laag' | 'middel' | 'hoog';
  ngeRisico: 'verwaarloosbaar' | 'laag' | 'middel' | 'hoog';
}

const GEBIED_PROFIELEN: Record<string, GebiedProfiel> = {
  'demo-project-001': {
    gemeente: 'Noordoostpolder',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'ADC Archeo Noordoostpolder',
    bodemAdviesbureau: 'MilieuAdvies Flevoland BV',
    ecologieAdviesbureau: 'Ecologisch Adviesbureau De Lepelaar',
    geotechnischBureau: 'Geotechnisch Adviesbureau Noord BV',
    historischeContext:
      'Droogmakerij sinds 1942; voorheen Zuiderzee. Geen prehistorische bewoning, agrarisch en infrastructuurgebied.',
    bodemopbouwSamenvatting: 'Veen (0–1,2 m) — klei (1,2–4,5 m) — zand (-4,5 m tot -12 m NAP)',
    grondwaterPeil: '-0,48 m NAP (gemiddeld peilgebied Noordoostpolder)',
    natura2000: { naam: 'Wolderwijd en Eemmeer (NL9803001)', code: 'NL9803001', afstandM: 450 },
    archeologischeVerwachting: 'negatief',
    ngeRisico: 'verwaarloosbaar',
  },
  'demo-project-002': {
    gemeente: 'Almere',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'RAAP Archeologisch Adviesbureau',
    bodemAdviesbureau: 'Tauw Milieu & Bodem',
    ecologieAdviesbureau: 'Bureau Stroming Ecologie',
    geotechnischBureau: 'Fugro GeoServices',
    historischeContext:
      'Poldervorming vanaf 1967; stedelijke uitbreiding Almere Poort sinds 2000. Geen significante archeologische waarden in utiliteitsstroken.',
    bodemopbouwSamenvatting: 'Opbouwhoogte zand — klei/zand wissellagen — draagkrachtig zand op diepte',
    grondwaterPeil: '-0,55 m NAP (stedelijk gebied Almere)',
    natura2000: { naam: 'Markermeer en IJmeer (NL9803003)', code: 'NL9803003', afstandM: 1200 },
    archeologischeVerwachting: 'laag',
    ngeRisico: 'verwaarloosbaar',
  },
  'demo-project-003': {
    gemeente: 'Purmerend',
    provincie: 'Noord-Holland',
    waterschap: 'Hoogheemraadschap Hollands Noorderkwartier',
    omgevingsdienst: 'Omgevingsdienst Noordzeekanaalgebied',
    archeologiePartner: 'Archol BV',
    bodemAdviesbureau: 'Antea Group Milieu',
    ecologieAdviesbureau: 'Ecofys Ecologisch Advies',
    geotechnischBureau: 'Civil Engineering Noord-Holland',
    historischeContext:
      'Historisch veenweidegebied; 19e-eeuwse ontginning. Beperkte industrie in perifeer gebied.',
    bodemopbouwSamenvatting: 'Veen/klei oppervlak — zand op diepte; lokale verontreiniging niet uitgesloten bij utiliteitszones',
    grondwaterPeil: '-0,35 m NAP',
    archeologischeVerwachting: 'laag',
    ngeRisico: 'laag',
  },
  'demo-project-005': {
    gemeente: 'Lelystad',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'RAAP Archeologisch Adviesbureau',
    bodemAdviesbureau: 'Tauw Milieu & Bodem',
    ecologieAdviesbureau: 'Bureau Stroming Ecologie',
    geotechnischBureau: 'Fugro GeoServices',
    historischeContext:
      'Stedelijk haven- en bedrijventerrein; opbouw vanaf 1967. Haveninfrastructuur en logistiek sinds 1980.',
    bodemopbouwSamenvatting: 'Opbouwhoogte — verharding/steenachtig — zand/klei op diepte; havenzone mogelijk verhoogd risico',
    grondwaterPeil: '-0,62 m NAP (havengebied)',
    natura2000: { naam: 'Markermeer en IJmeer (NL9803003)', code: 'NL9803003', afstandM: 800 },
    archeologischeVerwachting: 'negatief',
    ngeRisico: 'laag',
  },
  'demo-project-004': {
    gemeente: 'Dronten',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'ADC Archeo Noordoostpolder',
    bodemAdviesbureau: 'MilieuAdvies Flevoland BV',
    ecologieAdviesbureau: 'Ecologisch Adviesbureau De Lepelaar',
    geotechnischBureau: 'Geotechnisch Adviesbureau Noord BV',
    historischeContext:
      'Poldervorming; landbouw- en infrastructuurcorridor langs bestaande GTS-transportleiding. Weinig archeologische waarden in corridor.',
    bodemopbouwSamenvatting: 'Veen/klei oppervlak — zand op diepte; corridor volgt bestaande leidingtracé',
    grondwaterPeil: '-0,50 m NAP',
    natura2000: { naam: 'Oostvaardersplassen (NL9803002)', code: 'NL9803002', afstandM: 2100 },
    archeologischeVerwachting: 'negatief',
    ngeRisico: 'verwaarloosbaar',
  },
  'demo-project-006': {
    gemeente: 'Noordoostpolder',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'ADC Archeo Noordoostpolder',
    bodemAdviesbureau: 'MilieuAdvies Flevoland BV',
    ecologieAdviesbureau: 'Ecologisch Adviesbureau De Lepelaar',
    geotechnischBureau: 'Geotechnisch Adviesbureau Noord BV',
    historischeContext:
      'Centrumgebied Emmeloord; stedelijke infrastructuur sinds jaren 50. Stationterrein en utiliteitszones.',
    bodemopbouwSamenvatting: 'Opbouwhoogte — verharding — zand/klei op diepte',
    grondwaterPeil: '-0,45 m NAP',
    archeologischeVerwachting: 'laag',
    ngeRisico: 'verwaarloosbaar',
  },
  'demo-project-007': {
    gemeente: 'Dronten',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'RAAP Archeologisch Adviesbureau',
    bodemAdviesbureau: 'Tauw Milieu & Bodem',
    ecologieAdviesbureau: 'Bureau Stroming Ecologie',
    geotechnischBureau: 'Fugro GeoServices',
    historischeContext:
      'Nieuwbouwwijk Dronten West; poldervorming vanaf 1963. Geen significante archeologische waarden in woonwijkstroken.',
    bodemopbouwSamenvatting: 'Opbouwhoogte zand — klei/zand — draagkrachtig zand',
    grondwaterPeil: '-0,52 m NAP',
    archeologischeVerwachting: 'negatief',
    ngeRisico: 'verwaarloosbaar',
  },
  'demo-project-008': {
    gemeente: 'Almere',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'RAAP Archeologisch Adviesbureau',
    bodemAdviesbureau: 'Tauw Milieu & Bodem',
    ecologieAdviesbureau: 'Bureau Stroming Ecologie',
    geotechnischBureau: 'Fugro GeoServices',
    historischeContext:
      'Ecologisch kwetsbare zone langs Oostvaardersdijk; Natura 2000-buffer. HDD-techniek verplicht.',
    bodemopbouwSamenvatting: 'Veen/klei oppervlak — zand op diepte; ecologisch kwetsbaar gebied',
    grondwaterPeil: '-0,40 m NAP',
    natura2000: { naam: 'Oostvaardersplassen (NL9803002)', code: 'NL9803002', afstandM: 350 },
    archeologischeVerwachting: 'laag',
    ngeRisico: 'laag',
  },
  'demo-project-009': {
    gemeente: 'Urk',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'ADC Archeo Noordoostpolder',
    bodemAdviesbureau: 'MilieuAdvies Flevoland BV',
    ecologieAdviesbureau: 'Ecologisch Adviesbureau De Lepelaar',
    geotechnischBureau: 'Geotechnisch Adviesbureau Noord BV',
    historischeContext:
      'Historisch vissersdorp; industrieterrein-uitbreiding sinds 1990. Beperkte archeologische waarden in utiliteitsstroken.',
    bodemopbouwSamenvatting: 'Opbouwhoogte — klei/zand — haven- en industriezone mogelijk verhoogd risico',
    grondwaterPeil: '-0,38 m NAP',
    archeologischeVerwachting: 'middel',
    ngeRisico: 'laag',
  },
  'demo-project-010': {
    gemeente: 'Noordoostpolder',
    provincie: 'Flevoland',
    waterschap: 'Waterschap Zuiderzeeland',
    omgevingsdienst: 'Omgevingsdienst Flevoland & Gooi- en Vechtstreek',
    archeologiePartner: 'ADC Archeo Noordoostpolder',
    bodemAdviesbureau: 'MilieuAdvies Flevoland BV',
    ecologieAdviesbureau: 'Ecologisch Adviesbureau De Lepelaar',
    geotechnischBureau: 'Geotechnisch Adviesbureau Noord BV',
    historischeContext:
      'Agrarisch gebied NOP West; transportleiding tussen pompstation en distributieknooppunt.',
    bodemopbouwSamenvatting: 'Veen/klei — zand op diepte; agrarisch gebied',
    grondwaterPeil: '-0,48 m NAP',
    natura2000: { naam: 'Wolderwijd en Eemmeer (NL9803001)', code: 'NL9803001', afstandM: 600 },
    archeologischeVerwachting: 'negatief',
    ngeRisico: 'verwaarloosbaar',
  },
};

const DEFAULT_PROFIEL = GEBIED_PROFIELEN['demo-project-001'];

export function getGebiedProfiel(projectId: string): GebiedProfiel {
  return GEBIED_PROFIELEN[projectId] ?? DEFAULT_PROFIEL;
}

export interface RapportContext {
  trace: DemoTrace;
  project: ReturnType<typeof getDemoProjectById>;
  gebied: GebiedProfiel;
  lengteM: number;
  heeftHdd: boolean;
  heeftSleufloos: boolean;
  heeftOpenOntgraving: boolean;
  waterkruisingen: string[];
}

export function getRapportContext(trace: DemoTrace): RapportContext {
  const project = getDemoProjectById(trace.projectId);
  const gebied = getGebiedProfiel(trace.projectId);
  const legtechnieken = trace.segmenten.map((s) => s.legtechniek);

  return {
    trace,
    project,
    gebied,
    lengteM: traceLengthM(trace.coordinates, trace.traceLines),
    heeftHdd: legtechnieken.includes('hdd'),
    heeftSleufloos: legtechnieken.includes('sleufloos'),
    heeftOpenOntgraving: legtechnieken.includes('open_ontgraving'),
    waterkruisingen: trace.segmenten
      .filter((s) => s.leglocatie.includes('water') || s.wegnaam.toLowerCase().includes('gracht'))
      .map((s) => s.wegnaam),
  };
}

export function disciplineLabel(discipline: string): string {
  const labels: Record<string, string> = {
    elektra_ls: 'Elektra laagspanning',
    elektra_ms: 'Elektra middenspanning',
    gas_hd: 'Gas hogedruk',
    gas_ld: 'Gas lagedruk',
    water: 'Drinkwater',
    stations: 'Station / schakelruimte',
  };
  return labels[discipline] ?? discipline.replace(/_/g, ' ');
}
