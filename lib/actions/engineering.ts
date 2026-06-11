'use server';

import { getTrace, getBestaandNet, getProject } from '@/lib/db/store';
import { runCalculations } from '@/lib/calc';
import { generateDrawings } from '@/lib/drawings';
import {
  generateOnderzoeken,
  generateAanvragen,
  generateVergunningChecklist,
} from '@/lib/research/generator';
import { anthropicComplete } from '@/lib/connectors/ai/anthropic';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { generateDoDocument } from '@/lib/dossier/do-document';
import { getProjectSummary } from '@/lib/services/project-stats';
import {
  saveBerekeningenToDossier,
  saveTekeningenToDossier,
  saveOnderzoekenToDossier,
  saveAanvragenToDossier,
  saveAiAnalyseToDossier,
  saveVergunningChecklistToDossier,
  saveDoDocumentToDossier,
  getDossierItems,
  buildFullDossierSummary,
} from '@/lib/dossier/store';
import { onderzoekCheckAction } from '@/lib/actions/process';
import {
  completeActionsForTraceStep,
  completeActionsForOnderzoekType,
  completeAllOpenActionsForTrace,
} from '@/lib/services/action-completion';

export async function runBerekeningenAction(traceId: string, actionId?: string) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const resultaten = runCalculations(trace);
  saveBerekeningenToDossier(trace.projectId, traceId, trace.code, resultaten);
  completeActionsForTraceStep(traceId, 'berekenen', actionId);
  return resultaten;
}

export async function generateTekeningenAction(traceId: string, actionId?: string) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const net = await getBestaandNet();
  const tekeningen = generateDrawings(trace, net);
  saveTekeningenToDossier(trace.projectId, traceId, tekeningen);
  completeActionsForTraceStep(traceId, 'tekenen', actionId);
  return tekeningen;
}

export async function generateOnderzoekenAction(
  traceId: string,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[],
  actionId?: string
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const onderzoeken = await generateOnderzoeken(trace, collected, conflicten);
  saveOnderzoekenToDossier(trace.projectId, traceId, onderzoeken);
  for (const o of onderzoeken) {
    completeActionsForOnderzoekType(traceId, o.type, actionId);
  }
  return onderzoeken;
}

export async function generateAanvragenAction(
  traceId: string,
  collected?: CollectedTraceData,
  actionId?: string
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const aanvragen = generateAanvragen(trace, collected);
  saveAanvragenToDossier(trace.projectId, traceId, aanvragen);
  completeActionsForTraceStep(traceId, 'aanvragen', actionId);
  return aanvragen;
}

export async function generateVergunningChecklistAction(
  traceId: string,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[],
  actionId?: string
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const checklist = generateVergunningChecklist(trace, collected, conflicten);
  saveVergunningChecklistToDossier(trace.projectId, traceId, trace.code, checklist);
  completeActionsForTraceStep(traceId, 'vergunning_checklist', actionId);
  return checklist;
}

export async function aiAnalyseAction(
  traceId: string,
  conflicten: DetectedConflict[]
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');

  const context = conflicten
    .map((c) => `[${c.ernst}] ${c.type}: ${c.toelichting}`)
    .join('\n');

  const result = await anthropicComplete({
    maxTokens: 4096,
    system:
      'Je bent een Nederlandse engineering-assistent voor ondergrondse infrastructuur. ' +
      'Gebruik vakterminologie (tracé, dekking, NEN-normen). Antwoord in het Nederlands, beknopt en actionable.',
    prompt: `Analyseer de volgende conflicten voor tracé ${trace.code} (${trace.naam}) en geef begrijpelijke samenvatting + oplossingsrichtingen:\n${context}`,
  });

  saveAiAnalyseToDossier(trace.projectId, traceId, trace.code, result.text, result._source);
  return result;
}

export async function generateVolledigDossierAction(
  traceId: string,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
) {
  const berekeningen = await runBerekeningenAction(traceId);
  const tekeningen = await generateTekeningenAction(traceId);
  const onderzoeken = await generateOnderzoekenAction(traceId, collected, conflicten);
  const aanvragen = await generateAanvragenAction(traceId, collected);
  const checklist = await generateVergunningChecklistAction(traceId, collected, conflicten);
  const ai = conflicten?.length
    ? await aiAnalyseAction(traceId, conflicten)
    : null;

  const trace = (await getTrace(traceId))!;
  const summary = buildFullDossierSummary(trace.projectId, traceId, conflicten ?? []);

  completeAllOpenActionsForTrace(traceId);

  return { berekeningen, tekeningen, onderzoeken, aanvragen, checklist, ai, summary };
}

export async function getDossierAction(projectId: string, traceId?: string) {
  return getDossierItems(projectId, traceId);
}

export async function generateDoDocumentAction(projectId: string) {
  const project = await getProject(projectId);
  if (!project) throw new Error('Project niet gevonden');
  const summary = await getProjectSummary(project);
  const items = getDossierItems(projectId);
  const inhoud = generateDoDocument(project, summary, items);
  const doc = saveDoDocumentToDossier(projectId, inhoud);
  return { inhoud, doc };
}

export async function runAlleOnderzoekenEnProcessenAction(
  traceId: string,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
) {
  await onderzoekCheckAction(traceId, collected, conflicten);
  const onderzoeken = await generateOnderzoekenAction(traceId, collected, conflicten);
  const aanvragen = await generateAanvragenAction(traceId, collected);
  const checklist = await generateVergunningChecklistAction(traceId, collected, conflicten);
  const berekeningen = await runBerekeningenAction(traceId);
  const tekeningen = await generateTekeningenAction(traceId);
  const ai = conflicten?.length
    ? await aiAnalyseAction(traceId, conflicten)
    : null;

  completeAllOpenActionsForTrace(traceId);

  return { onderzoeken, aanvragen, checklist, berekeningen, tekeningen, ai };
}

/** Stel de uitvoeringsmap samen: bundel + compleetheidstoets, opgeslagen in het dossier. */
export async function stelUitvoeringsmapSamenAction(traceId: string): Promise<{
  compleet: boolean;
  ontbrekend: string[];
  naam: string;
}> {
  const { getTrace, getBestaandNet } = await import('@/lib/db/store');
  const { saveUitvoeringsmapToDossier } = await import('@/lib/dossier/uitvoeringsmap');
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const bestaandNet = await getBestaandNet();
  const result = saveUitvoeringsmapToDossier(trace, bestaandNet);
  return { compleet: result.compleet, ontbrekend: result.ontbrekend, naam: result.item.naam };
}
