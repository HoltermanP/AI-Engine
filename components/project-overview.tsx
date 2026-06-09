'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProgressBar } from '@/components/progress-bar';
import type { ProjectSummary } from '@/lib/services/project-stats';
import type { ProjectStatus } from '@/demo/projects';
import type { Discipline } from '@/lib/db/types';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectActionsPanel, ProjectActionsSummary } from '@/components/project-actions-panel';
import { parseDashboardStatus } from '@/lib/navigation/dashboard-links';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: ProjectStatus | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'actief', label: 'Actief' },
  { value: 'concept', label: 'Concept' },
  { value: 'afgerond', label: 'Afgerond' },
];

interface ProjectOverviewProps {
  summaries: ProjectSummary[];
}

export function ProjectOverview({ summaries }: ProjectOverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'alle'>('alle');
  const [opdrachtgeverFilter, setOpdrachtgeverFilter] = useState<string | null>(null);
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    setStatusFilter(parseDashboardStatus(searchParams.get('status')));
    setOpdrachtgeverFilter(searchParams.get('opdrachtgever'));
    setDisciplineFilter(searchParams.get('discipline') as Discipline | null);
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#projecten') {
      document.getElementById('projecten')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const updateUrl = useCallback(
    (updates: {
      status?: ProjectStatus | 'alle';
      opdrachtgever?: string | null;
      discipline?: Discipline | null;
      q?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const status = updates.status ?? statusFilter;
      const opdrachtgever = updates.opdrachtgever !== undefined ? updates.opdrachtgever : opdrachtgeverFilter;
      const discipline = updates.discipline !== undefined ? updates.discipline : disciplineFilter;
      const q = updates.q ?? search;

      if (status === 'alle') params.delete('status');
      else params.set('status', status);

      if (opdrachtgever) params.set('opdrachtgever', opdrachtgever);
      else params.delete('opdrachtgever');

      if (discipline) params.set('discipline', discipline);
      else params.delete('discipline');

      if (q.trim()) params.set('q', q.trim());
      else params.delete('q');

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, statusFilter, opdrachtgeverFilter, disciplineFilter, search, router, pathname]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return summaries.filter((s) => {
      const matchesStatus = statusFilter === 'alle' || s.project.status === statusFilter;
      const matchesOpdrachtgever =
        !opdrachtgeverFilter || s.project.opdrachtgever === opdrachtgeverFilter;
      const matchesDiscipline =
        !disciplineFilter || s.disciplines.includes(disciplineFilter);
      const matchesSearch =
        !q ||
        s.project.naam.toLowerCase().includes(q) ||
        s.project.projectnummer.toLowerCase().includes(q) ||
        s.project.gebied.toLowerCase().includes(q) ||
        s.project.opdrachtgever.toLowerCase().includes(q);
      return matchesStatus && matchesOpdrachtgever && matchesDiscipline && matchesSearch;
    });
  }, [summaries, search, statusFilter, opdrachtgeverFilter, disciplineFilter]);

  const activeFilters = [
    statusFilter !== 'alle' ? `Status: ${statusFilter}` : null,
    opdrachtgeverFilter ? `Opdrachtgever: ${opdrachtgeverFilter}` : null,
    disciplineFilter ? `Discipline: ${DISCIPLINE_LABELS[disciplineFilter]}` : null,
  ].filter((f): f is string => Boolean(f));

  return (
    <div className="space-y-4">
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
            onClick={() => {
              setStatusFilter('alle');
              setOpdrachtgeverFilter(null);
              setDisciplineFilter(null);
              router.replace(pathname, { scroll: false });
            }}
            className="text-[10px] text-[#2D6FE8] hover:underline"
          >
            Wis filters
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, nummer, gebied..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ q: search })}
            onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: search })}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatusFilter(value);
                updateUrl({ status: value });
              }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200',
                statusFilter === value
                  ? 'bg-[#2D6FE8] text-white shadow-md shadow-[#2D6FE8]/25'
                  : 'bg-white/80 text-muted-foreground ring-1 ring-border hover:bg-white hover:text-foreground hover:shadow-sm'
              )}
            >
              {label}
              <span className="ml-1.5 font-[family-name:var(--font-ibm-plex-mono)] text-[10px] opacity-70">
                {value === 'alle'
                  ? summaries.length
                  : summaries.filter((s) => s.project.status === value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-[var(--shadow-soft)]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Tracés</TableHead>
                <TableHead>Voortgang</TableHead>
                <TableHead className="hidden lg:table-cell">Acties</TableHead>
                <TableHead className="hidden xl:table-cell">Opdrachtgever</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Geen projecten gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((summary) => {
                  const isExpanded = expandedProjectId === summary.project.id;
                  const hasActies = summary.acties.length > 0;

                  return (
                    <Fragment key={summary.project.id}>
                      <TableRow className="group">
                        <TableCell>
                          <Link href={`/project/${summary.project.id}`} className="block">
                            <p className="font-medium text-foreground group-hover:text-[#2D6FE8]">
                              {summary.project.naam}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {summary.project.projectnummer}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{summary.project.gebied}</p>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <ProjectStatusBadge status={summary.project.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            <span className="font-[family-name:var(--font-ibm-plex-mono)] text-sm">
                              {summary.traceCount}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {summary.disciplines.map((d) => (
                                <Badge key={d} variant="outline" className="text-[10px]">
                                  {DISCIPLINE_LABELS[d]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <ProgressBar value={summary.voortgang} showLabel />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProjectId(isExpanded ? null : summary.project.id)
                            }
                            disabled={!hasActies}
                            className={cn(
                              'text-left transition-opacity',
                              hasActies ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'
                            )}
                          >
                            <ProjectActionsSummary
                              openActies={summary.openActies}
                              bezigActies={summary.bezigActies}
                              afgerondeActies={summary.afgerondeActies}
                              blokkerendeActies={summary.blokkerendeActies}
                              compact
                            />
                          </button>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                          {summary.project.opdrachtgever}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {hasActies && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedProjectId(isExpanded ? null : summary.project.id)
                                }
                                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={isExpanded ? 'Acties inklappen' : 'Acties uitklappen'}
                              >
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 transition-transform',
                                    isExpanded && 'rotate-180'
                                  )}
                                />
                              </button>
                            )}
                            <Link href={`/project/${summary.project.id}`}>
                              <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[#2D6FE8]" />
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasActies && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <p className="mb-3 text-xs font-medium text-muted-foreground">
                              Acties — {summary.project.naam}
                            </p>
                            <ProjectActionsPanel actions={summary.acties} showSummary={false} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
