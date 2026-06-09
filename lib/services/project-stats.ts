import { cache } from 'react';
import type { DemoProject, ProjectStatus } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import {
  DEMO_PROJECT_ACTIONS,
  DEMO_TRACE_CONFLICTS,
  type ActionStatus,
  type ProjectAction,
} from '@/demo/project-actions';
import { getProjecten, getTraces } from '@/lib/db/store';
import { resolveAction } from '@/lib/services/action-store';
import { DISCIPLINE_LABELS, FASE_LABELS, type Discipline, type TraceFase } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import type { TracePhase } from '@/lib/process/phases';
import { getActionHref } from '@/lib/navigation/action-links';

const FASE_VOORTGANG: Record<TraceFase, { voortgang: number; processFase: TracePhase }> = {
  VO: { voortgang: 20, processFase: 'fase1' },
  DO: { voortgang: 50, processFase: 'fase2' },
  UO: { voortgang: 78, processFase: 'fase3' },
  as_built: { voortgang: 100, processFase: 'output' },
};

const OPEN_STAPPEN_PER_FASE: Record<TraceFase, number> = {
  VO: 12,
  DO: 8,
  UO: 4,
  as_built: 0,
};

export type {
  TraceStats,
  EnrichedTraceRow,
  TraceFilterParams,
} from '@/lib/services/trace-filters';
export { filterTraces, countTracesPerFase } from '@/lib/services/trace-filters';
import type { TraceStats, EnrichedTraceRow } from '@/lib/services/trace-filters';

export interface ProjectSummary {
  project: DemoProject;
  traces: TraceStats[];
  traceCount: number;
  totaleLengteM: number;
  voortgang: number;
  openActies: number;
  bezigActies: number;
  afgerondeActies: number;
  blokkerendeActies: number;
  hoogPrioriteitActies: number;
  conflicten: number;
  blokkerendeConflicten: number;
  disciplines: Discipline[];
  acties: ProjectAction[];
}

export interface ManagementKPIs {
  totaalProjecten: number;
  actieveProjecten: number;
  conceptProjecten: number;
  afgerondeProjecten: number;
  totaalTraces: number;
  gemiddeldeVoortgang: number;
  tracesPerFase: Record<TraceFase, number>;
  openActies: number;
  hoogPrioriteitActies: number;
  blokkerendeActies: number;
  totaalConflicten: number;
  blokkerendeConflicten: number;
  totaleTracelengteKm: number;
  projectenPerOpdrachtgever: { opdrachtgever: string; count: number }[];
  disciplineVerdeling: { discipline: Discipline; count: number; label: string }[];
  statusVerdeling: { status: ProjectStatus; count: number }[];
  tracesKlaarVoorUitvoering: number;
  verlopenDeadlines: number;
}

function getConflictStats(traceId: string) {
  return (
    DEMO_TRACE_CONFLICTS.find((c) => c.traceId === traceId) ?? {
      totaal: 0,
      blokkerend: 0,
      waarschuwing: 0,
    }
  );
}

function buildTraceStats(trace: DemoTrace): TraceStats {
  const faseInfo = FASE_VOORTGANG[trace.fase];
  const conflicts = getConflictStats(trace.id);
  return {
    trace,
    lengteM: traceLengthM(trace.coordinates, trace.traceLines),
    voortgang: faseInfo.voortgang,
    processFase: faseInfo.processFase,
    openStappen: OPEN_STAPPEN_PER_FASE[trace.fase],
    conflicten: conflicts.totaal,
    blokkerendeConflicten: conflicts.blokkerend,
  };
}

export function getProjectActions(projectId?: string): ProjectAction[] {
  const base = projectId
    ? DEMO_PROJECT_ACTIONS.filter((a) => a.projectId === projectId)
    : DEMO_PROJECT_ACTIONS;
  return base.map(resolveAction);
}

