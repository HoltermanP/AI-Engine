import { Client } from '@upstash/qstash';

export function isQStashConfigured(): boolean {
  return !!process.env.QSTASH_TOKEN && !process.env.QSTASH_TOKEN.includes('placeholder');
}

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return 'http://localhost:3000';
}

export async function enqueueCollectJob(traceId: string): Promise<{ mode: 'async' | 'sync'; messageId?: string }> {
  if (!isQStashConfigured()) {
    return { mode: 'sync' };
  }

  const client = new Client({ token: process.env.QSTASH_TOKEN! });
  const result = await client.publishJSON({
    url: `${getBaseUrl()}/api/jobs/collect`,
    body: { traceId },
    retries: 2,
  });

  return { mode: 'async', messageId: result.messageId };
}
