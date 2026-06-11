import { notFound } from 'next/navigation';
import { getProject, getTraces } from '@/lib/db/store';
import { getNetontwerpAction } from '@/lib/actions/netontwerp';
import { demoTraceToMapTrace } from '@/lib/trace-edit';
import { NetontwerpWorkspace } from '@/components/netontwerp/netontwerp-workspace';

interface NetontwerpPageProps {
  params: Promise<{ id: string }>;
}

export default async function NetontwerpPage({ params }: NetontwerpPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const ontwerp = await getNetontwerpAction(id);
  const alleTraces = await getTraces(id);

  // Elektra-tracés van het project; gekoppelde tracés van het ontwerp eerst
  const elektraTraces = alleTraces.filter(
    (t) => t.discipline === 'elektra_ls' || t.discipline === 'elektra_ms',
  );
  const traceIds = new Set(ontwerp.traceIds);
  const relevant = [...elektraTraces].sort(
    (a, b) => Number(traceIds.has(b.id)) - Number(traceIds.has(a.id)),
  );
  // Koppel projecttracés automatisch wanneer het ontwerp nog geen tracés kent
  const ontwerpMetTraces =
    ontwerp.traceIds.length === 0 && relevant.length > 0
      ? { ...ontwerp, traceIds: relevant.map((t) => t.id) }
      : ontwerp;

  return (
    <div className="h-[calc(100dvh-3.5rem)]">
      <NetontwerpWorkspace
        initieleOntwerp={ontwerpMetTraces}
        initieleTraces={relevant.map(demoTraceToMapTrace)}
      />
    </div>
  );
}