function buildProjectSummary(
  project: DemoProject,
  traces: DemoTrace[]
): ProjectSummary {
  const traceStats = traces.map(buildTraceStats);
  const acties = getProjectActions(project.id);

  return {
    project,
    traces: traceStats,
    traceCount: traceStats.length,
    totaleLengteM: traceStats.reduce((sum, t) => sum + t.lengteM, 0),
    voortgang:
      traceStats.length > 0
        ? Math.round(traceStats.reduce((sum, t) => sum + t.voortgang, 0) / traceStats.length)
        : 0,
    openActies: acties.filter((a) => a.status === 'open' || a.status === 'blokkerend').length,
    bezigActies: acties.filter((a) => a.status === 'bezig').length,
    afgerondeActies: acties.filter((a) => a.status === 'afgerond').length,
    blokkerendeActies: acties.filter((a) => a.status === 'blokkerend').length,
    hoogPrioriteitActies: acties.filter(
      (a) => a.prioriteit === 'hoog' && (a.status === 'open' || a.status === 'blokkerend')
    ).length,
    conflicten: traceStats.reduce((sum, t) => sum + t.conflicten, 0),
    blokkerendeConflicten: traceStats.reduce((sum, t) => sum + t.blokkerendeConflicten, 0),
    disciplines: [...new Set(traceStats.map((t) => t.trace.discipline))],
    acties,
  };
}

export async function getProjectSummary(project: DemoProject): Promise<ProjectSummary> {
  const traces = await getTraces(project.id);
  return buildProjectSummary(project, traces);
}

export const getAllProjectSummaries = cache(async (): Promise<ProjectSummary[]> => {
  const [projecten, allTraces] = await Promise.all([getProjecten(), getTraces()]);
  const tracesByProject = new Map<string, DemoTrace[]>();

  for (const trace of allTraces) {
    const list = tracesByProject.get(trace.projectId) ?? [];
    list.push(trace);
    tracesByProject.set(trace.projectId, list);
  }

  return projecten.map((project) =>
    buildProjectSummary(project, tracesByProject.get(project.id) ?? [])
  );
});

export type WorkCategoryId =
  | 'onderzoek'
  | 'berekening'
  | 'tekening'
  | 'vergunning'
  | 'data_toets'
  | 'dossier'
  | 'review';

export interface WorkCategoryCounts {
  teDoen: number;
  bezig: number;
  afgerond: number;
  blokkerend: number;
}

export interface WorkCategoryTraceHint {
  traceId: string;
  traceCode: string;
  label: string;
  status: 'open' | 'bezig' | 'blokkerend';
}

export interface ProjectWorkCategory extends WorkCategoryCounts {
  id: WorkCategoryId;
  label: string;
  beschrijving: string;
  traceHints: WorkCategoryTraceHint[];
}

export interface ProjectWorkOverview {
  categories: ProjectWorkCategory[];
  totaalTeDoen: number;
  totaalBezig: number;
  totaalBlokkerend: number;
  tracesPerFase: Record<TraceFase, number>;
  prioriteitItems: {
    id: string;
    label: string;
    category: WorkCategoryId;
    status: ActionStatus;
    traceCode?: string;
    href: string;
    prioriteit?: ProjectAction['prioriteit'];
    deadline?: string;
  }[];
}

const WORK_CATEGORY_META: Record<
  WorkCategoryId,
  { label: string; beschrijving: string }
> = {
  onderzoek: {
    label: 'Onderzoeken',
    beschrijving: 'Quick scans, bodem, ecologie, KLIC',
  },
  berekening: {
    label: 'Berekeningen',
    beschrijving: 'Discipline-engineering en dimensionering',
  },
  tekening: {
    label: 'Tekeningen',
    beschrijving: 'Tracé, profielen en details',
  },
  vergunning: {
    label: 'Vergunningen',
    beschrijving: 'Meldingen, aanvragen en toestemmingen',
  },
  data_toets: {
    label: 'Data & toets',
    beschrijving: 'GIS-data ophalen en tracé toetsen',
  },
  dossier: {
    label: 'Dossier',
    beschrijving: 'Documenten bundelen en opleveren',
  },
  review: {
    label: 'Review',
    beschrijving: 'Tracévalidatie en kwaliteitscontrole',
  },
};

/** Per tracéfase: welke werkcategorieën typisch nog open zijn (demo-heuristiek). */
const TRACE_WORK_BY_FASE: Record<
  TraceFase,
  { category: WorkCategoryId; label: string; status: 'open' | 'bezig' }[]
> = {
  VO: [
    { category: 'data_toets', label: 'GIS-data verzamelen', status: 'open' },
    { category: 'data_toets', label: 'Tracé toetsen op conflicten', status: 'open' },
    { category: 'review', label: 'Concepttracé beoordelen', status: 'open' },
  ],
  DO: [
    { category: 'berekening', label: 'Engineering berekenen', status: 'open' },
    { category: 'tekening', label: 'Tekeningen genereren', status: 'open' },
    { category: 'onderzoek', label: 'Benodigde onderzoeken uitvoeren', status: 'open' },
  ],
  UO: [
    { category: 'onderzoek', label: 'Onderzoeken afronden', status: 'bezig' },
    { category: 'vergunning', label: 'Vergunningen regelen', status: 'open' },
    { category: 'dossier', label: 'Dossier samenstellen', status: 'open' },
  ],
  as_built: [],
};

