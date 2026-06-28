import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { EnhancedKpiDashboard } from '@/components/enhanced-kpi-dashboard';
import { KpiStrip } from '@/components/kpi-strip';
import { WorkflowOverview } from '@/components/workflow-overview';
import { PageContainer } from '@/components/page-container';
import { ProjectOverview } from '@/components/project-overview';
import { DEMO_USER } from '@/lib/auth';
import { enrichActions } from '@/lib/services/action-signals';
import { getAllProjectSummaries, getManagementKPIs, getProjectActions } from '@/lib/services/project-stats';
import { bepaalPortfolioSignalen } from '@/lib/services/termijnbewaking';
import { TermijnWidget } from '@/components/termijn-widget';
import { NieuwProjectWizard } from '@/components/nieuw-project-wizard';
import { ChevronDown } from 'lucide-react';

export default async function DashboardPage() {
  const summaries = await getAllProjectSummaries();
  const kpis = await getManagementKPIs(summaries);
  const portfolioSignalen = bepaalPortfolioSignalen(2).slice(0, 5);
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
        {/* Smalle KPI-strip — overzicht in één oogopslag, klikbaar */}
        <KpiStrip kpis={kpis} />

        {/* Projecten — primair: hier kies je snel een project */}
        <section id="projecten" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-heading">Projecten</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {kpis.actieveProjecten} actief · {kpis.totaalTraces} tracés ·{' '}
                {kpis.totaleTracelengteKm} km totaal
              </p>
            </div>
            <NieuwProjectWizard />
          </div>
          <Suspense fallback={<p className="text-sm text-muted-foreground">Projecten laden…</p>}>
            <ProjectOverview summaries={summaries} />
          </Suspense>
        </section>

        {/* Secundair: termijnen, procesoverzicht en portfolio-detail */}
        {portfolioSignalen.length > 0 && (
          <TermijnWidget signalen={portfolioSignalen} toonProject />
        )}

        <WorkflowOverview />

        <details className="group rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground">
            <span>Portfolio in detail (KPI’s, tracés per fase, disciplines)</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <EnhancedKpiDashboard kpis={kpis} actiesPerSignaal={actiesPerSignaal} />
          </div>
        </details>
      </PageContainer>
    </AppShell>
  );
}
