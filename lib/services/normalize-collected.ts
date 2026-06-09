import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import { COLLECTED_DATA_VERSION } from '@/lib/services/collect-trace-data';
import { looksLikeRdNl, looksLikeWgs84Nl, wgs84ToRd } from '@/lib/geo';
import {
  ensureRdPositionFromPdok,
  geometryPreserveMixedCrs,
} from '@/lib/services/normalize-layer-slice';

/**
 * Bewaar verzamelde data in RD (EPSG:28992).
 * Conversie naar WGS84 gebeurt uitsluitend bij kaartweergave in trace-map.
 */
export function normalizeCollectedTraceData(
  data: CollectedTraceData
): CollectedTraceData {
  return {
    ...data,
    dataVersion: COLLECTED_DATA_VERSION,
    coordinateSystem: 'EPSG:28992',
    bgt: data.bgt.map((f) => ({
      ...f,
      geometry: geometryPreserveMixedCrs(f.geometry),
    })),
    percelen: data.percelen.map((p) => ({
      ...p,
      polygon:
        p._source === 'live'
          ? p.polygon.map(([x, y]) => ensureRdPositionFromPdok(x, y))
          : ensureRdRing(p.polygon),
    })),
    nwb: data.nwb.map((w) => ({
      ...w,
      coordinates: ensureRdLine(w.coordinates),
    })),
    watergangen: data.watergangen.map((w) => ({
      ...w,
      coordinates: ensureRdLine(w.coordinates),
    })),
    belemmeringen: data.belemmeringen.map((b) => ({
      ...b,
      coordinates: ensureRdLine(b.coordinates),
    })),
    natura2000: data.natura2000.map((g) => ({
      ...g,
      polygon: ensureRdRing(g.polygon),
    })),
    vervuildeGrond: (data.vervuildeGrond ?? []).map((l) => ({
      ...l,
      polygon: l.polygon ? ensureRdRing(l.polygon) : undefined,
      x: l.x !== undefined && l.y !== undefined ? ensureRdPosition(l.x, l.y)[0] : l.x,
      y: l.x !== undefined && l.y !== undefined ? ensureRdPosition(l.x, l.y)[1] : l.y,
    })),
  };
}

function ensureRdPosition(x: number, y: number): [number, number] {
  if (looksLikeRdNl(x, y)) return [x, y];
  if (looksLikeWgs84Nl(x, y)) return wgs84ToRd(x, y);
  return [x, y];
}

function ensureRdRing(ring: [number, number][]): [number, number][] {
  return ring.map(([x, y]) => ensureRdPosition(x, y));
}

function ensureRdLine(line: [number, number][]): [number, number][] {
  return line.map(([x, y]) => ensureRdPosition(x, y));
}

function ensureRdGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  switch (geometry.type) {
    case 'Point':
      return {
        type: 'Point',
        coordinates: ensureRdPosition(geometry.coordinates[0], geometry.coordinates[1]),
      };
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: geometry.coordinates.map((c) =>
          ensureRdPosition(c[0], c[1])
        ),
      };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) =>
          ring.map((c) => ensureRdPosition(c[0], c[1]))
        ),
      };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((poly) =>
          poly.map((ring) => ring.map((c) => ensureRdPosition(c[0], c[1])))
        ),
      };
    default:
      return geometry;
  }
}

export function isCollectedDataCurrent(data: CollectedTraceData | null | undefined): boolean {
  return Boolean(data && data.dataVersion === COLLECTED_DATA_VERSION);
}
