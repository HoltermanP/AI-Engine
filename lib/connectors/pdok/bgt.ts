import { DEMO_WEGEN } from '@/demo/roads';
import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { fetchPdokOgcFeatures } from './ogc-client';

export interface BgtFeature {
  type: string;
  label: string;
  geometry: GeoJSON.Geometry;
}

export interface BgtResult {
  features: BgtFeature[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

const WEG_BREEDTE: Record<string, number> = {
  provincialeweg: 12,
  gemeenteweg: 8,
  woonstraat: 6,
  fietspad: 3,
};

function bufferWegPolygon(
  centerline: [number, number][],
  halfWidth: number
): [number, number][] {
  if (centerline.length < 2) return [];

  const left: [number, number][] = [];
  const right: [number, number][] = [];

  for (let i = 0; i < centerline.length; i++) {
    const [x, y] = centerline[i];
    let angle: number;
    if (i === 0) {
      const [x2, y2] = centerline[i + 1];
      angle = Math.atan2(y2 - y, x2 - x);
    } else if (i === centerline.length - 1) {
      const [x1, y1] = centerline[i - 1];
      angle = Math.atan2(y - y1, x - x1);
    } else {
      const [x1, y1] = centerline[i - 1];
      const [x2, y2] = centerline[i + 1];
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
    const perpX = -Math.sin(angle) * halfWidth;
    const perpY = Math.cos(angle) * halfWidth;
    left.push([x + perpX, y + perpY]);
    right.unshift([x - perpX, y - perpY]);
  }

  const ring = [...left, ...right];
  ring.push(ring[0]);
  return ring;
}

function demoFeatures(query: BboxQuery): BgtFeature[] {
  const features: BgtFeature[] = [];

  for (const weg of DEMO_WEGEN) {
    const inBbox = weg.centerline.some(
      ([x, y]) => x >= query.minX && x <= query.maxX && y >= query.minY && y <= query.maxY
    );
    if (!inBbox) continue;

    const halfWidth = (WEG_BREEDTE[weg.type] ?? 6) / 2;
    features.push({
      type: 'weg',
      label: weg.naam,
      geometry: {
        type: 'Polygon',
        coordinates: [bufferWegPolygon(weg.centerline, halfWidth)],
      },
    });
  }

  const waterBelemmering = [
    [168480, 528200],
    [168820, 528200],
  ] as [number, number][];
  const waterInBbox = waterBelemmering.some(
    ([x, y]) => x >= query.minX && x <= query.maxX && y >= query.minY && y <= query.maxY
  );
  if (waterInBbox) {
    features.push({
      type: 'water',
      label: 'Prinsengracht Noord (sloot)',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [168480, 528195],
            [168820, 528195],
            [168820, 528205],
            [168480, 528205],
            [168480, 528195],
          ],
        ],
      },
    });
  }

  if (features.length === 0) {
    const cx = (query.minX + query.maxX) / 2;
    const cy = (query.minY + query.maxY) / 2;
    features.push({
      type: 'weg',
      label: 'Wegdeel',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [cx - 50, cy - 4],
            [cx + 50, cy - 4],
            [cx + 50, cy + 4],
            [cx - 50, cy + 4],
            [cx - 50, cy - 4],
          ],
        ],
      },
    });
  }

  return features;
}

const BGT_TYPE_MAP: Record<string, string> = {
  wegdeel: 'weg',
  waterdeel: 'water',
  pand: 'pand',
};

export const pdokBgtConnector: DataConnector<BboxQuery, BgtResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-bgt',
      label: 'PDOK BGT (topografie)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const [weg, water] = await Promise.all([
          fetchPdokOgcFeatures('/lv/bgt/ogc/v1', 'wegdeel', query, 50, 'CRS84'),
          fetchPdokOgcFeatures('/lv/bgt/ogc/v1', 'waterdeel', query, 50, 'CRS84'),
        ]);
        const mapFeature = (f: GeoJSON.Feature, defaultType: string): BgtFeature => {
          const functie = (f.properties?.['functie'] as string) ?? '';
          const voorkomen = (f.properties?.['fysiek_voorkomen'] as string) ?? '';
          const label = [functie, voorkomen].filter(Boolean).join(' · ') || 'BGT-object';
          const bgtType =
            Object.entries(BGT_TYPE_MAP).find(([k]) => label.toLowerCase().includes(k))?.[1] ?? defaultType;
          return { type: bgtType, label, geometry: f.geometry! };
        };
        const features: BgtFeature[] = [
          ...weg.features.map((f) => mapFeature(f, 'weg')),
          ...water.features.map((f) => mapFeature(f, 'water')),
        ];
        if (features.length > 0) return { features, _source: 'live' as const };
      } catch {
        // fallback demo
      }
    }
    return { features: demoFeatures(query), _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      await fetchPdokOgcFeatures('/lv/bgt/ogc/v1', 'wegdeel', { minX: 179500, minY: 524500, maxX: 179600, maxY: 524600 }, 1);
      return { ok: true, message: 'PDOK BGT OGC API bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK BGT niet bereikbaar' };
    }
  },
};
