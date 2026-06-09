'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/progress-bar';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ClickableStatCard } from '@/components/clickable-stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EnrichedTraceRow } from '@/lib/services/trace-filters';
import { countTracesPerFase, filterTraces } from '@/lib/services/trace-filters';
import {
  DISCIPLINE_LABELS,
  FASE_LABELS,
  type Discipline,
  type TraceFase,
} from '@/lib/db/types';
import { TRACE_PHASES } from '@/lib/process/phases';
import {
  parseTraceConflicten,
  parseTraceDiscipline,
  parseTraceFase,
  tracesUrl,
} from '@/lib/navigation/dashboard-links';
import {
  AlertTriangle,
  ArrowRight,
  GitBranch,
  MapPin,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraceFilteredOverviewProps {
  traces: EnrichedTraceRow[];
}

const FASE_COLORS: Record<TraceFase, string> = {
  VO: 'bg-slate-500',
  DO: 'bg-[#2D6FE8]',
  UO: 'bg-amber-500',
  as_built: 'bg-emerald-500',
};

const FASE_ACCENT: Record<TraceFase, string> = {
  VO: 'ring-slate-500/30',
  DO: 'ring-[#2D6FE8]/40',
  UO: 'ring-amber-500/30',
  as_built: 'ring-emerald-500/30',
};

function formatLengte(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function buildPageTitle(params: {
  fase: TraceFase | null;
  discipline: Discipline | null;
  uitvoering: boolean;
  conflicten: 'alle' | 'blokkerend' | null;
}): string {
  if (params.fase) return FASE_LABELS[params.fase];
  if (params.uitvoering) return 'Klaar voor uitvoering';
  if (params.conflicten === 'blokkerend') return 'Tracés met blokkerende conflicten';
  if (params.conflicten === 'alle') return 'Tracés met conflicten';
  if (params.discipline) return DISCIPLINE_LABELS[params.discipline];
  return 'Alle tracés';
}

export function TraceFilteredOverview({ traces }: TraceFilteredOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');

  const faseFilter = parseTraceFase(searchParams.get('fase'));
  const disciplineFilter = parseTraceDiscipline(searchParams.get('discipline'));
  const uitvoeringFilter = searchParams.get('uitvoering') === 'klaar';
  const conflictenFilter = parseTraceConflicten(searchParams.get('conflicten'));

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: {
      fase?: TraceFase | null;
      discipline?: Discipline | null;
      uitvoering?: boolean;
      conflicten?: 'alle' | 'blokkerend' | null;
      q?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const fase = updates.fase !== undefined ? updates.fase : faseFilter;
      const discipline = updates.discipline !== undefined ? updates.discipline : disciplineFilter;
      const uitvoering = updates.uitvoering !== undefined ? updates.uitvoering : uitvoeringFilter;
      const conflicten =
        updates.conflicten !== undefined ? updates.conflicten : conflictenFilter;
      const q = updates.q ?? search;

      if (fase) params.set('fase', fase);
      else params.delete('fase');

      if (discipline) params.set('discipline', discipline);
      else params.delete('discipline');

      if (uitvoering) params.set('uitvoering', 'klaar');
      else params.delete('uitvoering');

      if (conflicten) params.set('conflicten', conflicten);
      else params.delete('conflicten');

      if (q.trim()) params.set('q', q.trim());
      else params.delete('q');

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [
      searchParams,
      faseFilter,
      disciplineFilter,
      uitvoeringFilter,
      conflictenFilter,
      search,
      router,
      pathname,
    ]
  );

  const filtered = useMemo(
    () =>
      filterTraces(traces, {
        fase: faseFilter ?? undefined,
        discipline: disciplineFilter ?? undefined,
        uitvoering: uitvoeringFilter ? 'klaar' : undefined,
        conflicten: conflictenFilter ?? undefined,
        q: search,
      }),
    [traces, faseFilter, disciplineFilter, uitvoeringFilter, conflictenFilter, search]
  );

  const perFase = useMemo(() => countTracesPerFase(traces), [traces]);

  const pageTitle = buildPageTitle({
    fase: faseFilter,
    discipline: disciplineFilter,
    uitvoering: uitvoeringFilter,
    conflicten: conflictenFilter,
  });

  const activeFilters = [
    faseFilter ? `Fase: ${FASE_LABELS[faseFilter]}` : null,
    disciplineFilter ? `Discipline: ${DISCIPLINE_LABELS[disciplineFilter]}` : null,
    uitvoeringFilter ? 'Klaar voor uitvoering' : null,
    conflictenFilter === 'blokkerend' ? 'Blokkerende conflicten' : null,
    conflictenFilter === 'alle' ? 'Met conflicten' : null,
  ].filter((f): f is string => Boolean(f));

  const totaleLengte = filtered.reduce((sum, t) => sum + t.lengteM, 0);
  const gemVoortgang =
    filtered.length > 0
      ? Math.round(filtered.reduce((sum, t) => sum + t.voortgang, 0) / filtered.length)
      : 0;
  const totaalConflicten = filtered.reduce((sum, t) => sum + t.conflicten, 0);
  const blokkerend = filtered.reduce((sum, t) => sum + t.blokkerendeConflicten, 0);

  const processPhase = faseFilter
    ? TRACE_PHASES.find((p) => {
        const map: Record<TraceFase, string> = {
          VO: 'fase1',
          DO: 'fase2',
          UO: 'fase3',
          as_built: 'output',
        };
        return p.id === map[faseFilter];
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(perFase) as [TraceFase, number][]).map(([fase, count]) => (
          <ClickableStatCard
            key={fase}
            href={tracesUrl({ fase })}
            ariaLabel={`Filter op ${FASE_LABELS[fase]}`}
            className={cn(faseFilter === fase && 'ring-2 ring-[#2D6FE8]')}
          >
            <Card className={cn('relative h-full overflow-hidden ring-1', FASE_ACCENT[fase])}>
              <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-current opacity-5 blur-2xl" />
              <CardContent className="relative flex items-center gap-4 p-4">
                <span className={cn('h-4 w-4 rounded-full', FASE_COLORS[fase])} />
                <div>
                  <p className="font-mono text-3xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{FASE_LABELS[fase]}</p>
                </div>
              </CardContent>
            </Card>
          </ClickableStatCard>
        ))}
      </div>

      {faseFilter && processPhase && (
        <Card className="border-[#2D6FE8]/20 bg-[#2D6FE8]/5">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {FASE_LABELS[faseFilter]} — {processPhase.titel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{processPhase.beschrijving}</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {filtered.length} tracé{filtered.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Actieve filters:</span>
          {activeFilters.map((f) => (
            <Badge key={f} variant="outline" className="text-[10px]">
              {f}
            </Badge>
          ))}
          <button
            type="button"
            onClick={() => router.replace(pathname, { scroll: false })}
            className="text-[10px] text-[#2D6FE8] hover:underline"
          >
            Wis filters
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/5 to-white">
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Tracés in selectie</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{formatLengte(totaleLengte)}</p>
            <p className="text-xs text-muted-foreground">Totale lengte</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/15 bg-gradient-to-br from-emerald-500/5 to-white">
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{gemVoortgang}%</p>
            <p className="text-xs text-muted-foreground">Gem. voortgang</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/15 bg-gradient-to-br from-amber-500/5 to-white">
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold text-amber-600">{totaalConflicten}</p>
            <p className="text-xs text-muted-foreground">
              Conflicten ({blokkerend} blokkerend)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek tracé, project, weg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ q: search })}
            onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: search })}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              updateUrl({ fase: null, discipline: null, uitvoering: false, conflicten: null })
            }
            className={cn(
              'filter-pill',
              !faseFilter && !disciplineFilter && !uitvoeringFilter && !conflictenFilter
                ? 'filter-pill-active'
                : 'filter-pill-inactive'
            )}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() =>
              updateUrl({ fase: null, discipline: null, uitvoering: true, conflicten: null })
            }
            className={cn(
              'filter-pill',
              uitvoeringFilter ? 'filter-pill-active' : 'filter-pill-inactive'
            )}
          >
            Uitvoering
          </button>
          <button
            type="button"
            onClick={() =>
              updateUrl({ fase: null, discipline: null, uitvoering: false, conflicten: 'blokkerend' })
            }
            className={cn(
              'filter-pill',
              conflictenFilter === 'blokkerend'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                : 'filter-pill-inactive'
            )}
          >
            Blokkerend
          </button>
        </div>
      </div>

      <Card className="border-0 shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-slate-50/80 px-4 py-3">
            <h3 className="section-heading text-base">{pageTitle}</h3>
            <p className="text-xs text-muted-foreground">
              {filtered.length} tracé{filtered.length !== 1 ? 's' : ''} gevonden
            </p>
          </div>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="w-[28%]">Tracé</TableHead>
                <TableHead className="w-[14%]">Project</TableHead>
                <TableHead className="w-14">Fase</TableHead>
                <TableHead className="hidden w-[16%] md:table-cell">Locatie</TableHead>
                <TableHead className="w-[88px]">Voortgang</TableHead>
                <TableHead className="hidden w-16 lg:table-cell">Stappen</TableHead>
                <TableHead className="hidden w-16 lg:table-cell">Conflict</TableHead>
                <TableHead className="w-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Geen tracés gevonden voor deze filters
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.trace.id} className="group">
                    <TableCell className="max-w-0 whitespace-normal">
                      <Link
                        href={`/project/${row.projectId}/trace/${row.trace.id}`}
                        className="block min-w-0"
                      >
                        <p className="truncate font-medium text-foreground group-hover:text-[#2D6FE8]">
                          {row.trace.naam}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {row.trace.code}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                          {row.trace.omschrijving}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {DISCIPLINE_LABELS[row.trace.discipline]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {formatLengte(row.lengteM)}
                          </Badge>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-0 whitespace-normal">
                      <Link href={`/project/${row.projectId}`} className="block min-w-0">
                        <p className="truncate text-sm text-foreground hover:text-[#2D6FE8]">
                          {row.projectNaam}
                        </p>
                        <ProjectStatusBadge status={row.projectStatus} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px]', FASE_COLORS[row.trace.fase], 'text-white border-0')}
                      >
                        {row.trace.fase}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden max-w-0 whitespace-normal md:table-cell">
                      <div className="flex min-w-0 items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate">{row.trace.wegnaam}</p>
                          <p className="truncate text-[10px]">{row.trace.leglocatie}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <ProgressBar value={row.voortgang} showLabel className="min-w-0 gap-1" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs">
                        <GitBranch className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{row.openStappen}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.conflicten > 0 ? (
                        <div className="flex items-center gap-1 text-xs">
                          <AlertTriangle
                            className={cn(
                              'h-3 w-3',
                              row.blokkerendeConflicten > 0 ? 'text-red-600' : 'text-amber-600'
                            )}
                          />
                          <span className="font-mono">{row.conflicten}</span>
                          {row.blokkerendeConflicten > 0 && (
                            <span className="text-[10px] text-red-600">
                              ({row.blokkerendeConflicten} blok.)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/project/${row.projectId}/trace/${row.trace.id}`}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[#2D6FE8]" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
