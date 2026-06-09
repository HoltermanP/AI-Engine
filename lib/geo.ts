import proj4 from 'proj4';
import type { BboxQuery } from '@/lib/connectors/types';

proj4.defs(
  'EPSG:28992',
  '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.04,49.71,465.84,1.9342,-1.6672,9.1019,-4.0725 +units=m +no_defs'
);

export function rdToWgs84(x: number, y: number): [number, number] {
  const [lon, lat] = proj4('EPSG:28992', 'EPSG:4326', [x, y]);
  return [lon, lat];
}

export function wgs84ToRd(lon: number, lat: number): [number, number] {
  const [x, y] = proj4('EPSG:4326', 'EPSG:28992', [lon, lat]);
  return [x, y];
}

function rdCoordsToGeo(
  coordinates: [number, number, number?][]
): GeoJSON.Position[] {
  return coordinates.map(([x, y, z]) => {
    const [lon, lat] = rdToWgs84(x, y);
    return z !== undefined ? [lon, lat, z] : [lon, lat];
  });
}

export function lineRdToGeoJson(
  coordinates: [number, number, number?][]
): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: rdCoordsToGeo(coordinates),
  };
}

export function linesRdToGeoJson(
  lines: [number, number, number?][][]
): GeoJSON.MultiLineString | GeoJSON.LineString {
  const geoLines = lines.filter((l) => l.length >= 2).map(rdCoordsToGeo);
  if (geoLines.length === 0) {
    return { type: 'LineString', coordinates: [] };
  }
  if (geoLines.length === 1) {
    return { type: 'LineString', coordinates: geoLines[0] };
  }
  return { type: 'MultiLineString', coordinates: geoLines };
}

export function pointRdToGeoJson(x: number, y: number): GeoJSON.Point {
  const [lon, lat] = rdToWgs84(x, y);
  return { type: 'Point', coordinates: [lon, lat] };
}

function rdCoordToWgs84(coord: number[]): number[] {
  const [lon, lat] = rdToWgs84(coord[0], coord[1]);
  return coord.length > 2 ? [lon, lat, coord[2]] : [lon, lat];
}

export function polygonRdToGeoJson(polygon: [number, number][]): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [polygon.map(([x, y]) => rdToWgs84(x, y))],
  };
}

/** RD-coördinaten: x > 1000, y > 100000 (Nederland). Anders WGS84 (lon/lat). */
export function isRdCoord(x: number, y: number): boolean {
  return looksLikeRdNl(x, y);
}

/** RD EPSG:28992 binnen Nederlandse grenzen. */
export function looksLikeRdNl(x: number, y: number): boolean {
  return x > 10_000 && x < 280_000 && y > 300_000 && y < 630_000;
}

/** WGS84 lon/lat binnen Nederland. */
export function looksLikeWgs84Nl(x: number, y: number): boolean {
  return x >= 3 && x <= 8 && y >= 50 && y <= 54;
}

export function coordToMapPosition(x: number, y: number, z?: number): GeoJSON.Position {
  if (looksLikeWgs84Nl(x, y)) {
    return z !== undefined ? [x, y, z] : [x, y];
  }
  const [lon, lat] = rdToWgs84(x, y);
  return z !== undefined ? [lon, lat, z] : [lon, lat];
}

function positionsForMap(coords: number[][]): GeoJSON.Position[] {
  return coords.map((c) => coordToMapPosition(c[0], c[1], c[2]));
}

function firstCoord(geometry: GeoJSON.Geometry): [number, number] | null {
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

/** Converteer lijn/polygon naar WGS84 voor MapLibre — detecteert RD vs WGS84 per punt. */
export function lineForMap(
  coordinates: [number, number, number?][]
): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: coordinates.map(([x, y, z]) => coordToMapPosition(x, y, z)),
  };
}

export function lineToMapGeoJson(
  coordinates: [number, number, number?][]
): GeoJSON.LineString {
  return lineForMap(coordinates);
}

export function polygonForMap(polygon: [number, number][]): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [polygon.map(([x, y]) => coordToMapPosition(x, y))],
  };
}

export function polygonToMapGeoJson(polygon: [number, number][]): GeoJSON.Polygon {
  return polygonForMap(polygon);
}

export function pointToMapGeoJson(x: number, y: number): GeoJSON.Point {
  return { type: 'Point', coordinates: coordToMapPosition(x, y) };
}

export function geometryForMap(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: coordToMapPosition(geometry.coordinates[0], geometry.coordinates[1], geometry.coordinates[2]) };
    case 'LineString':
      return { type: 'LineString', coordinates: positionsForMap(geometry.coordinates) };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => positionsForMap(ring)),
      };
    case 'MultiLineString':
      return {
        type: 'MultiLineString',
        coordinates: geometry.coordinates.map((line) => positionsForMap(line)),
      };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((poly) =>
          poly.map((ring) => positionsForMap(ring))
        ),
      };
    case 'GeometryCollection':
      return {
        type: 'GeometryCollection',
        geometries: geometry.geometries.map(geometryForMap),
      };
    default:
      return geometry;
  }
}

