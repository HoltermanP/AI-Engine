'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectAction } from '@/demo/project-actions';
import { getActionHref } from '@/lib/navigation/action-links';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<ProjectAction['type'], string> = {
  onderzoek: 'Onderzoek',
  vergunning: 'Vergunning',
  engineering: 'Engineering',
  review: 'Review',
  deadline: 'Deadline',
};

const STATUS_LABELS: Record<ProjectAction['status'], string> = {
  open: 'Te doen',
  blokkerend: 'Blokkerend',
  bezig: 'In uitvoering',
  afgerond: 'Afgerond',
};

const STATUS_STYLES: Record<ProjectAction['status'], string> = {
  open: 'border-border text-muted-foreground',
  blokkerend: 'border-red-500/40 bg-red-500/10 text-red-600',
  bezig: 'border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[#2D6FE8]',
  afgerond: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

const PRIORITEIT_STYLES: Record<ProjectAction['prioriteit'], string> = {
  hoog: 'border-red-500/40 bg-red-500/10 text-red-600',
  normaal: 'border-border text-muted-foreground',
  laag: 'border-border text-muted-foreground/70',
};

type ActionFilter = 'alle' | 'te_doen' | 'bezig' | 'afgerond';

const FILTER_GROUPS: Record<Exclude<ActionFilter, 'alle'>, ProjectAction['status'][]> = {
  te_doen: ['open', 'blokkerend'],
  bezig: ['bezig'],
  afgerond: ['afgerond'],
};

function sortActions(actions: ProjectAction[]): ProjectAction[] {
  return [...actions].sort((a, b) => {
    const statusOrder: Record<ProjectAction['status'], number> = {
      blokkerend: 0,
      open: 1,
      bezig: 2,
      afgerond: 3,
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    const prioDiff =
      (a.prioriteit === 'hoog' ? 0 : a.prioriteit === 'normaal' ? 1 : 2) -
      (b.prioriteit === 'hoog' ? 0 : b.prioriteit === 'normaal' ? 1 : 2);
    if (prioDiff !== 0) return prioDiff;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.afgerondOp && b.afgerondOp) return b.afgerondOp.localeCompare(a.afgerondOp);
    return 0;
  });
}

function countByFilter(actions: ProjectAction[], filter: Exclude<ActionFilter, 'alle'>): number {
  return actions.filter((a) => FILTER_GROUPS[filter].includes(a.status)).length;
}

function ActionCard({
  action,
  projectNames,
  showProjectName,
}: {
  action: ProjectAction;
  projectNames?: Record<string, string>;
  showProjectName?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue =
    action.deadline && action.deadline < today && action.status !== 'afgerond';
  const href = getActionHref(action);

  const StatusIcon =
    action.status === 'afgerond'
      ? CheckCircle2
      : action.status === 'bezig'
        ? Loader2
        : action.status === 'blokkerend'
          ? AlertTriangle
          : Circle;

  return (
    <Link key={action.id} href={href}>
      <Card
        className={cn(
          'transition-colors hover:border-[#2D6FE8]/50',
          action.status === 'afgerond' && 'opacity-80 hover:opacity-100'
        )}
      >
        <CardContent className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusIcon
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  action.status === 'afgerond' && 'text-emerald-600',
                  action.status === 'bezig' && 'animate-spin text-[#2D6FE8]',
                  action.status === 'blokkerend' && 'text-red-500',
                  action.status === 'open' && 'text-muted-foreground/50'
                )}
              />
              <p
                className={cn(
                  'text-sm font-medium text-foreground',
                  action.status === 'afgerond' && 'text-muted-foreground line-through decoration-muted-foreground/50'
                )}
              >
                {action.titel}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {showProjectName && projectNames?.[action.projectId] && (
                <span>{projectNames[action.projectId]}</span>
              )}
              {action.traceCode && (
                <span className="font-mono text-[10px]">{action.traceCode}</span>
              )}
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABELS[action.type]}
              </Badge>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn('text-[10px]', STATUS_STYLES[action.status])}
            >
              {STATUS_LABELS[action.status]}
            </Badge>
            {action.prioriteit === 'hoog' && action.status !== 'afgerond' && (
              <Badge
                variant="outline"
                className={cn('text-[10px]', PRIORITEIT_STYLES[action.prioriteit])}
              >
                {action.prioriteit}
              </Badge>
            )}
            {action.deadline && action.status !== 'afgerond' && (
              <span
                className={cn(
                  'flex items-center gap-1 text-[10px]',
                  isOverdue ? 'text-red-600' : 'text-muted-foreground'
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-2.5 w-2.5" />
                ) : (
                  <Calendar className="h-2.5 w-2.5" />
                )}
                {action.deadline}
              </span>
            )}
            {action.afgerondOp && action.status === 'afgerond' && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {action.afgerondOp}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProjectActionsSummary({
  openActies,
  bezigActies,
  afgerondeActies,
  blokkerendeActies,
  compact,
}: {
  openActies: number;
  bezigActies: number;
  afgerondeActies: number;
  blokkerendeActies: number;
  compact?: boolean;
}) {
  const teDoen = openActies;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {teDoen > 0 && (
          <Badge variant="outline" className="text-[10px]">
            <Circle className="mr-0.5 h-2 w-2" />
            {teDoen} te doen
          </Badge>
        )}
        {bezigActies > 0 && (
          <Badge variant="outline" className="border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[10px] text-[#2D6FE8]">
            <Clock className="mr-0.5 h-2 w-2" />
            {bezigActies}
          </Badge>
        )}
        {afgerondeActies > 0 && (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mr-0.5 h-2 w-2" />
            {afgerondeActies}
          </Badge>
        )}
        {blokkerendeActies > 0 && (
          <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-[10px] text-red-600">
            <AlertTriangle className="mr-0.5 h-2 w-2" />
            {blokkerendeActies}
          </Badge>
        )}
        {teDoen === 0 && bezigActies === 0 && afgerondeActies === 0 && (
          <span className="text-xs text-muted-foreground">Geen acties</span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-md border border-border px-2 py-1.5 text-center">
        <p className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold text-foreground">
          {teDoen}
        </p>
        <p className="text-[10px] text-muted-foreground">Te doen</p>
        {blokkerendeActies > 0 && (
          <p className="mt-0.5 text-[10px] text-red-600">{blokkerendeActies} blokkerend</p>
        )}
      </div>
      <div className="rounded-md border border-[#2D6FE8]/30 bg-[#2D6FE8]/5 px-2 py-1.5 text-center">
        <p className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold text-[#2D6FE8]">
          {bezigActies}
        </p>
        <p className="text-[10px] text-muted-foreground">In uitvoering</p>
      </div>
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5 text-center">
        <p className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold text-emerald-700 dark:text-emerald-400">
          {afgerondeActies}
        </p>
        <p className="text-[10px] text-muted-foreground">Afgerond</p>
      </div>
    </div>
  );
}

interface ProjectActionsPanelProps {
  actions: ProjectAction[];
  projectNames?: Record<string, string>;
  showProjectName?: boolean;
  limit?: number;
  defaultFilter?: ActionFilter;
  showSummary?: boolean;
}

export function ProjectActionsPanel({
  actions,
  projectNames,
  showProjectName = false,
  limit,
  defaultFilter = 'alle',
  showSummary = true,
}: ProjectActionsPanelProps) {
  const teDoenCount = countByFilter(actions, 'te_doen');
  const bezigCount = countByFilter(actions, 'bezig');
  const afgerondCount = countByFilter(actions, 'afgerond');
  const blokkerendCount = actions.filter((a) => a.status === 'blokkerend').length;

  function getFiltered(filter: ActionFilter): ProjectAction[] {
    const filtered =
      filter === 'alle'
        ? sortActions(actions)
        : sortActions(actions.filter((a) => FILTER_GROUPS[filter].includes(a.status)));
    return limit ? filtered.slice(0, limit) : filtered;
  }

  if (actions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">Geen acties voor dit project</p>
    );
  }

  return (
    <div className="space-y-3">
      {showSummary && (
        <ProjectActionsSummary
          openActies={teDoenCount}
          bezigActies={bezigCount}
          afgerondeActies={afgerondCount}
          blokkerendeActies={blokkerendCount}
        />
      )}

      <Tabs defaultValue={defaultFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="alle" className="flex-1 text-xs">
            Alles
            <span className="ml-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] opacity-70">
              {actions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="te_doen" className="flex-1 text-xs">
            Te doen
            <span className="ml-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] opacity-70">
              {teDoenCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bezig" className="flex-1 text-xs">
            Uitvoering
            <span className="ml-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] opacity-70">
              {bezigCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value="afgerond" className="flex-1 text-xs">
            Afgerond
            <span className="ml-1 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] opacity-70">
              {afgerondCount}
            </span>
          </TabsTrigger>
        </TabsList>

        {(['alle', 'te_doen', 'bezig', 'afgerond'] as ActionFilter[]).map((filter) => {
          const filtered = getFiltered(filter);
          return (
            <TabsContent key={filter} value={filter} className="mt-3">
              {filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {filter === 'te_doen' && 'Geen openstaande acties'}
                  {filter === 'bezig' && 'Geen acties in uitvoering'}
                  {filter === 'afgerond' && 'Nog geen afgeronde acties'}
                  {filter === 'alle' && 'Geen acties'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      projectNames={projectNames}
                      showProjectName={showProjectName}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
