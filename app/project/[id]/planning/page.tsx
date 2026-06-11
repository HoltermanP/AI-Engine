import { notFound } from 'next/navigation';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { ProjectPlanningView } from '@/components/project-planning-view';
import { getProject } from '@/lib/db/store';
interface PlanningPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPlanningPage({ params }: PlanningPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
      <PageContainer>
        <PageHero
          eyebrow="Planning"
          title="Projectplanning"
          subtitle={`${project.naam} · ${project.projectnummer}`}
          backLink={{ href: `/project/${id}`, label: 'Terug naar projectoverzicht' }}
        />
        <ProjectPlanningView projectId={id} />
      </PageContainer>
  );
}