/** @deprecated Gebruik geometryForMap — behoudt alias voor bestaande aanroepen. */
export function geometryToMapGeoJson(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  return geometryForMap(geometry);
}

export function geometryRdToGeoJson(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
  switch (geometry.type) {
    case 'Point':
      return { type: 'Point', coordinates: rdCoordToWgs84(geometry.coordinates) };
    case 'LineString':
      return {
        type: 'LineString',
        coordinates: geometry.coordinates.map(rdCoordToWgs84),
      };
    case 'Polygon':
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) => ring.map(rdCoordToWgs84)),
      };
    case 'MultiPolygon':
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((poly) =>
          poly.map((ring) => ring.map(rdCoordToWgs84))
        ),
      };
    default:
      return geometry;
  }
}

export function bboxRdToWgs84(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}): [number, number, number, number] {
  const [minLon, minLat] = rdToWgs84(bbox.minX, bbox.minY);
  const [maxLon, maxLat] = rdToWgs84(bbox.maxX, bbox.maxY);
  return [minLon, minLat, maxLon, maxLat];
}

export function traceBbox(
  coordinates: [number, number, number?][],
  padding = 200,
  traceLines?: [number, number, number?][][]
): BboxQuery {
  const points =
    traceLines?.flat().length ? traceLines.flat() : coordinates;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

export function traceLengthM(
  coordinates: [number, number, number?][],
  traceLines?: [number, number, number?][][]
): number {
  const segments =
    traceLines?.filter((line) => line.length >= 2) ??
    (coordinates.length >= 2 ? [coordinates] : []);
  let length = 0;
  for (const line of segments) {
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i];
      length += Math.hypot(x2 - x1, y2 - y1);
    }
  }
  return Math.round(length);
}

function distPointSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function minDistLineToLine(
  lineA: [number, number][],
  lineB: [number, number][]
): number {
  let min = Infinity;
  for (const [px, py] of lineA) {
    for (let i = 1; i < lineB.length; i++) {
      const d = distPointSegment(px, py, lineB[i - 1][0], lineB[i - 1][1], lineB[i][0], lineB[i][1]);
      min = Math.min(min, d);
    }
  }
  for (const [px, py] of lineB) {
    for (let i = 1; i < lineA.length; i++) {
      const d = distPointSegment(px, py, lineA[i - 1][0], lineA[i - 1][1], lineA[i][0], lineA[i][1]);
      min = Math.min(min, d);
    }
  }
  return min === Infinity ? 999 : min;
}

function cross(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: [number, number], b: [number, number], c: [number, number]): boolean {
  return (
    Math.min(a[0], b[0]) <= c[0] + 1e-6 &&
    c[0] <= Math.max(a[0], b[0]) + 1e-6 &&
    Math.min(a[1], b[1]) <= c[1] + 1e-6 &&
    c[1] <= Math.max(a[1], b[1]) + 1e-6
  );
}

function segmentsIntersect(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
): [number, number] | null {
  const d1 = cross(a1, a2, b1);
  const d2 = cross(a1, a2, b2);
  const d3 = cross(b1, b2, a1);
  const d4 = cross(b1, b2, a2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    const denom = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0]);
    if (Math.abs(denom) < 1e-10) return null;
    const t =
      ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / denom;
    return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
  }

  if (Math.abs(d1) < 1e-10 && onSegment(a1, a2, b1)) return b1;
  if (Math.abs(d2) < 1e-10 && onSegment(a1, a2, b2)) return b2;
  if (Math.abs(d3) < 1e-10 && onSegment(b1, b2, a1)) return a1;
  if (Math.abs(d4) < 1e-10 && onSegment(b1, b2, a2)) return a2;
  return null;
}

export function findLineIntersections(
  lineA: [number, number][],
  lineB: [number, number][]
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i < lineA.length; i++) {
    for (let j = 1; j < lineB.length; j++) {
      const pt = segmentsIntersect(lineA[i - 1], lineA[i], lineB[j - 1], lineB[j]);
      if (pt) points.push(pt);
    }
  }
  return points;
}

export function nauwkeurigheidBuffer(nauwkeurigheid: string): number {
  switch (nauwkeurigheid) {
    case 'geschat':
      return 1.5;
    case 'maatvoering':
      return 1.2;
    default:
      return 1.0;
  }
}

export function lineIntersectsBbox(
  line: [number, number][],
  bbox: BboxQuery
): boolean {
  return line.some(
    ([x, y]) =>
      x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
  );
}

export function deduplicatePoints(
  points: [number, number][],
  tolerance = 20
): [number, number][] {
  const unique: [number, number][] = [];
  for (const point of points) {
    const exists = unique.some(
      ([ux, uy]) => Math.hypot(point[0] - ux, point[1] - uy) < tolerance
    );
    if (!exists) unique.push(point);
  }
  return unique;
}

