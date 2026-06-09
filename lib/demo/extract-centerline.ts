import { fetchPdokOgcFeatures } from '@/lib/connectors/pdok/ogc-client';
import type { BboxQuery } from '@/lib/connectors/types';

function ringCentroid(ring: [number, number][]): [number, number] {
  const n = ring.length;
  const x = ring.reduce((s, p) => s + p[0], 0) / n;
  const y = ring.reduce((s, p) => s + p[1], 0) / n;
  return [x, y];
}

function dedupePoints(points: [number, number][], minDist = 10): [number, number][] {
  const out: [number, number][] = [];
  for (const [x, y] of points) {
    const px = Math.round(x * 10) / 10;
    const py = Math.round(y * 10) / 10;
    if (
      !out.length ||
      Math.hypot(px - out[out.length - 1][0], py - out[out.length - 1][1]) >= minDist
    ) {
      out.push([px, py]);
    }
  }
  return out;
}

/** Middellijn uit BGT-wegdelen (centroids), gefilterd op y-band en gesorteerd op x. */
export async function extractHorizontalWegCenterline(
  bbox: BboxQuery,
  yMin: number,
  yMax: number,
  xMin?: number,
  xMax?: number
): Promise<[number, number][]> {
  const fc = await fetchPdokOgcFeatures('/lv/bgt/ogc/v1', 'wegdeel', bbox, 200);
  const points = fc.features
    .filter((f): f is GeoJSON.Feature<GeoJSON.Polygon> => f.geometry?.type === 'Polygon')
    .map((f) => ringCentroid(f.geometry.coordinates[0] as [number, number][]))
    .filter(([x, y]) => y >= yMin && y <= yMax && (!xMin || x >= xMin) && (!xMax || x <= xMax))
    .sort((a, b) => a[0] - b[0]);

  return dedupePoints(points);
}
