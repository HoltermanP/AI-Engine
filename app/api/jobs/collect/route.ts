import { Receiver } from '@upstash/qstash';
import { NextResponse } from 'next/server';
import { collectTraceData } from '@/lib/services/collect-trace-data';
import { toetsTraceAction } from '@/lib/actions/trace';

async function handler(request: Request) {
  const body = (await request.json()) as { traceId: string };
  if (!body.traceId) {
    return NextResponse.json({ error: 'traceId vereist' }, { status: 400 });
  }

  const data = await collectTraceData(body.traceId);
  const conflicten = await toetsTraceAction(body.traceId, data);

  return NextResponse.json({
    ok: true,
    traceId: body.traceId,
    collectedAt: data.collectedAt,
    sources: data.sources,
    conflictCount: conflicten.length,
  });
}

export async function POST(request: Request) {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (currentKey && nextKey) {
    const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey });
    const signature = request.headers.get('upstash-signature') ?? '';
    const body = await request.text();
    const isValid = await receiver.verify({ signature, body });
    if (!isValid) {
      return NextResponse.json({ error: 'Ongeldige QStash-signatuur' }, { status: 401 });
    }
    const parsed = JSON.parse(body) as { traceId: string };
    const data = await collectTraceData(parsed.traceId);
    const conflicten = await toetsTraceAction(parsed.traceId, data);
    return NextResponse.json({ ok: true, traceId: parsed.traceId, conflictCount: conflicten.length });
  }

  return handler(request);
}
