import { looksLikeRdNl, looksLikeWgs84Nl, wgs84ToRd } from '@/lib/geo';
import { etrs89ToRd } from './etrs89';

function firstCoord(geometry: GeoJSON.Geometry): [number, number] | null {
  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates;
    return [x, y];
  }
  if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
    const [x, y] = geometry.coordinates[0];
    return [x, y];
  }
  if (geometry.type === 'Polygon' && geometry.coordinates[0]?.[0]) {
    const [x, y] = geometry.coordinates[0][0];
    return [x, y];
  }
  if (geometry.type === 'MultiPolygon' && geometry.coordinates[0]?.[0]?.[0]) {
    const [x, y] = geometry.coordinates[0][0][0];
    return [x, y];
  }
  return null;
}

function geometryUsesRd(geometry: GeoJSON.Geometry): boolean {
  const sample = firstCoord(geometry);
  if (!sample) return true;
  return looksLikeRdNl(sample[0], sample[1]);
}

function toRd(x: number, y: number, alreadyRd: boolean): [number, number] {
  if (alreadyRd || looksLikeRdNl(x, y)) return [x, y];
  if (looksLikeWgs84Nl(x, y)) return wgs84ToRd(x, y);
  return etrs89ToRd(x, y);
}

export function polygonRingFromGeometry(geometry: GeoJSON.Geometry): [number, number][] {
  const rd = geometryUsesRd(geometry);
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0].map(([x, y]) => toRd(x, y, rd));
  }
  if (geometry.type === 'MultiPolygon' && geometry.coordinates[0]?.[0]) {
    return geometry.coordinates[0][0].map(([x, y]) => toRd(x, y, rd));
  }
  return [];
}

export function pointFromGeometry(geometry: GeoJSON.Geometry): [number, number] | null {
  const rd = geometryUsesRd(geometry);
  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates;
    return toRd(x, y, rd);
  }
  if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
    const [x, y] = geometry.coordinates[0];
    return toRd(x, y, rd);
  }
  const ring = polygonRingFromGeometry(geometry);
  return ring[0] ?? null;
}
