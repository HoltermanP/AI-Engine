import Link from 'next/link';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { EnhancedKpiDashboard } from '@/components/enhanced-kpi-dashboard';
import { WorkflowOverview } from '@/components/workflow-overview';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { ProjectOverview } from '@/components/project-overview';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_USER } from '@/lib/auth';
import { enrichActions } from '@/lib/services/action-signals';
import { getAllProjectSummaries, getManagementKPIs, getProjectActions } from '@/lib/services/project-stats';
import { cn } from '@/lib/utils';
import { ArrowRight, BarChart3, ClipboardList, FileBarChart, Map } from 'lucide-react';

export default async function DashboardPage() {
  const summaries = await getAllProjectSummaries();
  const kpis = await getManagementKPIs(summaries);
  const actions = getProjectActions();
  const enriched = enrichActions(actions.filter((a) => a.status !== 'afgerond'));
  const actiesPerSignaal = {
    groen: enriched.filter((a) => a.signaal === 'groen').length,
    oranje: enriched.filter((a) => a.signaal === 'oranje').length,
    rood: enriched.filter((a) => a.signaal === 'rood').length,
  };

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          userName={DEMO_USER.naam}
          showGreeting
          title="Jouw infrastructuur, onder controle"
          subtitle="Van tracé-ontwerp tot dossier — volg voortgang, los conflicten op en houd grip op elk project in één overzicht."
          actions={
            <>
              <Link
                href="/project/demo-project-001"
                className={cn(buttonVariants({ size: 'sm' }), 'shadow-md shadow-[#2D6FE8]/25')}
              >
                <Map className="h-3.5 w-3.5" />
                Naar werkruimte
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/rapportage"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white/80')}
              >
                <FileBarChart className="h-3.5 w-3.5" />
                Rapportage
              </Link>
              <Link
                href="/acties"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white/80')}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Open acties
              </Link>
              <Link href="/beheer" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                <BarChart3 className="h-3.5 w-3.5" />
                Beheer
              </Link>
            </>
          }
        />

        <EnhancedKpiDashboard kpis={kpis} actiesPerSignaal={actiesPerSignaal} />

        <WorkflowOverview />

        <div id="projecten" className="space-y-4">
          <div>
            <h2 className="section-heading">Alle projecten</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {kpis.actieveProjecten} actief · {kpis.totaalTraces} tracés · {kpis.totaleTracelengteKm} km totaal
            </p>
          </div>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Projecten laden…</p>}>
            <ProjectOverview summaries={summaries} />
          </Suspense>
        </div>
      </PageContainer>
    </AppShell>
  );
}
