'use server';

import { getConnectorStatuses, testConnector } from '@/lib/connectors/registry';

export async function getConnectorsAction() {
  return getConnectorStatuses();
}

export async function testConnectorAction(connectorId: string) {
  return testConnector(connectorId);
}
