'use server';

import { completeActionById } from '@/lib/services/action-completion';
import { getResolvedActionById } from '@/lib/services/action-store';

export async function completeActionAction(actionId: string) {
  const ok = completeActionById(actionId);
  return { ok, action: getResolvedActionById(actionId) ?? null };
}

export async function getActionAction(actionId: string) {
  return getResolvedActionById(actionId) ?? null;
}
