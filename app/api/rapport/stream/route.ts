import { getTrace } from '@/lib/db/store';
import { buildOnderzoekTemplate } from '@/lib/research/generator';
import { streamVerrijkRapportMetAnthropic } from '@/lib/research/ai-rapport';
import { completeActionsForOnderzoekType } from '@/lib/services/action-completion';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { OnderzoekType } from '@/lib/research/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface StreamRequestBody {
  traceId: string;
  type: OnderzoekType;
  collected?: CollectedTraceData;
  conflicten?: DetectedConflict[];
  actionId?: string;
}

function sseLine(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  let body: StreamRequestBody;
  try {
    body = (await req.json()) as StreamRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldig verzoek' }), { status: 400 });
  }

  const { traceId, type, collected, conflicten, actionId } = body;
  if (!traceId || !type) {
    return new Response(JSON.stringify({ error: 'traceId en type zijn verplicht' }), { status: 400 });
  }

  const trace = await getTrace(traceId);
  if (!trace) {
    return new Response(JSON.stringify({ error: 'Tracé niet gevonden' }), { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseLine(data)));
      };

      try {
        const template = buildOnderzoekTemplate(type, trace, collected, conflicten);

        for await (const event of streamVerrijkRapportMetAnthropic(
          template,
          trace,
          collected,
          conflicten
        )) {
          if (event.event === 'error') {
            send(event);
            continue;
          }

          if (event.event === 'done') {
            completeActionsForOnderzoekType(traceId, type, actionId);
          }

          send(event);
        }
      } catch (err) {
        send({
          event: 'error',
          message: err instanceof Error ? err.message : 'Stream mislukt',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
