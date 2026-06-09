import type { BboxQuery } from '@/lib/connectors/types';
import { wgs84ToRd } from '@/lib/geo';

export interface MapViewport {
  west: number;
  south: number;
  east: number;
  north: number;
}

const NL_BOUNDS: BboxQuery = {
  minX: 10_000,
  minY: 300_000,
  maxX: 280_000,
  maxY: 630_000,
};

/** Viewport (WGS84) → RD-bbox via alle hoeken (nauwkeuriger dan 2 hoekpunten). */
export function viewportToRdBbox(viewport: MapViewport): BboxQuery {
  const corners = [
    wgs84ToRd(viewport.west, viewport.south),
    wgs84ToRd(viewport.east, viewport.south),
    wgs84ToRd(viewport.east, viewport.north),
    wgs84ToRd(viewport.west, viewport.north),
  ];

  let minX = Math.min(...corners.map(([x]) => x));
  let maxX = Math.max(...corners.map(([x]) => x));
  let minY = Math.min(...corners.map(([, y]) => y));
  let maxY = Math.max(...corners.map(([, y]) => y));

  const minSpan = 80;
  if (maxX - minX < minSpan) {
    const cx = (minX + maxX) / 2;
    minX = cx - minSpan / 2;
    maxX = cx + minSpan / 2;
  }
  if (maxY - minY < minSpan) {
    const cy = (minY + maxY) / 2;
    minY = cy - minSpan / 2;
    maxY = cy + minSpan / 2;
  }

  return clampBboxNl({ minX, minY, maxX, maxY });
}

/** Maximaal aantal BRK-percelen per query (stedelijk ~15–30 percelen/ha). */
export function brkFeatureLimit(bbox: BboxQuery): number {
  const areaHa = ((bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)) / 10_000;
  return Math.min(5_000, Math.max(800, Math.ceil(areaHa * 25)));
}

const BRK_TILE_SIZE_M = 750;

/** Splits een bbox in tegels zodat PDOK WFS niet op de ~1000-cap stuit. */
export function splitBboxIntoTiles(
  bbox: BboxQuery,
  tileSize = BRK_TILE_SIZE_M
): BboxQuery[] {
  const spanX = bbox.maxX - bbox.minX;
  const spanY = bbox.maxY - bbox.minY;
  if (spanX <= tileSize && spanY <= tileSize) return [bbox];

  const tiles: BboxQuery[] = [];
  for (let x = bbox.minX; x < bbox.maxX; x += tileSize) {
    for (let y = bbox.minY; y < bbox.maxY; y += tileSize) {
      tiles.push({
        minX: x,
        minY: y,
        maxX: Math.min(x + tileSize, bbox.maxX),
        maxY: Math.min(y + tileSize, bbox.maxY),
      });
    }
  }
  return tiles;
}

export function brkNeedsTiling(bbox: BboxQuery): boolean {
  const spanX = bbox.maxX - bbox.minX;
  const spanY = bbox.maxY - bbox.minY;
  const areaHa = (spanX * spanY) / 10_000;
  return spanX > BRK_TILE_SIZE_M || spanY > BRK_TILE_SIZE_M || areaHa > 60;
}

export function clampBboxNl(bbox: BboxQuery): BboxQuery {
  return {
    minX: Math.max(NL_BOUNDS.minX, bbox.minX),
    minY: Math.max(NL_BOUNDS.minY, bbox.minY),
    maxX: Math.min(NL_BOUNDS.maxX, bbox.maxX),
    maxY: Math.min(NL_BOUNDS.maxY, bbox.maxY),
  };
}

/** Cache-sleutel (~50 m raster) om kleine pans te dedupliceren. */
export function bboxCacheKey(bbox: BboxQuery): string {
  const r = (n: number) => Math.round(n / 50) * 50;
  return `${r(bbox.minX)}:${r(bbox.minY)}:${r(bbox.maxX)}:${r(bbox.maxY)}`;
}
