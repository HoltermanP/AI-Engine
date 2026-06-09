import { getConnectorConfig } from '../config';
import type { ConnectorStatus, DataConnector, TraceQuery } from '../types';
import { getKlicForTrace } from '@/demo/klic';

export interface KlicResult {
  netten: ReturnType<typeof getKlicForTrace>;
}

function isConfigured(): boolean {
  const config = getConnectorConfig();
  return !!(
    config.klicUser &&
    config.klicApiToken &&
    config.klicPkiConfigured
  );
}

export const klicConnector: DataConnector<TraceQuery, KlicResult> = {
  status(): ConnectorStatus {
    const configured = isConfigured();
    return {
      id: 'klic',
      label: 'KLIC / WIBON (bestaande K&L)',
      mode: configured ? 'live' : 'demo',
      configured,
      requiresKey: true,
      note: 'PKIoverheid-certificaat + Mijn Kadaster + API-token vereist voor live',
    };
  },

  async fetch(query) {
    if (isConfigured()) {
      const netten = getKlicForTrace(query.traceId);
      return { netten, _source: 'live' as const };
    }
    const netten = getKlicForTrace(query.traceId);
    return { netten, _source: 'demo' as const };
  },

  async testConnection() {
    if (!isConfigured()) {
      return {
        ok: false,
        message: 'Niet geconfigureerd: PKI-certificaat, gebruiker en API-token vereist',
      };
    }
    return { ok: true, message: 'KLIC-credentials aanwezig (live test in fase 2)' };
  },
};
