import type { ActionStatus, ProjectAction } from '@/demo/project-actions';
import { DEMO_PROJECT_ACTIONS } from '@/demo/project-actions';

export interface ActionOverride {
  status: ActionStatus;
  afgerondOp?: string;
}

const actionOverrides = new Map<string, ActionOverride>();

export function resolveAction(action: ProjectAction): ProjectAction {
  const override = actionOverrides.get(action.id);
  if (!override) return action;
  return { ...action, ...override };
}

export function resolveAllActions(actions: ProjectAction[] = DEMO_PROJECT_ACTIONS): ProjectAction[] {
  return actions.map(resolveAction);
}

export function getResolvedActionById(actionId: string): ProjectAction | undefined {
  const action = DEMO_PROJECT_ACTIONS.find((a) => a.id === actionId);
  return action ? resolveAction(action) : undefined;
}

export function setActionStatus(actionId: string, status: ActionStatus): ProjectAction | null {
  const action = DEMO_PROJECT_ACTIONS.find((a) => a.id === actionId);
  if (!action) return null;

  const override: ActionOverride = {
    status,
    afgerondOp: status === 'afgerond' ? new Date().toISOString().slice(0, 10) : undefined,
  };
  actionOverrides.set(actionId, override);
  return resolveAction(action);
}

export function completeAction(actionId: string): ProjectAction | null {
  return setActionStatus(actionId, 'afgerond');
}
