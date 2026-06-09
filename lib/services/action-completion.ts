import { revalidatePath } from 'next/cache';
import { DEMO_PROJECT_ACTIONS } from '@/demo/project-actions';
import { inferProcessStep } from '@/lib/navigation/action-links';
import type { ProcessStepId } from '@/lib/process/workflow';
import type { OnderzoekType } from '@/lib/research/types';
import { completeAction, resolveAction } from '@/lib/services/action-store';

const ONDERZOEK_TYPE_TO_STEP: Partial<Record<OnderzoekType, ProcessStepId>> = {
  bodem_nen5725: 'quickscan_bodem',
  natura2000: 'quickscan_natura2000',
  archeologie: 'quickscan_archeologie',
  ecologie_wnb: 'quickscan_ecologie',
  nge_ce: 'quickscan_nge',
  kl_inventarisatie: 'kl_inventarisatie',
};

function revalidateActionPaths(projectId?: string) {
  revalidatePath('/acties');
  revalidatePath('/dashboard');
  revalidatePath('/beheer');
  revalidatePath('/rapportage');
  if (projectId) {
    revalidatePath(`/project/${projectId}`);
    revalidatePath(`/rapportage/${projectId}`);
  }
}

export function completeActionsForTraceStep(
  traceId: string,
  stepId: ProcessStepId,
  actionId?: string
): string[] {
  const completed = new Set<string>();
  let projectId: string | undefined;

  for (const action of DEMO_PROJECT_ACTIONS) {
    if (action.traceId !== traceId) continue;
    if (resolveAction(action).status === 'afgerond') continue;
    if (inferProcessStep(action) === stepId) {
      completeAction(action.id);
      completed.add(action.id);
      projectId = action.projectId;
    }
  }

  if (actionId) {
    const linked = DEMO_PROJECT_ACTIONS.find((a) => a.id === actionId);
    if (linked?.traceId === traceId && resolveAction(linked).status !== 'afgerond') {
      completeAction(actionId);
      completed.add(actionId);
      projectId = linked.projectId;
    }
  }

  if (completed.size > 0) {
    revalidateActionPaths(projectId);
  }

  return [...completed];
}

export function completeActionsForOnderzoekType(
  traceId: string,
  type: OnderzoekType,
  actionId?: string
): string[] {
  const stepId = ONDERZOEK_TYPE_TO_STEP[type];
  if (!stepId) return actionId ? completeActionsForTraceStep(traceId, 'onderzoek_check', actionId) : [];
  return completeActionsForTraceStep(traceId, stepId, actionId);
}

export function completeAllOpenActionsForTrace(traceId: string): string[] {
  const completed: string[] = [];
  let projectId: string | undefined;

  for (const action of DEMO_PROJECT_ACTIONS) {
    if (action.traceId !== traceId) continue;
    if (resolveAction(action).status === 'afgerond') continue;
    completeAction(action.id);
    completed.push(action.id);
    projectId = action.projectId;
  }

  if (completed.length > 0) {
    revalidateActionPaths(projectId);
  }

  return completed;
}

export function completeActionById(actionId: string): boolean {
  const action = DEMO_PROJECT_ACTIONS.find((a) => a.id === actionId);
  if (!action || resolveAction(action).status === 'afgerond') return false;
  completeAction(actionId);
  revalidateActionPaths(action.projectId);
  return true;
}
