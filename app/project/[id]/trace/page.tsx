'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFirstTraceIdAction } from '@/lib/actions/data';
import TraceLoading from './[traceId]/loading';

/** Client-side doorverwijzing — houdt AppShell gemonteerd (geen wit scherm) */
export default function TraceEntryPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    let cancelled = false;

    getFirstTraceIdAction(projectId).then((traceId) => {
      if (cancelled) return;
      if (traceId) {
        router.replace(`/project/${projectId}/trace/${traceId}`);
      } else {
        router.replace(`/project/${projectId}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  return <TraceLoading />;
}
