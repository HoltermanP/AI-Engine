import { looksLikeRdNl, looksLikeWgs84Nl, wgs84ToRd } from '@/lib/geo';

function firstGeometryCoord(geometry: GeoJSON.Geometry): [number, number] | null {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates[0], geometry.coordinates[1]];
    case 'LineString':
      return geometry.coordinates[0]
        ? [geometry.coordinates[0][0], geometry.coordinates[0][1]]
        : null;
    case 'Polygon':
      return geometry.coordinates[0]?.[0]
        ? [geometry.coordinates[0][0][0], geometry.coordinates[0][0][1]]
        : null;
    case 'MultiPolygon':
      return geometry.coordinates[0]?.[0]?.[0]
        ? [geometry.coordinates[0][0][0][0], geometry.coordinates[0][0][0][1]]
        : null;
    default:
      return null;
  }
}

/** Bewaar PDOK CRS84/WGS84 ongewijzigd; normaliseer alleen RD-demo naar RD. */
export function geometryPreserveMixedCrs(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  const c = firstGeometryCoord(geometry);
  if (c && looksLikeWgs84Nl(c[0], c[1])) return geometry;
  return ensureRdGeometry(geometry);
}

export function ensureRdPosition(x: number, y: number): [number, number] {
  if (looksLikeRdNl(x, y)) return [x, y];
  if (looksLikeWgs84Nl(x, y)) return wgs84ToRd(x, y);
  return [x, y];
}

/** BRK/PDOK-features met expliciet RD — geen heuristische WGS84-detectie. */
export function ensureRdPositionFromPdok(x: number, y: number): [number, number] {
  return [x, y];
}

export function ensureRdRing(ring: [number, number][]): [number, number][] {
  return ring.map(([x, y]) => ensureRdPosition(x, y));
}

export function ensureRdLine(line: [number, number][]): [number, number][] {
  return line.map(([x, y]) => ensureRdPosition(x, y));
}

export function ensureRdGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  switch (geometry.type) {
    case 'Point':
      return {
        type: 'Point',
        coordinates: ensureRdPosition(geometry.coordinates[0], geometry.coordinates[1]),
      };
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: geometry.coordinates.map((c) => ensureRdPosition(c[0], c[1])),
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
