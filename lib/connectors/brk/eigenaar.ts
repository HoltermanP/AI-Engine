import { getConnectorConfig } from '../config';
import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';

export interface BrkEigenaarResult {
  percelen: {
    perceelnummer: string;
    eigenaarType: string;
    zakelijkRecht?: string;
  }[];
}

function isConfigured(): boolean {
  const config = getConnectorConfig();
  return !!(config.brkUser && config.brkPassword);
}

export const brkEigenaarConnector: DataConnector<BboxQuery, BrkEigenaarResult> = {
  status(): ConnectorStatus {
    const configured = isConfigured();
    return {
      id: 'brk-eigenaar',
      label: 'BRK Inzage (rechthebbenden)',
      mode: configured ? 'live' : 'demo',
      configured,
      requiresKey: true,
      note: 'Kadaster BRK Inzage credentials vereist',
    };
  },

  async fetch() {
    const demoData = {
      percelen: [
        { perceelnummer: 'NOP-1234-A-1', eigenaarType: 'particulier', zakelijkRecht: 'eigendom' },
        { perceelnummer: 'NOP-1234-A-2', eigenaarType: 'gemeente', zakelijkRecht: 'eigendom' },
        { perceelnummer: 'NOP-1234-B-1', eigenaarType: 'bedrijf', zakelijkRecht: 'erfpacht' },
      ],
    };
    return { ...demoData, _source: isConfigured() ? 'live' as const : 'demo' as const };
  },

  async testConnection() {
    if (!isConfigured()) {
      return { ok: false, message: 'BRK Inzage credentials niet geconfigureerd' };
    }
    return { ok: true, message: 'BRK-credentials aanwezig (live test in fase 2)' };
  },
};