/** Minimale horizontale afstand buiten kruispuntzones (parallelle tracédelen). */
export function minDistLineToLineExcludingPoints(
  lineA: [number, number][],
  lineB: [number, number][],
  excludeNear: [number, number][] = [],
  excludeRadius = 30
): { dist: number; x: number; y: number } {
  let min = Infinity;
  let bestX = lineA[0]?.[0] ?? 0;
  let bestY = lineA[0]?.[1] ?? 0;

  const nearExcluded = (x: number, y: number) =>
    excludeNear.some(([ex, ey]) => Math.hypot(x - ex, y - ey) < excludeRadius);

  for (const [px, py] of lineA) {
    if (nearExcluded(px, py)) continue;
    for (let i = 1; i < lineB.length; i++) {
      const d = distPointSegment(px, py, lineB[i - 1][0], lineB[i - 1][1], lineB[i][0], lineB[i][1]);
      if (d < min) {
        min = d;
        bestX = px;
        bestY = py;
      }
    }
  }

  for (const [px, py] of lineB) {
    if (nearExcluded(px, py)) continue;
    for (let i = 1; i < lineA.length; i++) {
      const d = distPointSegment(px, py, lineA[i - 1][0], lineA[i - 1][1], lineA[i][0], lineA[i][1]);
      if (d < min) {
        min = d;
        bestX = px;
        bestY = py;
      }
    }
  }

  return { dist: min === Infinity ? 999 : min, x: bestX, y: bestY };
}

export interface LineSample3D {
  x: number;
  y: number;
  z: number;
  dist: number;
}

/** Z-waarde op het dichtstbijzijnde punt van een 3D-polylijn (alleen bij bekende Z). */
export function interpolateZAtClosestPoint(
  line: [number, number, number?][],
  x: number,
  y: number,
  maxDist = 15
): LineSample3D | null {
  let best: LineSample3D | null = null;

  for (let i = 1; i < line.length; i++) {
    const [x1, y1, z1] = line[i - 1];
    const [x2, y2, z2] = line[i];
    if (z1 === undefined && z2 === undefined) continue;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((x - x1) * dx + (y - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const pz = (z1 ?? z2 ?? 0) + t * ((z2 ?? z1 ?? 0) - (z1 ?? z2 ?? 0));
    const dist = Math.hypot(x - px, y - py);

    if (dist <= maxDist && (!best || dist < best.dist)) {
      best = { x: px, y: py, z: pz, dist };
    }
  }

  return best;
}

export function interpolateHoogteAtPoint(
  profile: { x: number; y: number; hoogteNap: number }[],
  x: number,
  y: number,
  maxDist = 20
): number | undefined {
  let best: number | undefined;
  let bestDist = maxDist;
  for (const p of profile) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = p.hoogteNap;
    }
  }
  return best;
}

/** Minimale lengte (m) parallel tracé waar afstand onder eis blijft. */
export function sustainedParallelViolation(
  traceLine: [number, number][],
  netLine: [number, number][],
  maxDist: number,
  minRunLength = 40,
  excludeNear: [number, number][] = [],
  excludeRadius = 30
): { dist: number; x: number; y: number; runLength: number } | null {
  let runLength = 0;
  let worstInRun = { dist: Infinity, x: traceLine[0]?.[0] ?? 0, y: traceLine[0]?.[1] ?? 0 };
  let bestViolation: { dist: number; x: number; y: number; runLength: number } | null = null;

  const nearExcluded = (px: number, py: number) =>
    excludeNear.some(([ex, ey]) => Math.hypot(px - ex, py - ey) < excludeRadius);

  for (let i = 1; i < traceLine.length; i++) {
    const [x1, y1] = traceLine[i - 1];
    const [x2, y2] = traceLine[i];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const segLen = Math.hypot(x2 - x1, y2 - y1);

    if (nearExcluded(mx, my)) {
      runLength = 0;
      worstInRun = { dist: Infinity, x: mx, y: my };
      continue;
    }

    let minSegDist = Infinity;
    for (let j = 1; j < netLine.length; j++) {
      const d = distPointSegment(
        mx,
        my,
        netLine[j - 1][0],
        netLine[j - 1][1],
        netLine[j][0],
        netLine[j][1]
      );
      minSegDist = Math.min(minSegDist, d);
    }

    if (minSegDist < maxDist) {
      runLength += segLen;
      if (minSegDist < worstInRun.dist) {
        worstInRun = { dist: minSegDist, x: mx, y: my };
      }
      if (runLength >= minRunLength) {
        if (!bestViolation || worstInRun.dist < bestViolation.dist) {
          bestViolation = { ...worstInRun, runLength };
        }
      }
    } else {
      runLength = 0;
      worstInRun = { dist: Infinity, x: mx, y: my };
    }
  }

  return bestViolation;
}

export function pointInPolygon(
  x: number,
  y: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
