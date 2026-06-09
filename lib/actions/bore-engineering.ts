'use server';

import { getTrace } from '@/lib/db/store';
import { runBoreEngineering, heeftSleuflozeSegmenten, sleuflozeSegmenten } from '@/lib/bore';
import { generateBoreDrawings } from '@/lib/drawings/bore-index';
import type { BoreEngineeringResult } from '@/lib/bore/types';
import type { DrawingResult } from '@/lib/drawings/types';
import { saveBoreEngineeringToDossier } from '@/lib/dossier/store';

export async function getSleuflozeSegmentenAction(traceId: string) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  return sleuflozeSegmenten(trace).map((s) => ({
    volgorde: s.volgorde,
    wegnaam: s.wegnaam,
    legtechniek: s.legtechniek,
    lengteM: s.lengteM,
  }));
}

export async function runBoorengineeringAction(
  traceId: string,
  selectedVolgordes?: number[],
): Promise<BoreEngineeringResult> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  if (!heeftSleuflozeSegmenten(trace)) {
    throw new Error('Geen sleufloze segmenten (HDD/persing/sleufloos) op dit tracé');
  }
  const result = runBoreEngineering(trace, selectedVolgordes);
  saveBoreEngineeringToDossier(trace.projectId, traceId, trace.code, result);
  return result;
}

export async function generateBoorTekeningenAction(
  traceId: string,
  engineering: BoreEngineeringResult,
): Promise<DrawingResult[]> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  return generateBoreDrawings(trace, engineering);
}

export async function runVolledigeBoorengineeringAction(
  traceId: string,
  selectedVolgordes?: number[],
): Promise<{ engineering: BoreEngineeringResult; tekeningen: DrawingResult[] }> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const engineering = await runBoorengineeringAction(traceId, selectedVolgordes);
  const tekeningen = await generateBoorTekeningenAction(traceId, engineering);
  const { saveTekeningenToDossier } = await import('@/lib/dossier/store');
  saveTekeningenToDossier(trace.projectId, traceId, tekeningen);
  return { engineering, tekeningen };
}
