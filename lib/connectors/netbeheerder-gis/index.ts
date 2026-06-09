import type { BboxQuery, ConnectorStatus, DataConnector } from '../types';
import { DEMO_BESTAAND_NET } from '@/demo/klic';

export interface NetbeheerderGisResult {
  netten: typeof DEMO_BESTAAND_NET;
}

export const netbeheerderGisConnector: DataConnector<BboxQuery, NetbeheerderGisResult> = {
  status(): ConnectorStatus {
    return {
      id: 'netbeheerder-gis',
      label: 'Netbeheerder GIS (eigen net)',
      mode: 'demo',
      configured: false,
      requiresKey: false,
      note: 'Geen publieke API — lokale dataset',
    };
  },

  async fetch() {
    return { netten: DEMO_BESTAAND_NET.slice(0, 2), _source: 'demo' as const };
  },

  async testConnection() {
    return { ok: true, message: 'Lokale dataset (geen publieke API beschikbaar)' };
  },
};
