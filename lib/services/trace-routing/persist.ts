import type { TraceSegment } from '@/demo/roads';
import type { RouteSegmentAnalysis, TraceRouteAlternative, TraceRoutingResult } from './types';

export function routingSegmentsToTraceSegmenten(
  segments: RouteSegmentAnalysis[]
): TraceSegment[] {
  return segments.map((s) => ({
    volgorde: s.volgorde,
    wegId: s.wegnaam
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || `seg-${s.volgorde}`,
    wegnaam: s.wegnaam,
    leglocatie: s.leglocatie,
    legtechniek: s.legtechniek,
    lengteM: s.lengteM,
    kruisingen: s.kruisingen,
    afwijkingen: s.afwijkingen,
  }));
}

export function alternativeToRoutingResult(
  alt: TraceRouteAlternative,
  base: Pick<TraceRoutingResult, 'normReferenties' | 'samenvatting' | 'aiToelichting' | 'aiBron' | 'alternatieven'>
): TraceRoutingResult {
  return {
    id: alt.id,
    label: alt.label,
    traceLines: alt.traceLines,
    coordinates: alt.coordinates,
    segmenten: alt.segmenten,
    totaleLengteM: alt.totaleLengteM,
    score: alt.score,
    samenvatting: base.samenvatting,
    waarschuwingen: alt.waarschuwingen,
    blokkades: alt.blokkades,
    normReferenties: base.normReferenties,
    aiToelichting: base.aiToelichting,
    aiBron: base.aiBron,
    alternatieven: base.alternatieven,
    geselecteerdeAlternativeId: alt.id,
  };
}

export interface SavedRoutingMetadata {
  score: number;
  totaleLengteM: number;
  waarschuwingen: string[];
  blokkades: string[];
  alternativeId: string;
  alternativeLabel: string;
  berekendOp: string;
  aiToelichting?: string;
}

export function routingResultToSavedMetadata(
  result: TraceRoutingResult,
  alternativeId: string
): SavedRoutingMetadata {
  const alt = result.alternatieven?.find((a) => a.id === alternativeId);
  return {
    score: alt?.score ?? result.score,
    totaleLengteM: alt?.totaleLengteM ?? result.totaleLengteM,
    waarschuwingen: alt?.waarschuwingen ?? result.waarschuwingen,
    blokkades: alt?.blokkades ?? result.blokkades,
    alternativeId,
    alternativeLabel: alt?.label ?? result.label ?? 'Aanbevolen',
    berekendOp: new Date().toISOString(),
    aiToelichting: result.aiToelichting,
  };
}
