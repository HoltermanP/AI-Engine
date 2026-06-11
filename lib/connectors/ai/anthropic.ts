import Anthropic from '@anthropic-ai/sdk';
import { getConnectorConfig } from '../config';

export interface AnthropicCompletionOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** Modeloverride, bijv. een snel model voor interactieve bewerkingen */
  model?: string;
}

export interface AnthropicCompletionResult {
  text: string;
  model: string;
  _source: 'live' | 'demo';
}

export function isAnthropicConfigured(): boolean {
  const key = getConnectorConfig().anthropicApiKey;
  return !!key && !key.includes('placeholder');
}

const ANTHROPIC_TIMEOUT_MS = 120_000;

export const ANTHROPIC_NIET_GECONFIGUREERD =
  'ANTHROPIC_API_KEY niet geconfigureerd — rapporten kunnen alleen via de AI API worden gegenereerd. Stel de key in via .env.local.';

export async function anthropicComplete(
  options: AnthropicCompletionOptions
): Promise<AnthropicCompletionResult> {
  const config = getConnectorConfig();
  if (!isAnthropicConfigured()) {
    throw new Error(ANTHROPIC_NIET_GECONFIGUREERD);
  }

  const client = new Anthropic({
    apiKey: config.anthropicApiKey,
    timeout: ANTHROPIC_TIMEOUT_MS,
  });
  const model = options.model ?? config.anthropicModel;
  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 8192,
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { text, model, _source: 'live' };
}

/** Stream tekstdeltas van Anthropic. Gooit een fout als de API niet geconfigureerd is. */
export async function* anthropicCompleteStream(
  options: AnthropicCompletionOptions
): AsyncGenerator<string> {
  const config = getConnectorConfig();
  if (!isAnthropicConfigured()) {
    throw new Error(ANTHROPIC_NIET_GECONFIGUREERD);
  }

  const client = new Anthropic({
    apiKey: config.anthropicApiKey,
    timeout: ANTHROPIC_TIMEOUT_MS,
  });

  const stream = client.messages.stream({
    model: config.anthropicModel,
    max_tokens: options.maxTokens ?? 8192,
    system: options.system,
    messages: [{ role: 'user', content: options.prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

export async function testAnthropicConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isAnthropicConfigured()) {
    return { ok: false, message: 'ANTHROPIC_API_KEY niet geconfigureerd' };
  }
  try {
    const result = await anthropicComplete({
      system: 'Antwoord met exact één woord: OK',
      prompt: 'Test',
      maxTokens: 16,
    });
    if (!result.text) {
      return { ok: false, message: 'Leeg antwoord van Anthropic API' };
    }
    return {
      ok: true,
      message: `Anthropic bereikbaar (model: ${getConnectorConfig().anthropicModel})`,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Anthropic niet bereikbaar',
    };
  }
}
