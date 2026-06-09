import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { ManagementDashboard } from '@/components/management-dashboard';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_USER } from '@/lib/auth';
import { getAllProjectSummaries, getManagementKPIs } from '@/lib/services/project-stats';
import type { ProjectStatus } from '@/demo/projects';
import { ArrowLeft } from 'lucide-react';

interface BeheerPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function BeheerPage({ searchParams }: BeheerPageProps) {
  const params = await searchParams;
  const summaries = await getAllProjectSummaries();
  const kpis = await getManagementKPIs(summaries);

  const highlightStatus = ['actief', 'concept', 'afgerond'].includes(params.status ?? '')
    ? (params.status as ProjectStatus)
    : undefined;

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          eyebrow="Management"
          title="Portfolio in één oogopslag"
          subtitle="KPI's, risico-indicatoren en operationele inzichten over alle projecten — van pipeline tot opdrachtgevers."
          actions={
            <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'bg-white/80' })}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Projectenoverzicht
            </Link>
          }
          footer={
            highlightStatus ? (
              <p className="text-xs font-medium text-[#2D6FE8]">Filter actief: status {highlightStatus}</p>
            ) : undefined
          }
        />

        <ManagementDashboard kpis={kpis} summaries={summaries} highlightStatus={highlightStatus} />
      </PageContainer>
    </AppShell>
  );
}
