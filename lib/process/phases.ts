export type TracePhase = 'fase1' | 'fase2' | 'fase3' | 'fase4' | 'output';

export type PhaseStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

export interface TracePhaseDefinition {
  id: TracePhase;
  nummer: number;
  label: string;
  titel: string;
  beschrijving: string;
}

export const TRACE_PHASES: TracePhaseDefinition[] = [
  {
    id: 'fase1',
    nummer: 1,
    label: 'Fase 1',
    titel: 'Ontwerp & tracé',
    beschrijving: 'Tracéontwerp, segmenten, discipline en leglocatie',
  },
  {
    id: 'fase2',
    nummer: 2,
    label: 'Fase 2',
    titel: 'Data & risico\'s',
    beschrijving: 'GIS-data verzamelen, KLIC, graafschade- en omgevingsrisico\'s',
  },
  {
    id: 'fase3',
    nummer: 3,
    label: 'Fase 3',
    titel: 'Engineering',
    beschrijving: 'Discipline-berekeningen en SVG-tekeningen',
  },
  {
    id: 'fase4',
    nummer: 4,
    label: 'Fase 4',
    titel: 'Omgeving',
    beschrijving: 'OMO/OMA, conditionerende onderzoeken, aanvragen en AI',
  },
  {
    id: 'output',
    nummer: 5,
    label: 'Output',
    titel: 'Dossier & bijlagen',
    beschrijving: 'Rapporten, tekeningen en documenten bundelen',
  },
];
