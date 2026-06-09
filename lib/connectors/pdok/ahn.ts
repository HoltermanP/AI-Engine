import { getConnectorConfig } from '../config';
import type { ConnectorStatus, DataConnector, TraceQuery } from '../types';
import { generateMaaiveldProfile } from '@/demo/pdok';
import { fetchAhnElevation } from './wfs-client';

export interface AhnResult {
  profile: { chainage: number; x: number; y: number; hoogteNap: number }[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().pdokForceDemo;
}

async function fetchLiveProfile(coordinates: [number, number, number?][]) {
  const profile = [];
  let chainage = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const [x, y] = coordinates[i];
    if (i > 0) {
      const [px, py] = coordinates[i - 1];
      chainage += Math.hypot(x - px, y - py);
    }

    const hoogte = await fetchAhnElevation(x, y);
    profile.push({
      chainage: Math.round(chainage),
      x,
      y,
      hoogteNap: hoogte ?? generateMaaiveldProfile(coordinates)[i]?.hoogteNap ?? -0.2,
    });
  }
  return profile;
}

export const pdokAhnConnector: DataConnector<TraceQuery, AhnResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'pdok-ahn',
      label: 'PDOK AHN (DTM 0,5m)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
      note: live ? 'Open WMS/WCS — geen sleutel nodig' : 'Lokale data (PDOK_FORCE_DEMO=true)',
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const profile = await fetchLiveProfile(query.coordinates);
        return { profile, _source: 'live' as const };
      } catch {
        const profile = generateMaaiveldProfile(query.coordinates);
        return { profile, _source: 'demo' as const };
      }
    }
    const profile = generateMaaiveldProfile(query.coordinates);
    return { profile, _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) {
      return { ok: true, message: 'Lokale modus actief (PDOK_FORCE_DEMO=true)' };
    }
    try {
      const hoogte = await fetchAhnElevation(168200, 528400);
      return { ok: true, message: hoogte !== null ? `PDOK AHN bereikbaar (test: ${hoogte} m NAP)` : 'PDOK AHN bereikbaar' };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'PDOK AHN niet bereikbaar' };
    }
  },
};
