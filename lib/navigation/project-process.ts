import type { LucideIcon } from 'lucide-react';
import {
  FolderKanban,
  GitBranch,
  CalendarDays,
  FolderOpen,
  FileBarChart,
} from 'lucide-react';

export type ProjectProcessStepId =
  | 'overzicht'
  | 'trace'
  | 'planning'
  | 'dossier'
  | 'rapportage';

export interface ProjectProcessStep {
  id: ProjectProcessStepId;
  nummer: number;
  label: string;
  titel: string;
  beschrijving: string;
  icon: LucideIcon;
  href: (projectId: string, traceId?: string) => string;
}

/** Projectniveau: van overzicht tot rapportage. Tracé-engineering heeft eigen 5 fases. */
export const PROJECT_PROCESS_STEPS: ProjectProcessStep[] = [
  {
    id: 'overzicht',
    nummer: 1,
    label: 'Stap 1',
    titel: 'Projectoverzicht',
    beschrijving: 'Tracés, voortgang en open acties bekijken',
    icon: FolderKanban,
    href: (projectId) => `/project/${projectId}`,
  },
  {
    id: 'trace',
    nummer: 2,
    label: 'Stap 2',
    titel: 'Tracé-engineering',
    beschrijving: 'Ontwerp, data, engineering, omgeving en dossier per tracé',
    icon: GitBranch,
    href: (projectId, traceId) =>
      traceId
        ? `/project/${projectId}/trace/${traceId}`
        : `/project/${projectId}/trace`,
  },
  {
    id: 'planning',
    nummer: 3,
    label: 'Stap 3',
    titel: 'Planning',
    beschrijving: 'Activiteiten, milestones en Gantt-overzicht',
    icon: CalendarDays,
    href: (projectId) => `/project/${projectId}/planning`,
  },
  {
    id: 'dossier',
    nummer: 4,
    label: 'Stap 4',
    titel: 'Dossier',
    beschrijving: 'Documenten, tekeningen en rapporten bundelen',
    icon: FolderOpen,
    href: (projectId) => `/project/${projectId}/dossier`,
  },
  {
    id: 'rapportage',
    nummer: 5,
    label: 'Stap 5',
    titel: 'Rapportage',
    beschrijving: 'Projectstatus en inzichten delen',
    icon: FileBarChart,
    href: (projectId) => `/rapportage/${projectId}`,
  },
];

export function resolveProjectProcessStep(pathname: string): ProjectProcessStepId {
  if (pathname.includes('/trace/')) return 'trace';
  if (pathname.includes('/planning')) return 'planning';
  if (pathname.includes('/dossier')) return 'dossier';
  if (pathname.startsWith('/rapportage/')) return 'rapportage';
  if (pathname.startsWith('/project/')) return 'overzicht';
  return 'overzicht';
}

export function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/);
  if (match) return match[1];
  const rapportMatch = pathname.match(/^\/rapportage\/([^/]+)/);
  return rapportMatch?.[1] ?? null;
}

export function extractTraceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/\/project\/[^/]+\/trace\/([^/]+)/);
  return match?.[1] ?? null;
}

export function getProjectProcessStepHref(
  stepId: ProjectProcessStepId,
  projectId: string,
  traceId?: string | null
): string {
  const step = PROJECT_PROCESS_STEPS.find((s) => s.id === stepId);
  if (!step) return `/project/${projectId}`;
  return step.href(projectId, traceId ?? undefined);
}
