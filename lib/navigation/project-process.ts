import type { LucideIcon } from 'lucide-react';
import {
  FolderKanban,
  GitBranch,
  Mountain,
  Network,
  Wrench,
  CalendarDays,
  FolderOpen,
} from 'lucide-react';

/**
 * Processtappen van het project, in engineering-logische volgorde. Sinds de
 * cockpit-herstructurering is elke stap een query (`?stap=`) binnen één route
 * `/project/[id]`, zodat de kaart gemount blijft tijdens het doorlopen.
 */
export type ProjectProcessStepId =
  | 'intake'
  | 'trace'
  | 'bodem'
  | 'netontwerp'
  | 'engineering'
  | 'planning'
  | 'dossier';

export interface ProjectProcessStep {
  id: ProjectProcessStepId;
  nummer: number;
  label: string;
  titel: string;
  beschrijving: string;
  icon: LucideIcon;
  href: (projectId: string, traceId?: string) => string;
  /**
   * Schermindeling van de stap:
   * - 'kaart': kaart-centrisch (tekenen/assets) — kaart groot, paneel smal.
   * - 'breed': inhoud-/output-centrisch (calculatie, dossier) — paneel groot, kaart secundair.
   */
  layout: 'kaart' | 'breed';
}

function stapHref(projectId: string, stap: ProjectProcessStepId, traceId?: string): string {
  const params = new URLSearchParams({ stap });
  if (traceId) params.set('traceId', traceId);
  return `/project/${projectId}?${params.toString()}`;
}

export const PROJECT_PROCESS_STEPS: ProjectProcessStep[] = [
  {
    id: 'intake',
    nummer: 1,
    label: 'Stap 1',
    titel: 'Start',
    beschrijving: 'Projectoverzicht, tracés en voortgang',
    icon: FolderKanban,
    href: (p) => stapHref(p, 'intake'),
    layout: 'breed',
  },
  {
    id: 'trace',
    nummer: 2,
    label: 'Stap 2',
    titel: 'Tracé tekenen',
    beschrijving: 'Tracé op de GIS-kaart tekenen en routeren',
    icon: GitBranch,
    href: (p, t) => stapHref(p, 'trace', t),
    layout: 'kaart',
  },
  {
    id: 'bodem',
    nummer: 3,
    label: 'Stap 3',
    titel: 'Bodem & omgeving',
    beschrijving: 'Bodemvooronderzoek en omgevingssignalen (NEN 5725)',
    icon: Mountain,
    href: (p) => stapHref(p, 'bodem'),
    layout: 'kaart',
  },
  {
    id: 'netontwerp',
    nummer: 4,
    label: 'Stap 4',
    titel: 'Netontwerp',
    beschrijving: 'Belastingen, kabelkeuze, stations en assets',
    icon: Network,
    href: (p) => stapHref(p, 'netontwerp'),
    layout: 'kaart',
  },
  {
    id: 'engineering',
    nummer: 5,
    label: 'Stap 5',
    titel: 'Engineering & toetsing',
    beschrijving: 'Conflictdetectie, berekeningen, tekeningen en bemating',
    icon: Wrench,
    href: (p) => stapHref(p, 'engineering'),
    layout: 'breed',
  },
  {
    id: 'planning',
    nummer: 6,
    label: 'Stap 6',
    titel: 'Planning',
    beschrijving: 'Activiteiten, milestones en Gantt-overzicht',
    icon: CalendarDays,
    href: (p) => stapHref(p, 'planning'),
    layout: 'breed',
  },
  {
    id: 'dossier',
    nummer: 7,
    label: 'Stap 7',
    titel: 'Dossier',
    beschrijving: 'Documenten, tekeningen, rapporten en startbesluit',
    icon: FolderOpen,
    href: (p) => stapHref(p, 'dossier'),
    layout: 'breed',
  },
];

export const PROJECT_PROCESS_STEP_IDS = PROJECT_PROCESS_STEPS.map((s) => s.id);

/** Bepaalt de actieve stap uit de `stap`-query (met fallback op intake). */
export function resolveProjectProcessStep(stap?: string | null): ProjectProcessStepId {
  if (stap && (PROJECT_PROCESS_STEP_IDS as string[]).includes(stap)) {
    return stap as ProjectProcessStepId;
  }
  return 'intake';
}

export function extractProjectIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/project\/([^/]+)/);
  if (match) return match[1];
  const rapportMatch = pathname.match(/^\/rapportage\/([^/]+)/);
  return rapportMatch?.[1] ?? null;
}

/** Tracé-id uit de oude pad-vorm (`/trace/[id]`); cockpit gebruikt `?traceId=`. */
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
