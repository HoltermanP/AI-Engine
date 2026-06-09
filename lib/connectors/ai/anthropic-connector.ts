import type { ConnectorStatus, DataConnector } from '../types';
import { getConnectorConfig } from '../config';
import { isAnthropicConfigured, testAnthropicConnection } from './anthropic';

export const anthropicConnector: DataConnector<void, { ok: boolean }> = {
  status(): ConnectorStatus {
    const configured = isAnthropicConfigured();
    return {
      id: 'anthropic',
      label: 'Anthropic (rapportgeneratie)',
      mode: configured ? 'live' : 'demo',
      configured,
      requiresKey: true,
      note: configured
        ? `Model: ${getConnectorConfig().anthropicModel} — onderzoeksrapporten en AI-bewerking`
        : 'Zonder ANTHROPIC_API_KEY worden sjabloonrapporten gebruikt',
    };
  },

  async fetch() {
    const test = await testAnthropicConnection();
    return { ok: test.ok, _source: test.ok ? ('live' as const) : ('demo' as const) };
  },

  async testConnection() {
    return testAnthropicConnection();
  },
};
