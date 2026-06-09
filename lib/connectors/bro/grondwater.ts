import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { getGrondwaterForBbox, getGrondwaterForTrace } from '@/demo/bro';
import type { TraceQuery } from '../types';
import { fetchBroGrondwaterLive } from './api-client';

export interface BroGrondwaterResult {
  punten: ReturnType<typeof getGrondwaterForBbox>;
}

function canUseLive(): boolean {
  return !getConnectorConfig().broForceDemo;
}

export const broGrondwaterConnector: DataConnector<BboxQuery | TraceQuery, BroGrondwaterResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'bro-grondwater',
      label: 'BRO Grondwater (GWS)',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
    };
  },

  async fetch(query) {
    const bbox = 'bbox' in query ? query.bbox : query;
    if (canUseLive()) {
      try {
        const live = await fetchBroGrondwaterLive(bbox);
        if (live.length > 0) return { punten: live, _source: 'live' as const };
      } catch {
        // fallback
      }
    }
    const traceId = 'traceId' in query ? query.traceId : undefined;
    const punten = traceId ? getGrondwaterForTrace(traceId) : getGrondwaterForBbox(bbox);
    return { punten, _source: 'demo' as const };
  },

  async testConnection() {
    if (!canUseLive()) return { ok: true, message: 'Lokale modus actief' };
    try {
      const result = await fetchBroGrondwaterLive({ minX: 0, minY: 0, maxX: 300000, maxY: 600000 });
      return { ok: true, message: `BRO Grondwater API bereikbaar (${result.length} putten in NL)` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'BRO Grondwater niet bereikbaar' };
    }
  },
};
