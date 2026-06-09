import Link from 'next/link';
import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProgressBar } from '@/components/progress-bar';
import { ProjectActionsSummary } from '@/components/project-actions-panel';
import type { ProjectSummary } from '@/lib/services/project-stats';
import {
  FASE_LABELS,
  getProjectWorkOverview,
  type ProjectWorkCategory,
  type WorkCategoryId,
} from '@/lib/services/project-stats';
import type { TraceFase } from '@/lib/db/types';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  ClipboardCheck,
  FileStack,
  FlaskConical,
  FolderOpen,
  GitBranch,
  MapPin,
  PenTool,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<WorkCategoryId, ComponentType<{ className?: string }>> = {
  onderzoek: FlaskConical,
  berekening: Calculator,
  tekening: PenTool,
  vergunning: Scale,
  data_toets: MapPin,
  dossier: FileStack,
  review: ClipboardCheck,
};

const FASE_COLORS: Record<TraceFase, string> = {
  VO: 'bg-amber-500',
  DO: 'bg-[#2D6FE8]',
  UO: 'bg-violet-500',
  as_built: 'bg-emerald-500',
};

interface ProjectStatusOverviewProps {
  summary: ProjectSummary;
  projectId: string;
}

function WorkCategoryCard({
  category,
  projectId,
}: {
  category: ProjectWorkCategory;
  projectId: string;
}) {
  const Icon = CATEGORY_ICONS[category.id];
  const open = category.teDoen + category.blokkerend;
  const hasWork = open > 0 || category.bezig > 0;
  const firstTrace = category.traceHints[0];
  const href = firstTrace
    ? `/project/${projectId}/trace/${firstTrace.traceId}`
    : `/project/${projectId}/dossier`;

  return (
    <Link href={href}>
      <Card
        className={cn(
          'surface-card h-full transition-all hover:border-[#2D6FE8]/40 hover:-translate-y-0.5',
          category.blokkerend > 0 && 'border-red-500/30',
          !hasWork && category.afgerond > 0 && 'opacity-75'
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  hasWork ? 'bg-[#2D6FE8]/10' : 'bg-muted'
                )}
              >
                <Icon
                  className={cn('h-3.5 w-3.5', hasWork ? 'text-[#2D6FE8]' : 'text-muted-foreground')}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{category.label}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{category.beschrijving}</p>
              </div>
            </div>
            {category.blokkerend > 0 && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {open > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {open} te doen
              </Badge>
            )}
            {category.bezig > 0 && (
              <Badge
                variant="outline"
                className="border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[10px] text-[#2D6FE8]"
              >
                {category.bezig} bezig
              </Badge>
            )}
            {category.afgerond > 0 && open === 0 && category.bezig === 0 && (
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
              >
                {category.afgerond} klaar
              </Badge>
            )}
          </div>

          {category.traceHints.length > 0 && (
            <p className="mt-2 text-[10px] text-muted-foreground line-clamp-1">
              {category.traceHints.map((h) => h.traceCode).join(' · ')}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProjectStatusOverview({ summary, projectId }: ProjectStatusOverviewProps) {
  const work = getProjectWorkOverview(summary);
  const { project } = summary;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-[#2D6FE8]/10 bg-gradient-to-br from-[#2D6FE8]/5 to-white">
        <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStatusBadge status={project.status} />
              <Badge variant="outline" className="text-[10px]">
                {project.gebied}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{project.projectnummer}</p>
            <p className="text-[11px] text-muted-foreground">{project.opdrachtgever}</p>
          </div>
          <Link
            href={`/project/${projectId}/dossier`}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-[#2D6FE8]/50 hover:text-[#2D6FE8]"
          >
            <FolderOpen className="h-3 w-3" />
            Dossier
          </Link>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Projectvoortgang</span>
            <span className="font-[family-name:var(--font-ibm-plex-mono)] font-medium">
              {summary.voortgang}%
            </span>
          </div>
          <ProgressBar value={summary.voortgang} />
        </div>

        <ProjectActionsSummary
          openActies={summary.openActies}
          bezigActies={summary.bezigActies}
          afgerondeActies={summary.afgerondeActies}
          blokkerendeActies={summary.blokkerendeActies}
        />

        {(summary.conflicten > 0 || summary.blokkerendeConflicten > 0) && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-2 text-[11px]',
              summary.blokkerendeConflicten > 0
                ? 'border-red-500/30 bg-red-500/5 text-red-700'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-800'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {summary.conflicten} conflict{summary.conflicten !== 1 ? 'en' : ''}
              {summary.blokkerendeConflicten > 0 &&
                ` · ${summary.blokkerendeConflicten} blokkerend`}
            </span>
          </div>
        )}
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-heading text-sm">Openstaand werk</h2>
          {work.totaalTeDoen + work.totaalBezig > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {work.totaalTeDoen} te doen · {work.totaalBezig} bezig
            </span>
          )}
        </div>

        {work.categories.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
            Geen openstaand werk — project is op schema
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {work.categories.map((cat) => (
              <WorkCategoryCard key={cat.id} category={cat} projectId={projectId} />
            ))}
          </div>
        )}
      </div>

      {work.prioriteitItems.length > 0 && (
        <div>
          <h2 className="section-heading mb-2 text-sm">Prioriteit</h2>
          <div className="space-y-1.5">
            {work.prioriteitItems.map((item) => (
              <Link key={item.id} href={item.href}>
                <div
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-md border border-border px-2.5 py-2 transition-colors hover:border-[#2D6FE8]/50',
                    item.status === 'blokkerend' && 'border-red-500/30 bg-red-500/5'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2">{item.label}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {item.traceCode && (
                        <span className="font-mono text-[10px] text-muted-foreground">{item.traceCode}</span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {WORK_CATEGORY_META_LABEL[item.category]}
                      </Badge>
                    </div>
                  </div>
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="section-heading text-sm">Tracéfases</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(work.tracesPerFase) as [TraceFase, number][])
            .filter(([, count]) => count > 0)
            .map(([fase, count]) => (
              <Badge key={fase} variant="outline" className="gap-1.5 text-[10px]">
                <span className={cn('h-1.5 w-1.5 rounded-full', FASE_COLORS[fase])} />
                {FASE_LABELS[fase]} · {count}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}

const WORK_CATEGORY_META_LABEL: Record<WorkCategoryId, string> = {
  onderzoek: 'Onderzoek',
  berekening: 'Berekening',
  tekening: 'Tekening',
  vergunning: 'Vergunning',
  data_toets: 'Data & toets',
  dossier: 'Dossier',
  review: 'Review',
};
