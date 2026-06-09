import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { TraceWorkspace } from '@/components/trace-workspace';
import {
  getProject,
  getTrace,
  getTraces,
  getCollectedTraceData,
  getPersistedTraceToets,
} from '@/lib/db/store';
import { isPersistedToetsValidForGeometry } from '@/lib/services/trace-toets';
import { getKlicForTrace } from '@/demo/klic';
import { getResolvedActionById } from '@/lib/services/action-store';
import { parseTracePhaseParam } from '@/lib/navigation/action-links';
import { getEnvStatus } from '@/lib/connectors/config';

interface TracePageProps {
  params: Promise<{ id: string; traceId: string }>;
  searchParams: Promise<{ actie?: string; fase?: string; stap?: string }>;
}

export default async function TracePage({ params, searchParams }: TracePageProps) {
  const { id, traceId } = await params;
  const query = await searchParams;
  const project = await getProject(id);
  const trace = await getTrace(traceId);
  if (!project || !trace || trace.projectId !== id) notFound();

  const allTraces = await getTraces(id);
  const bestaandNet = getKlicForTrace(traceId);
  const initialCollected = await getCollectedTraceData(traceId);
  const persistedToets = await getPersistedTraceToets(traceId);
  const initialToets = isPersistedToetsValidForGeometry(persistedToets, trace.coordinates)
    ? persistedToets
    : null;
  const linkedAction = query.actie ? getResolvedActionById(query.actie) : null;
  const initialPhase = parseTracePhaseParam(query.fase ?? null);
  const { anthropicConfigured } = getEnvStatus();

  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Tracé laden…</p>}>
      <TraceWorkspace
        projectId={id}
        trace={trace}
        allTraces={allTraces}
        initialBestaandNet={bestaandNet}
        initialCollected={initialCollected}
        initialToets={initialToets}
        linkedAction={linkedAction}
        initialPhase={initialPhase}
        anthropicConfigured={anthropicConfigured}
      />
    </Suspense>
  );
}
