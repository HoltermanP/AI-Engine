import Link from 'next/link';
import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { TraceFilteredOverview } from '@/components/trace-filtered-overview';
import { buttonVariants } from '@/components/ui/button';
import { DEMO_USER } from '@/lib/auth';
import { getEnrichedTraces } from '@/lib/services/project-stats';
import { FASE_LABELS } from '@/lib/db/types';
import type { TraceFase } from '@/lib/db/types';
import { ArrowLeft } from 'lucide-react';

interface TracesPageProps {
  searchParams: Promise<{ fase?: string }>;
}

function pageTitle(fase?: string): string {
  if (fase && ['VO', 'DO', 'UO', 'as_built'].includes(fase)) {
    return `Tracés in ${FASE_LABELS[fase as TraceFase]}`;
  }
  return 'Tracéoverzicht portfolio';
}

function pageSubtitle(fase?: string): string {
  if (fase && ['VO', 'DO', 'UO', 'as_built'].includes(fase)) {
    return `Gefilterd op ${FASE_LABELS[fase as TraceFase]} — voortgang, conflicten en locatiegegevens per tracé.`;
  }
  return 'Overzicht van alle tracés in het portfolio — filter op fase, discipline, uitvoeringsstatus en conflicten en ga door naar de projectcockpit.';
}

export default async function TracesPage({ searchParams }: TracesPageProps) {
  const params = await searchParams;
  const traces = await getEnrichedTraces();

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          eyebrow="Tracés"
          title={pageTitle(params.fase)}
          subtitle={pageSubtitle(params.fase)}
          actions={
            <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'bg-white/80' })}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          }
        />

        <Suspense fallback={<p className="text-sm text-muted-foreground">Tracés laden…</p>}>
          <TraceFilteredOverview traces={traces} />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
