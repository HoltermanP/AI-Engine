import type { OnderzoekDocument, OnderzoekType } from '@/lib/research/types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';

export interface StreamRapportCallbacks {
  onTemplate?: (document: OnderzoekDocument) => void;
  onDelta?: (text: string, accumulated: string) => void;
  onDone?: (document: OnderzoekDocument) => void;
  onError?: (message: string) => void;
}

export interface StreamRapportOptions {
  traceId: string;
  type: OnderzoekType;
  collected?: CollectedTraceData;
  conflicten?: DetectedConflict[];
  actionId?: string;
  signal?: AbortSignal;
}

export async function streamRapportGeneratie(
  options: StreamRapportOptions,
  callbacks: StreamRapportCallbacks
): Promise<OnderzoekDocument | null> {
  const response = await fetch('/api/rapport/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      traceId: options.traceId,
      type: options.type,
      collected: options.collected,
      conflicten: options.conflicten,
      actionId: options.actionId,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Stream mislukt');
    callbacks.onError?.(message || 'Stream mislukt');
    return null;
  }

  if (!response.body) {
    callbacks.onError?.('Geen stream-body ontvangen');
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';
  let finalDocument: OnderzoekDocument | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      try {
        const payload = JSON.parse(trimmed.slice(5).trim()) as {
          event: string;
          document?: OnderzoekDocument;
          text?: string;
          message?: string;
        };

        switch (payload.event) {
          case 'template':
            if (payload.document) callbacks.onTemplate?.(payload.document);
            break;
          case 'delta':
            if (payload.text) {
              accumulated += payload.text;
              callbacks.onDelta?.(payload.text, accumulated);
            }
            break;
          case 'done':
            if (payload.document) {
              finalDocument = payload.document;
              callbacks.onDone?.(payload.document);
            }
            break;
          case 'error':
            callbacks.onError?.(payload.message ?? 'Onbekende streamfout');
            break;
        }
      } catch {
        // ongeldige SSE-regel overslaan
      }
    }
  }

  return finalDocument;
}
