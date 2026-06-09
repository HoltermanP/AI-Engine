import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { fetchPdokWfs, PDOK_WFS_PATHS } from './wfs-client';
import { DEMO_NATURA2000 } from '@/demo/pdok';

export interface Natura2000Result {
  gebieden: { id: string; naam: string; polygon: [number, number][] }[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

function polygonFromGeometry(geom: GeoJSON.Geometry): [number, number][] {
  if (geom.type === 'Polygon') {
    return geom.coordinates[0] as [number, number][];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates[0][0] as [number, number][];
  }
  return [];
}

/** Uitbreid bbox voor ecologische toets (5 km). */
function expandedBbox(query: BboxQuery, bufferM = 5000): BboxQuery {
  return {
    minX: query.minX - bufferM,
    minY: query.minY - bufferM,
    maxX: query.maxX + bufferM,
    maxY: query.maxY + bufferM,
  };
}

export const pdokNatura2000Connector: DataConnector<BboxQuery, Natura2000Result> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-natura2000',
      label: 'PDOK Natura2000',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const fc = await fetchPdokWfs(
          PDOK_WFS_PATHS.natura2000,
          'beschermde-gebieden:protectedsite',
          expandedBbox(query),
          20
        );
        const gebieden = fc.features
          .map((f, i) => ({
            id: (f.id as string) ?? `n2000-${i}`,
            naam:
              (f.properties?.['localId'] as string) ??
              (f.properties?.['label'] as string) ??
              (f.properties?.['siteName'] as string) ??
              'Natura2000-gebied',
            polygon: polygonFromGeometry(f.geometry!),
          }))
          .filter((g) => g.polygon.length >= 4);
        return { gebieden, _source: 'live' as const };
      } catch {
        // fallback demo
      }
    }

    return {
      gebieden: [
        {
          id: DEMO_NATURA2000.id,
          naam: DEMO_NATURA2000.naam,
          polygon: DEMO_NATURA2000.polygon,
        },
      ],
      _source: 'demo' as const,
    };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      await fetchPdokWfs(
        PDOK_WFS_PATHS.natura2000,
        'beschermde-gebieden:protectedsite',
        { minX: 170000, minY: 518000, maxX: 171000, maxY: 519000 },
        1
      );
      return { ok: true, message: 'PDOK Natura2000 WFS v2 bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK Natura2000 niet bereikbaar' };
    }
  },
};