function emptyCounts(): WorkCategoryCounts {
  return { teDoen: 0, bezig: 0, afgerond: 0, blokkerend: 0 };
}

function actionCategory(action: ProjectAction): WorkCategoryId {
  if (action.type === 'onderzoek') return 'onderzoek';
  if (action.type === 'vergunning') return 'vergunning';
  if (action.type === 'review') return 'review';
  if (action.type === 'deadline') return 'dossier';
  const t = action.titel.toLowerCase();
  if (t.includes('tekening') || t.includes('as-built') || t.includes('hdd-ontwerp')) {
    return 'tekening';
  }
  return 'berekening';
}

function addActionToCategory(
  categories: Map<WorkCategoryId, ProjectWorkCategory>,
  action: ProjectAction
) {
  const id = actionCategory(action);
  const cat = categories.get(id)!;

  if (action.status === 'afgerond') {
    cat.afgerond++;
  } else if (action.status === 'bezig') {
    cat.bezig++;
  } else if (action.status === 'blokkerend') {
    cat.blokkerend++;
    cat.teDoen++;
  } else {
    cat.teDoen++;
  }

  if (action.status !== 'afgerond' && action.traceCode && action.traceId) {
    cat.traceHints.push({
      traceId: action.traceId,
      traceCode: action.traceCode,
      label: action.titel,
      status: action.status === 'bezig' ? 'bezig' : action.status === 'blokkerend' ? 'blokkerend' : 'open',
    });
  }
}

function hasActionForTraceCategory(
  actions: ProjectAction[],
  traceId: string,
  category: WorkCategoryId
): boolean {
  return actions.some(
    (a) => a.traceId === traceId && actionCategory(a) === category && a.status !== 'afgerond'
  );
}

export function getProjectWorkOverview(summary: ProjectSummary): ProjectWorkOverview {
  const projectId = summary.project.id;
  const categories = new Map<WorkCategoryId, ProjectWorkCategory>();

  for (const id of Object.keys(WORK_CATEGORY_META) as WorkCategoryId[]) {
    categories.set(id, {
      id,
      ...WORK_CATEGORY_META[id],
      ...emptyCounts(),
      traceHints: [],
    });
  }

  for (const action of summary.acties) {
    addActionToCategory(categories, action);
  }

  for (const traceStat of summary.traces) {
    const items = TRACE_WORK_BY_FASE[traceStat.trace.fase];
    for (const item of items) {
      if (hasActionForTraceCategory(summary.acties, traceStat.trace.id, item.category)) {
        continue;
      }

      const cat = categories.get(item.category)!;
      const alreadyHasTrace = cat.traceHints.some((h) => h.traceId === traceStat.trace.id);
      if (alreadyHasTrace) continue;

      if (item.status === 'bezig') {
        cat.bezig++;
      } else {
        cat.teDoen++;
      }

      cat.traceHints.push({
        traceId: traceStat.trace.id,
        traceCode: traceStat.trace.code,
        label: item.label,
        status: item.status,
      });
    }
  }

  const tracesPerFase: Record<TraceFase, number> = { VO: 0, DO: 0, UO: 0, as_built: 0 };
  for (const t of summary.traces) {
    tracesPerFase[t.trace.fase]++;
  }

  const openActions = summary.acties
    .filter((a) => a.status !== 'afgerond')
    .sort((a, b) => {
      const statusOrder: Record<ActionStatus, number> = {
        blokkerend: 0,
        open: 1,
        bezig: 2,
        afgerond: 3,
      };
      const sd = statusOrder[a.status] - statusOrder[b.status];
      if (sd !== 0) return sd;
      const pd =
        (a.prioriteit === 'hoog' ? 0 : a.prioriteit === 'normaal' ? 1 : 2) -
        (b.prioriteit === 'hoog' ? 0 : b.prioriteit === 'normaal' ? 1 : 2);
      if (pd !== 0) return pd;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return 0;
    });

  const prioriteitItems = openActions.slice(0, 6).map((a) => ({
    id: a.id,
    label: a.titel,
    category: actionCategory(a),
    status: a.status,
    traceCode: a.traceCode,
    href: getActionHref(a),
    prioriteit: a.prioriteit,
    deadline: a.deadline,
  }));

  const categoryList = [...categories.values()].filter(
    (c) => c.teDoen + c.bezig + c.afgerond + c.blokkerend > 0
  );

  return {
    categories: categoryList.sort((a, b) => {
      const aOpen = a.teDoen + a.blokkerend;
      const bOpen = b.teDoen + b.blokkerend;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return b.bezig - a.bezig;
    }),
    totaalTeDoen: categoryList.reduce((s, c) => s + c.teDoen, 0),
    totaalBezig: categoryList.reduce((s, c) => s + c.bezig, 0),
    totaalBlokkerend: categoryList.reduce((s, c) => s + c.blokkerend, 0),
    tracesPerFase,
    prioriteitItems,
  };
}

