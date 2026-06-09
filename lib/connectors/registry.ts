import type { ConnectorStatus } from './types';
import { pdokAhnConnector } from './pdok/ahn';
import { pdokBgtConnector } from './pdok/bgt';
import { pdokBomenConnector } from './pdok/bomen';
import { pdokBrkKaartConnector } from './pdok/brk-kaart';
import { pdokNwbConnector } from './pdok/nwb';
import { pdokNatura2000Connector } from './pdok/natura2000';
import { broCptConnector } from './bro/cpt';
import { broGrondwaterConnector } from './bro/grondwater';
import { broVervuildeGrondConnector } from './bro/vervuilde-grond';
import { klicConnector } from './klic';
import { brkEigenaarConnector } from './brk/eigenaar';
import { waterschapLeggerConnector } from './waterschap/legger';
import { netbeheerderGisConnector } from './netbeheerder-gis';
import { aiConnector } from './ai';
import { anthropicConnector } from './ai/anthropic-connector';

export const CONNECTORS = [
  pdokAhnConnector,
  pdokBgtConnector,
  pdokBomenConnector,
  pdokBrkKaartConnector,
  pdokNwbConnector,
  pdokNatura2000Connector,
  broCptConnector,
  broGrondwaterConnector,
  broVervuildeGrondConnector,
  waterschapLeggerConnector,
  klicConnector,
  brkEigenaarConnector,
  netbeheerderGisConnector,
  aiConnector,
  anthropicConnector,
] as const;

export function getConnectorStatuses(): ConnectorStatus[] {
  return CONNECTORS.map((c) => c.status());
}

export function getConnectorById(id: string) {
  return CONNECTORS.find((c) => c.status().id === id);
}

export async function testConnector(id: string) {
  const connector = getConnectorById(id);
  if (!connector?.testConnection) {
    return { ok: false, message: 'Connector niet gevonden of test niet ondersteund' };
  }
  return connector.testConnection();
}
