import type { BgtFeature } from '@/lib/connectors/pdok/bgt';
import type { ConnectorMode } from '@/lib/connectors/types';
import { lineIntersectsBbox } from '@/lib/geo';
import type { BboxQuery } from '@/lib/connectors/types';

/** Middellijn uit BGT-polygon: langste as door polygon (beter voor diagonale wegen). */
export function centerlineFromPolygon(ring: [number, number][]): [number, number][] {
  if (ring.length < 4) return [];

  let maxDist = 0;
  let a = ring[0];
  let b = ring[1];
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      const d = Math.hypot(ring[i][0] - ring[j][0], ring[i][1] - ring[j][1]);
      if (d > maxDist) {
        maxDist = d;
        a = ring[i];
        b = ring[j];
      }
    }
  }
  if (maxDist >= 12) {
    return [
      [a[0], a[1]],
      [b[0], b[1]],
    ];
  }

  const xs = ring.map(([x]) => x);
  const ys = ring.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  if (maxX - minX >= maxY - minY) {
    return [
      [minX, cy],
      [maxX, cy],
    ];
  }
  return [
    [cx, minY],
    [cx, maxY],
  ];
}

/** Watergangen afleiden uit live BGT-waterdeel (geen hardcoded demo-coördinaten). */
export function watergangenFromBgt(
  bbox: BboxQuery,
  bgt: BgtFeature[],
  source: ConnectorMode
): { naam: string; type: string; coordinates: [number, number][]; _source: ConnectorMode }[] {
  const items: { naam: string; type: string; coordinates: [number, number][]; _source: ConnectorMode }[] = [];

  for (const feature of bgt) {
    if (feature.type !== 'water') continue;
    let coords: [number, number][] = [];
    if (feature.geometry.type === 'Polygon') {
      coords = centerlineFromPolygon(feature.geometry.coordinates[0] as [number, number][]);
    } else if (feature.geometry.type === 'LineString') {
      coords = feature.geometry.coordinates.map(([x, y]) => [x, y] as [number, number]);
    }
    if (coords.length < 2 || !lineIntersectsBbox(coords, bbox)) continue;
    items.push({
      naam: feature.label || 'Watergang',
      type: 'watergang',
      coordinates: coords,
      _source: source,
    });
  }

  return items.slice(0, 25);
}