export { FASE_LABELS };

export async function getEnrichedTraces(): Promise<EnrichedTraceRow[]> {
  const summaries = await getAllProjectSummaries();
  return summaries.flatMap((s) =>
    s.traces.map((t) => ({
      ...t,
      projectId: s.project.id,
      projectNaam: s.project.naam,
      projectnummer: s.project.projectnummer,
      projectStatus: s.project.status,
      opdrachtgever: s.project.opdrachtgever,
    }))
  );
}

export async function getManagementKPIs(
  existingSummaries?: ProjectSummary[]
): Promise<ManagementKPIs> {
  const summaries = existingSummaries ?? (await getAllProjectSummaries());
  const allTraces = summaries.flatMap((s) => s.traces);
  const allActions = getProjectActions();
  const today = new Date().toISOString().slice(0, 10);

  const tracesPerFase: Record<TraceFase, number> = {
    VO: 0,
    DO: 0,
    UO: 0,
    as_built: 0,
  };
  for (const t of allTraces) {
    tracesPerFase[t.trace.fase]++;
  }

  const opdrachtgeverMap = new Map<string, number>();
  for (const s of summaries) {
    opdrachtgeverMap.set(
      s.project.opdrachtgever,
      (opdrachtgeverMap.get(s.project.opdrachtgever) ?? 0) + 1
    );
  }

  const disciplineMap = new Map<Discipline, number>();
  for (const t of allTraces) {
    disciplineMap.set(t.trace.discipline, (disciplineMap.get(t.trace.discipline) ?? 0) + 1);
  }

  const statusMap = new Map<ProjectStatus, number>();
  for (const s of summaries) {
    statusMap.set(s.project.status, (statusMap.get(s.project.status) ?? 0) + 1);
  }

  return {
    totaalProjecten: summaries.length,
    actieveProjecten: summaries.filter((s) => s.project.status === 'actief').length,
    conceptProjecten: summaries.filter((s) => s.project.status === 'concept').length,
    afgerondeProjecten: summaries.filter((s) => s.project.status === 'afgerond').length,
    totaalTraces: allTraces.length,
    gemiddeldeVoortgang:
      allTraces.length > 0
        ? Math.round(allTraces.reduce((sum, t) => sum + t.voortgang, 0) / allTraces.length)
        : 0,
    tracesPerFase,
    openActies: allActions.filter((a) => a.status === 'open' || a.status === 'blokkerend').length,
    hoogPrioriteitActies: allActions.filter(
      (a) => a.prioriteit === 'hoog' && (a.status === 'open' || a.status === 'blokkerend')
    ).length,
    blokkerendeActies: allActions.filter((a) => a.status === 'blokkerend').length,
    totaalConflicten: allTraces.reduce((sum, t) => sum + t.conflicten, 0),
    blokkerendeConflicten: allTraces.reduce((sum, t) => sum + t.blokkerendeConflicten, 0),
    totaleTracelengteKm:
      Math.round(allTraces.reduce((sum, t) => sum + t.lengteM, 0) / 100) / 10,
    projectenPerOpdrachtgever: [...opdrachtgeverMap.entries()]
      .map(([opdrachtgever, count]) => ({ opdrachtgever, count }))
      .sort((a, b) => b.count - a.count),
    disciplineVerdeling: [...disciplineMap.entries()]
      .map(([discipline, count]) => ({
        discipline,
        count,
        label: DISCIPLINE_LABELS[discipline],
      }))
      .sort((a, b) => b.count - a.count),
    statusVerdeling: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    tracesKlaarVoorUitvoering: allTraces.filter(
      (t) => t.trace.fase === 'UO' || t.trace.fase === 'as_built'
    ).length,
    verlopenDeadlines: allActions.filter(
      (a) => a.deadline && a.deadline < today && a.status !== 'bezig'
    ).length,
  };
}
