'use server';

import {
  addDemoReferentieTraces,
  getDemoReferentieTraces,
  type DemoReferentieTrace,
} from '@/lib/db/demo-store';
import { looksLikeRdNl, looksLikeWgs84Nl, wgs84ToRd } from '@/lib/geo';
import { polylinesFromDxf } from '@/lib/connectors/cad/dxf-import';

/** Eén ruwe lijn vóór herprojectie: coördinaten in bronstelsel. */
interface RuweLijn {
  naam?: string;
  coords: number[][];
}

function naarRd(coord: number[]): [number, number] {
  const [a, b] = coord;
  if (looksLikeRdNl(a, b)) return [a, b];
  return wgs84ToRd(a, b);
}

/** Ligt het eerste punt herkenbaar in Nederland (RD of WGS84)? Anders geen geldige georeferentie. */
function lijktGeoref(coords: number[][]): boolean {
  const [a, b] = coords[0] ?? [];
  if (a === undefined || b === undefined) return false;
  return looksLikeRdNl(a, b) || looksLikeWgs84Nl(a, b);
}

function lijnenUitGeometry(geom: GeoJSON.Geometry, naam?: string): RuweLijn[] {
  if (geom.type === 'LineString') return [{ naam, coords: geom.coordinates }];
  if (geom.type === 'MultiLineString') return geom.coordinates.map((coords) => ({ naam, coords }));
  return [];
}

function ruweLijnenUitGeojson(geojsonText: string): RuweLijn[] | { error: string } {
  let fc: GeoJSON.FeatureCollection;
  try {
    fc = JSON.parse(geojsonText) as GeoJSON.FeatureCollection;
  } catch {
    return { error: 'Bestand is geen geldige JSON' };
  }
  if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    return { error: 'Bestand is geen GeoJSON FeatureCollection' };
  }
  const lijnen: RuweLijn[] = [];
  for (const feature of fc.features) {
    if (!feature.geometry) continue;
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const naam = (props.naam as string) ?? (props.name as string) ?? undefined;
    lijnen.push(...lijnenUitGeometry(feature.geometry, naam));
  }
  return lijnen;
}

function isDxf(bestandsnaam: string, inhoud: string): boolean {
  if (bestandsnaam.toLowerCase().endsWith('.dxf')) return true;
  // DXF begint doorgaans met "0\nSECTION" of bevat de ENTITIES-sectiemarker
  return /^\s*0\s*[\r\n]+\s*SECTION/.test(inhoud) || /[\r\n]\s*ENTITIES\s*[\r\n]/.test(inhoud);
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
 * Upload van eerder ontworpen tracés (GeoJSON of AutoCAD DXF, RD of WGS84). De
 * lijnen worden referentiecorridors: de automatische tracébepaling geeft routes
 * die deze ontwerpen volgen een sterke voorkeur — zo leert het systeem van de
 * praktijk. DWG eerst in AutoCAD als DXF exporteren (DXFOUT).
 */
export async function uploadReferentieTracesAction(
  bestandsnaam: string,
  inhoud: string
): Promise<{ ok: true; aantal: number } | { ok: false; error: string }> {
  let ruwLijnen: RuweLijn[];
  if (isDxf(bestandsnaam, inhoud)) {
    ruwLijnen = polylinesFromDxf(inhoud).map((l) => ({ naam: l.naam, coords: l.coordinates }));
    if (ruwLijnen.length === 0) {
      return { ok: false, error: 'Geen LINE/LWPOLYLINE/POLYLINE-geometrie in de DXF gevonden' };
    }
  } else {
    const parsed = ruweLijnenUitGeojson(inhoud);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    ruwLijnen = parsed;
  }

  // Filter op geldige lijnen en valideer georeferentie (anders stille onzin)
  const bruikbaar = ruwLijnen.filter((l) => l.coords.length >= 2);
  if (bruikbaar.length === 0) {
    return { ok: false, error: 'Geen lijngeometrie met minimaal 2 punten gevonden' };
  }
  if (!bruikbaar.some((l) => lijktGeoref(l.coords))) {
    return {
      ok: false,
      error:
        'Coördinaten liggen niet herkenbaar in Nederland (RD/Rijksdriehoek of WGS84). ' +
        'Exporteer of georefereer het ontwerp in RD (EPSG:28992).',
    };
  }

  const bestaand = getDemoReferentieTraces().length;
  const items: DemoReferentieTrace[] = [];
  let volgnr = 0;
  for (const lijn of bruikbaar) {
    if (!lijktGeoref(lijn.coords)) continue;
    volgnr++;
    items.push({
      id: `ref-${bestaand + volgnr}`,
      naam: lijn.naam ?? `Referentietracé ${bestaand + volgnr}`,
      bron: bestandsnaam,
      coordinates: lijn.coords.map(naarRd),
    });
  }

  if (items.length === 0) {
    return { ok: false, error: 'Geen geldig georefereerde lijnen gevonden' };
  }
  addDemoReferentieTraces(items);
  return { ok: true, aantal: items.length };
}
