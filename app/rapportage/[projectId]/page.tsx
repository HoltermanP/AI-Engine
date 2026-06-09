import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { ProjectRapportageView } from '@/components/project-rapportage-view';
import { ProjectProcessNav, ProjectProcessHint } from '@/components/project-process-nav';
import { DEMO_USER } from '@/lib/auth';
import { getProjectRapportage } from '@/lib/services/reporting';
import { getTraces } from '@/lib/db/store';

interface ProjectRapportagePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectRapportagePage({ params }: ProjectRapportagePageProps) {
  const { projectId } = await params;
  const rapport = await getProjectRapportage(projectId);

  if (!rapport) {
    notFound();
  }

  const traces = await getTraces(projectId);
  const firstTraceId = traces[0]?.id ?? null;

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <div className="mb-4 space-y-2">
          <ProjectProcessNav projectId={projectId} firstTraceId={firstTraceId} />
          <ProjectProcessHint projectId={projectId} />
        </div>
        <PageHero
          eyebrow="Stap 5 · Rapportage"
          title={rapport.projectNaam}
          subtitle={`${rapport.projectnummer} · ${rapport.opdrachtgever} · voortgang ${rapport.voortgang}%`}
          backLink={{ href: `/project/${projectId}`, label: 'Terug naar projectoverzicht' }}
        />
        <ProjectRapportageView rapport={rapport} />
      </PageContainer>
    </AppShell>
  );
}
