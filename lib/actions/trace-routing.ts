'use server';

import {
  planAutomaticTrace,
  refineTraceWithAi,
  routingSegmentsToTraceSegmenten,
  routingResultToSavedMetadata,
  type TraceRoutingInput,
  type TraceRoutingResult,
} from '@/lib/services/trace-routing';
import {
  fetchRoutingLayerData,
  mergeRoutingLayerData,
} from '@/lib/services/trace-routing/fetch-routing-layers';
import { saveTraceGeometry } from '@/lib/db/store';
import { traceLengthM } from '@/lib/geo';
import type { TraceSegment } from '@/demo/roads';

export async function planAutomaticTraceAction(
  input: TraceRoutingInput
): Promise<TraceRoutingResult> {
  const fetchedLayers = await fetchRoutingLayerData(input.waypoints);
  const enriched: TraceRoutingInput = {
    ...input,
    layerData: mergeRoutingLayerData(input.layerData, fetchedLayers),
  };
  const base = planAutomaticTrace(enriched);
  return refineTraceWithAi(enriched, base);
}

export async function saveAutoTraceAction(
  traceLegacyId: string,
  result: TraceRoutingResult,
  alternativeId?: string
): Promise<
  { ok: true; traceId: string; trace: import('@/demo/traces').DemoTrace } | { ok: false; error: string }
> {
  const altId = alternativeId ?? result.geselecteerdeAlternativeId ?? result.id ?? 'aanbevolen';
  const alt = result.alternatieven?.find((a) => a.id === altId);

  const traceLines = alt?.traceLines ?? result.traceLines;
  const coordinates = alt?.coordinates ?? result.coordinates;
  const segmenten = routingSegmentsToTraceSegmenten(alt?.segmenten ?? result.segmenten);

  const primaryWeg = segmenten[0]?.wegnaam;
  const primaryLeg = segmenten[0]?.leglocatie;

  const saved = await saveTraceGeometry({
    traceLegacyId,
    coordinates,
    traceLines,
    segmenten,
    wegnaam: primaryWeg,
    leglocatie: primaryLeg?.replace(/_/g, ' '),
    autoRouting: routingResultToSavedMetadata(result, altId),
  });

  if (!saved.ok) return saved;
  return { ok: true, traceId: traceLegacyId, trace: saved.trace };
}

function segmentenFromTraceLines(
  traceLines: [number, number, number][][],
  wegnaam?: string
): TraceSegment[] {
  return traceLines
    .filter((line) => line.length >= 2)
    .map((line, index) => ({
      volgorde: index + 1,
      wegId: `handmatig-${index + 1}`,
      wegnaam: wegnaam || 'Handmatig getekend',
      leglocatie: 'berm' as const,
      legtechniek: 'open_ontgraving' as const,
      lengteM: traceLengthM(line, [line]),
    }));
}

/** Sla huidige kaartgeometrie op (handmatig getekend of bewerkt). */
export async function saveManualTraceAction(
  traceLegacyId: string,
  coordinates: [number, number, number][],
  traceLines: [number, number, number][][],
  wegnaam?: string
): Promise<
  { ok: true; traceId: string; trace: import('@/demo/traces').DemoTrace } | { ok: false; error: string }
> {
  const validLines = traceLines.filter((line) => line.length >= 2);
  const lines = validLines.length > 0 ? validLines : coordinates.length >= 2 ? [coordinates] : [];

  if (lines.length === 0) {
    return { ok: false, error: 'Geen geldige tracégeometrie om op te slaan (minimaal 2 punten)' };
  }

  const flatCoords = lines.flat();
  const saved = await saveTraceGeometry({
    traceLegacyId,
    coordinates: flatCoords,
    traceLines: lines,
    segmenten: segmentenFromTraceLines(lines, wegnaam),
  });

  if (!saved.ok) return saved;
  return { ok: true, traceId: traceLegacyId, trace: saved.trace };
}
