import type { ProjectStatus } from '@/demo/projects';
import type { SignaalKleur } from '@/lib/services/action-signals';
import type { TraceFase } from '@/lib/db/types';
import type { Discipline } from '@/lib/db/types';

export type DashboardStatusFilter = ProjectStatus | 'alle';
export type ActiesSignaalFilter = SignaalKleur | 'alle';
export type TraceConflictenFilter = 'alle' | 'blokkerend';
export type ActiesExtraFilter = 'blokkerend' | 'verlopen' | 'hoog';

const TRACE_FASES: TraceFase[] = ['VO', 'DO', 'UO', 'as_built'];
const DISCIPLINES: Discipline[] = [
  'elektra_ls',
  'elektra_ms',
  'stations',
  'gas_hd',
  'gas_ld',
  'water',
];

export function dashboardUrl(params?: {
  status?: ProjectStatus;
  opdrachtgever?: string;
  discipline?: Discipline;
}): string {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.opdrachtgever) search.set('opdrachtgever', params.opdrachtgever);
  if (params?.discipline) search.set('discipline', params.discipline);
  const q = search.toString();
  const base = q ? `/dashboard?${q}` : '/dashboard';
  if (params?.status || params?.opdrachtgever || params?.discipline) {
    return `${base}#projecten`;
  }
  return base;
}

export function actiesUrl(params?: { signaal?: SignaalKleur; filter?: ActiesExtraFilter }): string {
  const search = new URLSearchParams();
  if (params?.signaal) search.set('signaal', params.signaal);
  if (params?.filter) search.set('filter', params.filter);
  const q = search.toString();
  return q ? `/acties?${q}` : '/acties';
}

export function beheerUrl(params?: { status?: ProjectStatus }): string {
  if (!params?.status) return '/beheer';
  return `/beheer?status=${params.status}`;
}

export function tracesUrl(params?: {
  fase?: TraceFase;
  discipline?: Discipline;
  uitvoering?: 'klaar';
  conflicten?: TraceConflictenFilter;
}): string {
  const search = new URLSearchParams();
  if (params?.fase) search.set('fase', params.fase);
  if (params?.discipline) search.set('discipline', params.discipline);
  if (params?.uitvoering) search.set('uitvoering', params.uitvoering);
  if (params?.conflicten) search.set('conflicten', params.conflicten);
  const q = search.toString();
  return q ? `/traces?${q}` : '/traces';
}

export function rapportageUrl(): string {
  return '/rapportage';
}

export function projectRapportageUrl(projectId: string): string {
  return `/rapportage/${projectId}`;
}

export function parseDashboardStatus(value: string | null): DashboardStatusFilter {
  if (value === 'actief' || value === 'concept' || value === 'afgerond') return value;
  return 'alle';
}

export function parseActiesSignaal(value: string | null): ActiesSignaalFilter {
  if (value === 'groen' || value === 'oranje' || value === 'rood') return value;
  return 'alle';
}

export function parseActiesExtraFilter(value: string | null): ActiesExtraFilter | null {
  if (value === 'blokkerend' || value === 'verlopen' || value === 'hoog') return value;
  return null;
}

export function parseTraceFase(value: string | null): TraceFase | null {
  if (value && TRACE_FASES.includes(value as TraceFase)) return value as TraceFase;
  return null;
}

export function parseTraceDiscipline(value: string | null): Discipline | null {
  if (value && DISCIPLINES.includes(value as Discipline)) return value as Discipline;
  return null;
}

export function parseTraceConflicten(value: string | null): TraceConflictenFilter | null {
  if (value === 'alle' || value === 'blokkerend') return value;
  return null;
}
