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
import {
  verrijkZroOverzicht,
  type EigenaarInfo,
} from '@/lib/services/trace-routing/zro';
import type { ZroPerceel } from '@/lib/services/trace-routing/types';
import type { TraceSegment } from '@/demo/roads';

const EIGENAAR_TYPES: ZroPerceel['eigenaarType'][] = [
  'particulier',
  'bedrijf',
  'gemeente',
  'overheid',
  'onbekend',
];

function normaliseerEigenaarType(raw: string): ZroPerceel['eigenaarType'] {
  const v = raw.toLowerCase();
  return EIGENAAR_TYPES.find((t) => t === v) ?? 'onbekend';
}

/**
 * Verrijk het ZRO-overzicht (resultaat + alternatieven) met BRK-eigenaardata.
 * De connector is demo-only zolang er geen BRK Inzage-credentials zijn; zonder
 * match blijven percelen 'eigenaar_onbekend' (gracieuze degradatie).
 */
async function verrijkRoutingMetEigenaars(
  result: TraceRoutingResult,
  waypoints: TraceRoutingInput['waypoints']
): Promise<TraceRoutingResult> {
  const heeftZro =
    (result.zroOverzicht?.percelen.length ?? 0) > 0 ||
    result.alternatieven?.some((a) => (a.zroOverzicht?.percelen.length ?? 0) > 0);
  if (!heeftZro) return result;

  try {
    const xs = waypoints.map((w) => w.x);
    const ys = waypoints.map((w) => w.y);
    const bbox = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
    const { brkEigenaarConnector } = await import('@/lib/connectors/brk/eigenaar');
    const res = await brkEigenaarConnector.fetch(bbox);
    const bron = res._source === 'live' ? ('live' as const) : ('demo' as const);
    const eigenaars: EigenaarInfo[] = res.percelen.map((p) => ({
      perceelnummer: p.perceelnummer,
      eigenaarType: normaliseerEigenaarType(p.eigenaarType),
      zakelijkRecht: p.zakelijkRecht,
    }));

    const verrijk = (o?: TraceRoutingResult['zroOverzicht']) =>
      o ? verrijkZroOverzicht(o, eigenaars, bron) : o;

    return {
      ...result,
      zroOverzicht: verrijk(result.zroOverzicht),
      alternatieven: result.alternatieven?.map((a) => ({
        ...a,
        zroOverzicht: verrijk(a.zroOverzicht),
      })),
    };
  } catch {
    // BRK tijdelijk onbereikbaar — overzicht blijft geometrisch (onbekend)
    return result;
  }
}

export async function planAutomaticTraceAction(
  input: TraceRoutingInput
): Promise<TraceRoutingResult> {
  const fetchedLayers = await fetchRoutingLayerData(input.waypoints);
  const enriched: TraceRoutingInput = {
    ...input,
    layerData: mergeRoutingLayerData(input.layerData, fetchedLayers),
  };
  const base = planAutomaticTrace(enriched);
  const metEigenaars = await verrijkRoutingMetEigenaars(base, enriched.waypoints);
  return refineTraceWithAi(enriched, metEigenaars);
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

  // Pand-guard: ook handmatig getekende of vertex-bewerkte tracés mogen nooit
  // onder bebouwing door. Toets tegen live BGT (pand + overig bouwwerk).
  try {
    const { fetchBebouwingVoorLijn } = await import(
      '@/lib/services/trace-routing/fetch-routing-layers'
    );
    const { segmentIntersectsPolygon } = await import('@/lib/geo');
    const bebouwing = await fetchBebouwingVoorLijn(coordinates.map(([x, y]) => ({ x, y })));
    let doorsnijdingen = 0;
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        if (
          bebouwing.some((pand) =>
            segmentIntersectsPolygon(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1], pand)
          )
        ) {
          doorsnijdingen++;
        }
      }
    }
    if (doorsnijdingen > 0) {
      return {
        ok: false,
        error: `Niet opgeslagen: tracé doorsnijdt bebouwing op ${doorsnijdingen} segment(en) — verleg de vertex(en) om het pand heen`,
      };
    }
  } catch {
    // Guard mag opslaan niet blokkeren als de BGT-dienst tijdelijk onbereikbaar is
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
