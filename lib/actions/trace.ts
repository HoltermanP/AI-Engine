'use server';

import { collectTraceData, type CollectedTraceData } from '@/lib/services/collect-trace-data';
import { detectConflicts, type DetectedConflict } from '@/lib/services/conflict-detection';
import type { BodemGebiedType, BodemRisicoklasse } from '@/lib/services/bodem-risico/types';
import { normalizeTraceCoordinates } from '@/lib/trace-edit';
import { getTrace, persistTraceToets } from '@/lib/db/store';
import {
  toetsStatusFromConflicts,
  traceGeometryFingerprint,
  type PersistedTraceToets,
} from '@/lib/services/trace-toets';
import { enqueueCollectJob } from '@/lib/jobs/qstash';

export async function collectTraceDataAction(
  traceId: string
): Promise<{ data: CollectedTraceData; jobMode: 'async' | 'sync' }> {
  const job = await enqueueCollectJob(traceId);

  if (job.mode === 'async') {
    // QStash verwerkt async; voor nu ook direct uitvoeren zodat UI data heeft
    const data = await collectTraceData(traceId);
    return { data, jobMode: 'async' };
  }

  const data = await collectTraceData(traceId);
  return { data, jobMode: 'sync' };
}

export async function toetsTraceAction(
  traceId: string,
  collected?: CollectedTraceData,
  traceCoordinates?: [number, number, number?][]
): Promise<DetectedConflict[]> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error(`Tracé ${traceId} niet gevonden`);

  const data = collected ?? (await collectTraceData(traceId));
  const coordinates = traceCoordinates ?? trace.coordinates;
  const normalized = normalizeTraceCoordinates(coordinates);

  const conflicten = detectConflicts({
    traceId,
    traceCoordinates: normalized,
    traceLines: trace.traceLines,
    vereisteDekking: trace.vereisteDekking,
    bestaandNet: data.bestaandNet,
    belemmeringen: data.belemmeringen,
    maaiveld: data.maaiveld,
    natura2000: data.natura2000,
    bodemRisico: data.vervuildeGrond
      ?.filter((l) => l.risicoklasse && l.gebiedType)
      .map((l) => ({
        id: l.id,
        bron: l.bron,
        naam: l.naam,
        status: l.status,
        polygon: l.polygon,
        x: l.x,
        y: l.y,
        risicoklasse: l.risicoklasse as BodemRisicoklasse,
        gebiedType: l.gebiedType as BodemGebiedType,
        afstandTraceM: l.afstandTraceM,
      })),
  });

  const persisted: PersistedTraceToets = {
    status: toetsStatusFromConflicts(conflicten),
    toetsedAt: new Date().toISOString(),
    geometryFingerprint: traceGeometryFingerprint(normalized),
    conflicten,
  };
  await persistTraceToets(traceId, persisted);

  return conflicten;
}
