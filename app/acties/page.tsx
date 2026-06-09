import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { OpenActiesDashboard } from '@/components/open-acties-dashboard';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { DEMO_USER } from '@/lib/auth';
import { getAllProjectSummaries, getProjectActions } from '@/lib/services/project-stats';

export default async function ActiesPage() {
  const summaries = await getAllProjectSummaries();
  const actions = getProjectActions();
  const projectNames = Object.fromEntries(summaries.map((s) => [s.project.id, s.project.naam]));
  const openCount = actions.filter((a) => a.status !== 'afgerond').length;

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          eyebrow="Actiemanagement"
          title="Openstaande acties"
          subtitle="Houd planningsdiscipline met signalering op groen, oranje en rood — filter op prioriteit en pak blokkerende items direct aan."
          footer={
            <p className="text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-[#0D1428]">{openCount}</span> open acties in
              het portfolio
            </p>
          }
        />
        <Suspense fallback={<p className="text-sm text-muted-foreground">Acties laden…</p>}>
          <OpenActiesDashboard actions={actions} projectNames={projectNames} />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
