export type PlanningCategorie =
  | 'project'
  | 'ontwerp'
  | 'data'
  | 'toets'
  | 'engineering'
  | 'boorengineering'
  | 'calculatie'
  | 'onderzoek'
  | 'vergunning'
  | 'uitvoering'
  | 'dossier';

export type PlanningStatus = 'afgerond' | 'bezig' | 'gepland' | 'blokkerend';

export interface PlanningActiviteit {
  id: string;
  titel: string;
  /** Uitgebreide activiteitenbeschrijving */
  beschrijving: string;
  categorie: PlanningCategorie;
  traceId?: string;
  traceCode?: string;
  startDatum: string;
  eindDatum: string;
  duurDagen: number;
  voorgangers: string[];
  deliverables: string[];
  status: PlanningStatus;
  voortgangPct: number;
  toegewezenAan?: string;
  milestone?: boolean;
  kritiekPad?: boolean;
}

export interface ProjectPlanning {
  projectId: string;
  projectNaam: string;
  projectnummer: string;
  startDatum: string;
  eindDatum: string;
  duurDagen: number;
  gegenereerdOp: string;
  activiteiten: PlanningActiviteit[];
  milestones: PlanningActiviteit[];
  samenvatting: string;
}

export interface PlanningActiviteitTemplate {
  id: string;
  titel: string;
  beschrijving: string;
  categorie: PlanningCategorie;
  duurDagen: number;
  voorgangerIds: string[];
  deliverables: string[];
  milestone?: boolean;
  traceScope?: boolean;
}

export const PLANNING_CATEGORIE_LABELS: Record<PlanningCategorie, string> = {
  project: 'Project',
  ontwerp: 'Ontwerp',
  data: 'Data',
  toets: 'Toets',
  engineering: 'Engineering',
  boorengineering: 'Boorengineering',
  calculatie: 'Calculatie',
  onderzoek: 'Onderzoek',
  vergunning: 'Vergunning',
  uitvoering: 'Uitvoering',
  dossier: 'Dossier',
};

export const PLANNING_CATEGORIE_KLEUREN: Record<PlanningCategorie, string> = {
  project: '#64748B',
  ontwerp: '#2D6FE8',
  data: '#0EA5E9',
  toets: '#8B5CF6',
  engineering: '#10B981',
  boorengineering: '#F97316',
  calculatie: '#059669',
  onderzoek: '#EC4899',
  vergunning: '#EAB308',
  uitvoering: '#EF4444',
  dossier: '#6366F1',
};
