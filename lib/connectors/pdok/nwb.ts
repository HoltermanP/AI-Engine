import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { fetchPdokWfs, PDOK_WFS_PATHS } from './wfs-client';

export interface NwbResult {
  wegvakken: { naam: string; type: string; coordinates: [number, number][] }[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

function lineCoords(geom: GeoJSON.Geometry): [number, number][] {
  if (geom.type === 'LineString') {
    return geom.coordinates.map(([x, y]) => [x, y] as [number, number]);
  }
  if (geom.type === 'MultiLineString') {
    return geom.coordinates[0]?.map(([x, y]) => [x, y] as [number, number]) ?? [];
  }
  return [];
}

export const pdokNwbConnector: DataConnector<BboxQuery, NwbResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-nwb',
      label: 'PDOK NWB (rijkswegen)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const fc = await fetchPdokWfs(PDOK_WFS_PATHS.nwbWegen, 'wegvakken', query, 50);
        const wegvakken = fc.features
          .filter((f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
          .map((f) => ({
            naam: (f.properties?.['sttNaam'] as string) ?? (f.properties?.['stt_naam'] as string) ?? 'Onbekend',
            type: (f.properties?.['wegbehsrt'] as string) ?? (f.properties?.['wegtype'] as string) ?? 'weg',
            coordinates: lineCoords(f.geometry!),
          }))
          .filter((w) => w.coordinates.length >= 2);
        if (wegvakken.length > 0) return { wegvakken, _source: 'live' as const };
      } catch {
        // fallback
      }
    }
    const cy = (query.minY + query.maxY) / 2;
    return {
      wegvakken: [{ naam: 'N50', type: 'rijksweg', coordinates: [[query.minX, cy + 50], [query.maxX, cy + 50]] }],
      _source: 'demo' as const,
    };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      await fetchPdokWfs(PDOK_WFS_PATHS.nwbWegen, 'wegvakken', { minX: 179500, minY: 524500, maxX: 179600, maxY: 524600 }, 1);
      return { ok: true, message: 'PDOK NWB WFS bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK NWB niet bereikbaar' };
    }
  },
};
