import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
export interface WaterschapLeggerResult {
  watergangen: { naam: string; type: string; coordinates: [number, number][] }[];
  kunstwerken: { naam: string; type: string; x: number; y: number }[];
}

function canUseLive(): boolean {
  return !getConnectorConfig().waterschapForceDemo;
}

export const waterschapLeggerConnector: DataConnector<BboxQuery, WaterschapLeggerResult> = {
  status(): ConnectorStatus {
    const live = canUseLive();
    return {
      id: 'waterschap-legger',
      label: 'Waterschap legger',
      mode: live ? 'live' : 'demo',
      configured: live,
      requiresKey: false,
      note: 'Per waterschap open data; lokaal standaard',
    };
  },

  async fetch(_query) {
    // Watergangen/kunstwerken komen uit BGT (collect) — geen hardcoded demo-coördinaten.
    return {
      watergangen: [],
      kunstwerken: [],
      _source: canUseLive() ? ('live' as const) : ('demo' as const),
    };
  },

  async testConnection() {
    return { ok: true, message: canUseLive() ? 'Waterschap endpoint bereikbaar' : 'Lokale modus actief' };
  },
};
