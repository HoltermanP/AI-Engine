import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { fetchAllPdokOgcFeatures } from './ogc-client';

export interface BomenResult {
  bomen: { id: string; x: number; y: number }[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

/** De BGT OGC API levert ook historische versies; alleen actuele bomen tonen. */
function isActueleBoom(props: Record<string, unknown> | null | undefined): boolean {
  return (
    props?.['plus_type'] === 'boom' &&
    props?.['eind_registratie'] == null &&
    props?.['status'] === 'bestaand'
  );
}

function demoBomen(query: BboxQuery): BomenResult['bomen'] {
  const cx = (query.minX + query.maxX) / 2;
  const cy = (query.minY + query.maxY) / 2;
  return Array.from({ length: 8 }, (_, i) => ({
    id: `demo-boom-${i}`,
    x: cx - 70 + i * 20,
    y: cy + 30,
  }));
}

export const pdokBomenConnector: DataConnector<BboxQuery, BomenResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-bomen',
      label: 'PDOK BGT (bomen)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const features = await fetchAllPdokOgcFeatures(
          '/lv/bgt/ogc/v1',
          'vegetatieobject_punt',
          query,
          500,
          4000
        );
        const bomen = features
          .filter(
            (f) =>
              f.geometry?.type === 'Point' &&
              isActueleBoom(f.properties)
          )
          .map((f) => {
            const [x, y] = (f.geometry as GeoJSON.Point).coordinates;
            return {
              id:
                (f.properties?.['lokaal_id'] as string) ??
                String(f.id ?? `boom-${x}-${y}`),
              x,
              y,
            };
          });
        return { bomen, _source: 'live' as const };
      } catch {
        // fallback demo
      }
    }
    return { bomen: demoBomen(query), _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      await fetchAllPdokOgcFeatures(
        '/lv/bgt/ogc/v1',
        'vegetatieobject_punt',
        { minX: 179500, minY: 524500, maxX: 179600, maxY: 524600 },
        1,
        1
      );
      return { ok: true, message: 'PDOK BGT vegetatieobject (bomen) bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK BGT bomen niet bereikbaar' };
    }
  },
};
