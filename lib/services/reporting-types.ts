import type { ManagementKPIs, ProjectSummary } from '@/lib/services/project-stats';
import type { ActionMetSignaal } from '@/lib/services/action-signals';

export interface PortfolioRapportage {
  gegenereerdOp: string;
  periode: string;
  kpis: ManagementKPIs;
  projecten: ProjectSummary[];
  actiesPerSignaal: { groen: number; oranje: number; rood: number };
  voortgangPerOpdrachtgever: { opdrachtgever: string; voortgang: number; projecten: number }[];
  maandTrend: { maand: string; afgerond: number; open: number; blokkerend: number }[];
}

export interface ProjectRapportage {
  projectId: string;
  projectNaam: string;
  projectnummer: string;
  opdrachtgever: string;
  status: string;
  voortgang: number;
  traceCount: number;
  totaleLengteKm: number;
  openActies: number;
  blokkerendeActies: number;
  conflicten: number;
  disciplines: string[];
  acties: ActionMetSignaal[];
}
