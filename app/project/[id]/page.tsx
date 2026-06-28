import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProject, getTraces, getBestaandNet } from '@/lib/db/store';
import { getNetontwerpAction } from '@/lib/actions/netontwerp';
import { getEnvStatus } from '@/lib/connectors/config';
import { demoTraceToMapTrace } from '@/lib/trace-edit';
import { ProjectCockpit } from '@/components/project-cockpit/project-cockpit';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Project-cockpit host: laadt alle projectdata één keer server-side en geeft die
 * door aan de blijvende-kaart cockpit. De actieve processtap zit in `?stap=`,
 * binnen deze ene route, zodat de kaart niet herlaadt bij stapwissels.
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [allTraces, bestaandNetRaw, initieelNetontwerp] = await Promise.all([
    getTraces(id),
    getBestaandNet(),
    getNetontwerpAction(id),
  ]);
  const { anthropicConfigured } = getEnvStatus();

  const initialTraces = allTraces.map(demoTraceToMapTrace);
  const bestaandNet = bestaandNetRaw.map((n) => ({
    id: n.id,
    thema: n.thema,
    beheerder: n.beheerder,
    coordinates: n.coordinates,
    vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
  }));

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cockpit laden…</div>}>
      <ProjectCockpit
        projectId={id}
        projectNaam={`${project.naam} · ${project.projectnummer}`}
        allTraces={allTraces}
        initialTraces={initialTraces}
        bestaandNet={bestaandNet}
        initialCollected={null}
        initialConflicten={[]}
        initieelNetontwerp={initieelNetontwerp}
        anthropicConfigured={anthropicConfigured}
      />
    </Suspense>
  );
}
