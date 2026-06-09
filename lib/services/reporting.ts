import { getProjecten } from '@/lib/db/store';
import {
  getAllProjectSummaries,
  getManagementKPIs,
  getProjectActions,
} from '@/lib/services/project-stats';
import { enrichActions } from '@/lib/services/action-signals';
import type { PortfolioRapportage, ProjectRapportage } from '@/lib/services/reporting-types';

export type { PortfolioRapportage, ProjectRapportage } from '@/lib/services/reporting-types';
export {
  generateMaandrapportMarkdown,
  generateProjectRapportMarkdown,
} from '@/lib/services/reporting-markdown';

function buildMaandTrend() {
  const maanden = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun'];
  return maanden.map((maand, i) => ({
    maand,
    afgerond: 2 + i,
    open: Math.max(1, 12 - i * 2),
    blokkerend: i > 3 ? 2 : 1,
  }));
}

export async function getPortfolioRapportage(maand = 'juni 2026'): Promise<PortfolioRapportage> {
  const projecten = await getAllProjectSummaries();
  const kpis = await getManagementKPIs(projecten);
  const enriched = enrichActions(getProjectActions().filter((a) => a.status !== 'afgerond'));

  return {
    gegenereerdOp: new Date().toISOString(),
    periode: maand,
    kpis,
    projecten,
    actiesPerSignaal: {
      groen: enriched.filter((a) => a.signaal === 'groen').length,
      oranje: enriched.filter((a) => a.signaal === 'oranje').length,
      rood: enriched.filter((a) => a.signaal === 'rood').length,
    },
    voortgangPerOpdrachtgever: kpis.projectenPerOpdrachtgever.map(({ opdrachtgever, count }) => {
      const related = projecten.filter((p) => p.project.opdrachtgever === opdrachtgever);
      const voortgang =
        related.length > 0
          ? Math.round(related.reduce((s, p) => s + p.voortgang, 0) / related.length)
          : 0;
      return { opdrachtgever, voortgang, projecten: count };
    }),
    maandTrend: buildMaandTrend(),
  };
}

export async function getProjectRapportages(): Promise<ProjectRapportage[]> {
  const summaries = await getAllProjectSummaries();
  return summaries.map((s) => ({
    projectId: s.project.id,
    projectNaam: s.project.naam,
    projectnummer: s.project.projectnummer,
    opdrachtgever: s.project.opdrachtgever,
    status: s.project.status,
    voortgang: s.voortgang,
    traceCount: s.traceCount,
    totaleLengteKm: Math.round(s.totaleLengteM / 100) / 10,
    openActies: s.openActies,
    blokkerendeActies: s.blokkerendeActies,
    conflicten: s.conflicten,
    disciplines: s.disciplines,
    acties: enrichActions(s.acties),
  }));
}

export async function getProjectRapportage(projectId: string): Promise<ProjectRapportage | null> {
  const rapportages = await getProjectRapportages();
  return rapportages.find((p) => p.projectId === projectId) ?? null;
}


export async function getProjectById(id: string) {
  const projecten = await getProjecten();
  return projecten.find((p) => p.id === id);
}
