import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { getSonderingenForBbox } from '@/demo/bro';
import { fetchBroCptLive } from './api-client';

export interface BroCptResult {
  sonderingen: ReturnType<typeof getSonderingenForBbox>;
}

function canUseLive(): boolean {
  return !getConnectorConfig().broForceDemo;
}

export const broCptConnector: DataConnector<BboxQuery, BroCptResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'bro-cpt',
      label: 'BRO CPT (sonderingen)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
      note: 'Publieke BRO REST API',
    };
  },

  async fetch(query) {
    if (canUseLive()) {
      try {
        const live = await fetchBroCptLive(query);
        if (live.length > 0) return { sonderingen: live, _source: 'live' as const };
      } catch {
        // fallback demo
      }
    }
    return { sonderingen: getSonderingenForBbox(query), _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      const result = await fetchBroCptLive({ minX: 0, minY: 0, maxX: 300000, maxY: 600000 });
      return { ok: true, message: `BRO CPT API bereikbaar (${result.length} registraties in NL)` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'BRO CPT niet bereikbaar' };
    }
  },
};
