'use server';

import { getTrace } from '@/lib/db/store';
import { checkBenodigdeOnderzoeken } from '@/lib/process/onderzoek-check';
import { generateSingleOnderzoek } from '@/lib/research/generator';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { OnderzoekDocument, OnderzoekType } from '@/lib/research/types';
import { saveOnderzoekenToDossier } from '@/lib/dossier/store';
import { completeActionsForOnderzoekType, completeActionsForTraceStep } from '@/lib/services/action-completion';

export async function onderzoekCheckAction(
  traceId: string,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  return checkBenodigdeOnderzoeken(trace, collected, conflicten);
}

export async function quickscanAction(
  traceId: string,
  type: OnderzoekType,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[],
  actionId?: string
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const rapport = await generateSingleOnderzoek(type, trace, collected, conflicten);
  completeActionsForOnderzoekType(traceId, type, actionId);
  return rapport;
}

export async function saveOnderzoekAction(
  traceId: string,
  rapport: OnderzoekDocument,
  actionId?: string
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const saved = saveOnderzoekenToDossier(trace.projectId, traceId, [rapport]);
  completeActionsForOnderzoekType(traceId, rapport.type, actionId);
  return { dossierId: saved[0]?.id };
}

export async function onderzoekCheckCompleteAction(traceId: string, actionId?: string) {
  completeActionsForTraceStep(traceId, 'onderzoek_check', actionId);
}
