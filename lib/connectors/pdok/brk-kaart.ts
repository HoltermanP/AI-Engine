import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { DEMO_PERCELEN } from '@/demo/pdok';
import {
  brkFeatureLimit,
  brkNeedsTiling,
  splitBboxIntoTiles,
} from '@/lib/map/viewport-bbox';
import { fetchPdokWfsPaged, PDOK_WFS_PATHS } from './wfs-client';

const BRK_TILE_PARALLEL = 4;

export interface BrkKaartResult {
  percelen: typeof DEMO_PERCELEN;
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

function demoPercelen(query: BboxQuery) {
  return DEMO_PERCELEN.filter((p) =>
    p.polygon.some(
      ([x, y]) => x >= query.minX && x <= query.maxX && y >= query.minY && y <= query.maxY
    )
  );
}

/**
 * Live BRK: WFS in EPSG:4326 (PDOK RDNAPTRANS) → polygon als [lon, lat].
 * Demo: RD (EPSG:28992) → polygon als [x, y].
 */
function polygonFromGeometry(geom: GeoJSON.Geometry): [number, number][] {
  const ring = (coords: number[][]): [number, number][] =>
    coords.map(([x, y]) => [x, y] as [number, number]);

  if (geom.type === 'Polygon') {
    return ring(geom.coordinates[0] as number[][]);
  }
  if (geom.type === 'MultiPolygon') {
    const largest = geom.coordinates.reduce((best, poly) =>
      poly[0].length > best[0].length ? poly : best
    );
    return ring(largest[0] as number[][]);
  }
  return [];
}

function brkFeatureKey(f: GeoJSON.Feature, index: number): string {
  const gemeente = (f.properties?.['kadastraleGemeenteWaarde'] as string) ?? '';
  const sectie = (f.properties?.['sectie'] as string) ?? '';
  const nr = (f.properties?.['perceelnummer'] as string | number) ?? index;
  const key = `${gemeente}|${sectie}|${nr}`;
  return key === '||' ? `brk-${index}` : key;
}

async function fetchBrkFeatureCollection(
  query: BboxQuery
): Promise<GeoJSON.FeatureCollection> {
  const limit = brkFeatureLimit(query);
  return fetchPdokWfsPaged(
    PDOK_WFS_PATHS.brkKadastraleKaart,
    'Perceel',
    query,
    limit,
    1000,
    'EPSG:4326'
  );
}

/** Haal alle percelen op via tegels (om PDOK WFS-cap te omzeilen). */
async function fetchBrkTiled(query: BboxQuery): Promise<GeoJSON.FeatureCollection> {
  const tiles = splitBboxIntoTiles(query);
  const seen = new Set<string>();
  const features: GeoJSON.Feature[] = [];

  for (let i = 0; i < tiles.length; i += BRK_TILE_PARALLEL) {
    const batch = tiles.slice(i, i + BRK_TILE_PARALLEL);
    const pages = await Promise.all(batch.map((tile) => fetchBrkFeatureCollection(tile)));
    for (const page of pages) {
      for (const [index, feature] of (page.features ?? []).entries()) {
        const key = brkFeatureKey(feature, index);
        if (seen.has(key)) continue;
        seen.add(key);
        features.push(feature);
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

function mapBrkFeatures(fc: GeoJSON.FeatureCollection) {
  return fc.features
    .map((f, i) => {
      const gemeente = (f.properties?.['kadastraleGemeenteWaarde'] as string) ?? '';
      const sectie = (f.properties?.['sectie'] as string) ?? '';
      const nr = (f.properties?.['perceelnummer'] as string | number) ?? i;
      const polygon = f.geometry ? polygonFromGeometry(f.geometry) : [];
      return {
        id: `brk-live-${gemeente}-${sectie}-${nr}`.replace(/\s+/g, '-'),
        perceelnummer: `${gemeente} ${sectie} ${nr}`.trim() || `PER-${i}`,
        oppervlakte: (f.properties?.['kadastraleGrootteWaarde'] as number) ?? 0,
        polygon,
      };
    })
    .filter((p) => p.polygon.length >= 4);
}

export const pdokBrkKaartConnector: DataConnector<BboxQuery, BrkKaartResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-brk-kaart',
      label: 'PDOK BRK Kaart (perceelgrenzen)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      const fc = brkNeedsTiling(query)
        ? await fetchBrkTiled(query)
        : await fetchBrkFeatureCollection(query);
      const percelen = mapBrkFeatures(fc);
      if (percelen.length > 0) {
        return { percelen, _source: 'live' as const };
      }
      return { percelen: [], _source: 'live' as const };
    }
    return { percelen: demoPercelen(query), _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      await fetchPdokWfsPaged(
        PDOK_WFS_PATHS.brkKadastraleKaart,
        'Perceel',
        { minX: 179500, minY: 524500, maxX: 179600, maxY: 524600 },
        1,
        1
      );
      return { ok: true, message: 'PDOK BRK Kadastrale Kaart WFS v5 bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK BRK niet bereikbaar' };
    }
  },
};
