'use server';

import {
  addDemoReferentieTraces,
  getDemoReferentieTraces,
  type DemoReferentieTrace,
} from '@/lib/db/demo-store';
import { looksLikeRdNl, wgs84ToRd } from '@/lib/geo';

function naarRd(coord: number[]): [number, number] {
  const [a, b] = coord;
  if (looksLikeRdNl(a, b)) return [a, b];
  return wgs84ToRd(a, b);
}

function lijnenUitGeometry(geom: GeoJSON.Geometry): [number, number][][] {
  if (geom.type === 'LineString') return [geom.coordinates.map(naarRd)];
  if (geom.type === 'MultiLineString') return geom.coordinates.map((l) => l.map(naarRd));
  return [];
}

export interface ReferentieTraceOverzicht {
  aantal: number;
  totaleLengteKm: number;
  bronnen: string[];
}

export async function listReferentieTracesAction(): Promise<ReferentieTraceOverzicht> {
  const traces = getDemoReferentieTraces();
  let lengteM = 0;
  for (const t of traces) {
    for (let i = 1; i < t.coordinates.length; i++) {
      lengteM += Math.hypot(
        t.coordinates[i][0] - t.coordinates[i - 1][0],
        t.coordinates[i][1] - t.coordinates[i - 1][1]
      );
    }
  }
  return {
    aantal: traces.length,
    totaleLengteKm: Math.round(lengteM / 100) / 10,
    bronnen: [...new Set(traces.map((t) => t.bron))],
  };
}

/**
 * Upload van eerder ontworpen tracés (GeoJSON, RD of WGS84). De lijnen worden
 * referentiecorridors: de automatische tracébepaling geeft routes die deze
 * ontwerpen volgen een sterke voorkeur — zo leert het systeem van de praktijk.
 */
export async function uploadReferentieTracesAction(
  bestandsnaam: string,
  geojsonText: string
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  let fc: GeoJSON.FeatureCollection;
  try {
    fc = JSON.parse(geojsonText) as GeoJSON.FeatureCollection;
  } catch {
    return { ok: false, error: 'Bestand is geen geldige JSON' };
  }
  if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    return { ok: false, error: 'Bestand is geen GeoJSON FeatureCollection' };
  }

  const bestaand = getDemoReferentieTraces().length;
  const items: DemoReferentieTrace[] = [];
  let volgnr = 0;
  for (const feature of fc.features) {
    if (!feature.geometry) continue;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    for (const line of lijnenUitGeometry(feature.geometry)) {
      if (line.length < 2) continue;
      volgnr++;
      items.push({
        id: `ref-${bestaand + volgnr}`,
        naam: (props.naam as string) ?? (props.name as string) ?? `Referentietracé ${bestaand + volgnr}`,
        bron: bestandsnaam,
        coordinates: line,
      });
    }
  }

  if (items.length === 0) {
    return { ok: false, error: 'Geen LineString/MultiLineString-geometrieën gevonden' };
  }
  addDemoReferentieTraces(items);
  return { ok: true, aantal: items.length };
}
