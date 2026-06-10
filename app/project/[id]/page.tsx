import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapWorkspace } from '@/components/map-workspace';
import { Badge } from '@/components/ui/badge';
import { ProjectActionsPanel } from '@/components/project-actions-panel';
import { ProjectProcessNav, ProjectProcessHint } from '@/components/project-process-nav';
import { ProjectStatusOverview } from '@/components/project-status-overview';
import { ProjectFaseOverzicht } from '@/components/project-fase-overzicht';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';
import { getProject, getTraces, getBestaandNet } from '@/lib/db/store';
import { deriveDeliverableStatuses } from '@/lib/process/deliverable-status';
import { getProjectSummary, FASE_LABELS } from '@/lib/services/project-stats';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { ProjectCalculatieButton } from '@/components/project-calculatie-button';
import { cn } from '@/lib/utils';
import type { TraceFase } from '@/lib/db/types';
import type { ProjectProcessStepId } from '@/lib/navigation/project-process';
import type { StepperStatus } from '@/components/process-stepper';

const FASE_COLORS: Record<TraceFase, string> = {
  VO: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  DO: 'border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[#2D6FE8]',
  UO: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  as_built: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const traces = await getTraces(id);
  const bestaandNet = await getBestaandNet();
  const summary = await getProjectSummary(project);
  const firstTraceId = traces[0]?.id ?? null;
  const deliverableRecords = deriveDeliverableStatuses(traces);

  const stepStatuses: Partial<Record<ProjectProcessStepId, StepperStatus>> = {
    overzicht: 'bezig',
    trace: summary.voortgang > 0 ? (summary.voortgang >= 100 ? 'gereed' : 'bezig') : 'open',
    planning: summary.voortgang >= 50 ? 'bezig' : 'open',
    dossier: summary.voortgang >= 80 ? 'bezig' : 'open',
    rapportage: summary.voortgang >= 100 ? 'gereed' : 'open',
  };

  return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="shrink-0 space-y-2 border-b border-border/60 bg-white/60 px-4 py-3 backdrop-blur-sm">
          <ProjectProcessNav
            projectId={id}
            firstTraceId={firstTraceId}
            stepStatuses={stepStatuses}
          />
          <ProjectProcessHint projectId={id} />
        </div>

        <div className="shrink-0 border-b border-border/60 px-4 py-3">
          <ProjectFaseOverzicht records={deliverableRecords} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="panel-sidebar flex w-full flex-col lg:w-[26rem] xl:w-[28rem]">
          <div className="relative overflow-hidden border-b border-border/60 p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#2D6FE8]/10 blur-2xl" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D6FE8]">Stap 1 · Projectoverzicht</p>
            <h1 className="relative mt-1 font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight text-[#0D1428]">
              {project.naam}
            </h1>
            <p className="relative mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {project.omschrijving}
            </p>
            <div className="relative mt-3 flex flex-wrap gap-2">
              {firstTraceId && (
                <Link
                  href={`/project/${id}/trace/${firstTraceId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#2D6FE8] px-3 py-1 text-[10px] font-medium text-white transition-colors hover:bg-[#2563d4]"
                >
                  Start tracé-engineering
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              <ProjectCalculatieButton projectId={id} />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <ProjectStatusOverview summary={summary} projectId={id} />

            <div className="mt-6 border-t border-border/60 pt-4">
              <h2 className="section-heading mb-3 text-base">
                Acties ({summary.acties.length})
              </h2>
              <ProjectActionsPanel
                actions={summary.acties}
                defaultFilter="te_doen"
                showSummary={false}
              />
            </div>

            <h2 className="section-heading mb-3 mt-6 text-base">
              Tracés ({traces.length})
            </h2>
            <div className="space-y-2">
              {summary.traces.map((traceStat) => {
                const trace = traceStat.trace;
                return (
                  <Link key={trace.id} href={`/project/${id}/trace/${trace.id}`}>
                    <Card className="surface-card overflow-hidden transition-all hover:border-[#2D6FE8]/40 hover:-translate-y-0.5">
                      <CardHeader className="p-3 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: trace.kleur }}
                            />
                            <span className="truncate">{trace.code}</span>
                          </CardTitle>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px]', FASE_COLORS[trace.fase])}
                            >
                              {trace.fase}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground">{trace.naam}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {trace.wegnaam} · {trace.leglocatie}
                        </p>
                        <div className="mt-2">
                          <ProgressBar value={traceStat.voortgang} showLabel />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {DISCIPLINE_LABELS[trace.discipline]}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {traceLengthM(trace.coordinates, trace.traceLines)} m
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {traceStat.openStappen} open stappen
                          </span>
                          {traceStat.blokkerendeConflicten > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-600">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {traceStat.blokkerendeConflicten} blokkerend
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {FASE_LABELS[trace.fase]}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-[400px] flex-1 flex-col lg:min-h-0">
          <MapWorkspace
            traces={traces}
            bestaandNet={bestaandNet}
            height="100%"
            editable={false}
            lazyLayers={false}
          />
        </div>
        </div>
      </div>
  );
}
