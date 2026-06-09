import OpenAI from 'openai';
import { getConnectorConfig } from '../config';
import type { ConnectorStatus, DataConnector } from '../types';

export interface AiPrompt {
  prompt: string;
  context?: string;
}

export interface AiResult {
  text: string;
  model: string;
}

function isConfigured(): boolean {
  return !!getConnectorConfig().openaiApiKey;
}

function deterministicResponse(prompt: string, context?: string): string {
  const hash = (prompt + (context ?? '')).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const templates = [
    'Op basis van de beschikbare projectdata zijn er 3 aandachtspunten geïdentificeerd. Een kruising met bestaande MS-kabel vereist aanvullende maatregelen conform NEN 7171. Voorgestelde oplossing: tracéverschuiving 1,2 m naar het zuiden of diepere ligging (HDD).',
    'Het concept bureauonderzoek archeologie adviseert een proefsleuvenplan in het tracégedeelte nabij de waterkruising. Geen directe blokkades verwacht. Planning: uitvoering buiten broedseizoen.',
    'Conflictanalyse: 1 blokkerend conflict (onvoldoende afstand t.o.v. HD-gasleiding), 2 waarschuwingen. Voorgestelde oplossingen: (1) tracéverschuiving, (2) mantelbuis bij kruising, (3) overleg met netbeheerder over nauwkeurigheid.',
    'Hydraulische en elektrische berekeningen tonen voldoende capaciteit. Aandachtspunt: spanningsval bij lengte >500 m — eventueel kabeldoorsnede vergroten.',
  ];
  return templates[hash % templates.length];
}

export const aiConnector: DataConnector<AiPrompt, AiResult> = {
  status(): ConnectorStatus {
    const configured = isConfigured();
    return {
      id: 'ai',
      label: 'OpenAI (chat-assistentie)',
      mode: configured ? 'live' : 'demo',
      configured,
      requiresKey: true,
      note: configured
        ? `Model: ${getConnectorConfig().openaiModel}`
        : 'Deterministische sjabloon-output zonder API-key',
    };
  },

  async fetch(query) {
    const config = getConnectorConfig();
    if (isConfigured()) {
      try {
        const client = new OpenAI({ apiKey: config.openaiApiKey });
        const response = await client.chat.completions.create({
          model: config.openaiModel,
          messages: [
            {
              role: 'system',
              content:
                'Je bent een Nederlandse engineering-assistent voor ondergrondse infrastructuur. Gebruik vakterminologie (tracé, dekking, NEN-normen). Antwoord in het Nederlands, beknopt en actionable.',
            },
            {
              role: 'user',
              content: query.context
                ? `Context: ${query.context}\n\n${query.prompt}`
                : query.prompt,
            },
          ],
          max_tokens: 800,
        });
        const text = response.choices[0]?.message?.content ?? deterministicResponse(query.prompt, query.context);
        return { text, model: config.openaiModel, _source: 'live' as const };
      } catch {
        return {
          text: deterministicResponse(query.prompt, query.context),
          model: 'demo-fallback',
          _source: 'demo' as const,
        };
      }
    }
    return {
      text: deterministicResponse(query.prompt, query.context),
      model: 'demo-template',
      _source: 'demo' as const,
    };
  },

  async testConnection() {
    if (!isConfigured()) {
      return { ok: false, message: 'OPENAI_API_KEY niet geconfigureerd' };
    }
    try {
      const client = new OpenAI({ apiKey: getConnectorConfig().openaiApiKey });
      await client.models.list();
      return { ok: true, message: `OpenAI bereikbaar (model: ${getConnectorConfig().openaiModel})` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'OpenAI niet bereikbaar' };
    }
  },
};
