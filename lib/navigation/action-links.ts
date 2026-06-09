import type { ProjectAction } from '@/demo/project-actions';
import { getResolvedActionById } from '@/lib/services/action-store';
import type { TracePhase } from '@/lib/process/phases';
import type { ProcessStepId } from '@/lib/process/workflow';

export interface ActionNavigationTarget {
  href: string;
  fase: TracePhase;
  stap?: ProcessStepId;
  label: string;
}

const TYPE_LABELS: Record<ProjectAction['type'], string> = {
  onderzoek: 'Onderzoek',
  vergunning: 'Vergunning',
  engineering: 'Engineering',
  review: 'Review',
  deadline: 'Deadline',
};

export function inferProcessStep(action: ProjectAction): ProcessStepId | undefined {
  const t = action.titel.toLowerCase();

  if (action.type === 'onderzoek') {
    if (t.includes('klic') || t.includes('k&l')) return 'kl_inventarisatie';
    if (t.includes('natura')) return 'quickscan_natura2000';
    if (t.includes('bodem')) return 'quickscan_bodem';
    if (t.includes('ecolog')) return 'quickscan_ecologie';
    if (t.includes('archeolog')) return 'quickscan_archeologie';
    if (t.includes('nge') || t.includes('ce')) return 'quickscan_nge';
    return 'onderzoek_check';
  }

  if (action.type === 'engineering') {
    if (t.includes('tekening') || t.includes('as-built') || t.includes('hdd-ontwerp')) {
      return 'tekenen';
    }
    return 'berekenen';
  }

  if (action.type === 'vergunning') {
    return t.includes('aanvra') ? 'aanvragen' : 'vergunning_checklist';
  }

  if (action.type === 'review') {
    return undefined;
  }

  if (action.type === 'deadline') {
    return 'dossier';
  }

  return undefined;
}

function inferTracePhase(action: ProjectAction, stap?: ProcessStepId): TracePhase {
  if (action.type === 'deadline') return 'output';

  if (action.type === 'review') {
    const t = action.titel.toLowerCase();
    if (t.includes('tracé') || t.includes('trace') || t.includes('concept')) return 'fase1';
    return 'fase2';
  }

  if (action.type === 'onderzoek' || action.type === 'vergunning') return 'fase4';

  if (action.type === 'engineering') {
    if (stap === 'tekenen') return 'fase3';
    return 'fase3';
  }

  return 'fase3';
}

export function getActionNavigationTarget(action: ProjectAction): ActionNavigationTarget {
  const stap = inferProcessStep(action);
  const fase = inferTracePhase(action, stap);

  if (!action.traceId) {
    const params = new URLSearchParams({ actie: action.id });
    return {
      href: `/project/${action.projectId}?${params}`,
      fase,
      stap,
      label: TYPE_LABELS[action.type],
    };
  }

  const params = new URLSearchParams({ fase, actie: action.id });
  if (stap) params.set('stap', stap);

  return {
    href: `/project/${action.projectId}/trace/${action.traceId}?${params}`,
    fase,
    stap,
    label: TYPE_LABELS[action.type],
  };
}

export function getActionHref(action: ProjectAction): string {
  return getActionNavigationTarget(action).href;
}

export function getProjectActionById(actionId: string): ProjectAction | undefined {
  return getResolvedActionById(actionId);
}

export function parseTracePhaseParam(value: string | null): TracePhase | null {
  const valid: TracePhase[] = ['fase1', 'fase2', 'fase3', 'fase4', 'output'];
  if (value && valid.includes(value as TracePhase)) return value as TracePhase;
  return null;
}

export function parseProcessStepParam(value: string | null): ProcessStepId | null {
  const valid: ProcessStepId[] = [
    'ontwerp',
    'data_verzamelen',
    'toets_trace',
    'onderzoek_check',
    'quickscan_bodem',
    'quickscan_natura2000',
    'quickscan_archeologie',
    'quickscan_ecologie',
    'quickscan_nge',
    'kl_inventarisatie',
    'berekenen',
    'tekenen',
    'vergunning_checklist',
    'aanvragen',
    'ai_analyse',
    'dossier',
  ];
  if (value && valid.includes(value as ProcessStepId)) return value as ProcessStepId;
  return null;
}
