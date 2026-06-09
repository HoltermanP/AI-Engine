import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { ProjectPlanningView } from '@/components/project-planning-view';
import { ProjectProcessNav, ProjectProcessHint } from '@/components/project-process-nav';
import { getProject, getTraces } from '@/lib/db/store';
interface PlanningPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPlanningPage({ params }: PlanningPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const traces = await getTraces(id);
  const firstTraceId = traces[0]?.id ?? null;

  return (
      <PageContainer>
        <div className="mb-4 space-y-2">
          <ProjectProcessNav projectId={id} firstTraceId={firstTraceId} />
          <ProjectProcessHint projectId={id} />
        </div>
        <PageHero
          eyebrow="Stap 3 · Planning"
          title="Projectplanning"
          subtitle={`${project.naam} · ${project.projectnummer}`}
          backLink={{ href: `/project/${id}`, label: 'Terug naar projectoverzicht' }}
        />
        <ProjectPlanningView projectId={id} />
      </PageContainer>
  );
}
