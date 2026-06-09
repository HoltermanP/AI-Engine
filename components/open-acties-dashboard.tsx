'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ClickableStatCard } from '@/components/clickable-stat-card';
import {
  enrichActions,
  SIGNAAL_STIJL,
  type ActionMetSignaal,
  type SignaalKleur,
} from '@/lib/services/action-signals';
import type { ProjectAction } from '@/demo/project-actions';
import { actiesUrl, parseActiesExtraFilter, parseActiesSignaal } from '@/lib/navigation/dashboard-links';
import { getActionHref } from '@/lib/navigation/action-links';
import { Calendar, Search, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpenActiesDashboardProps {
  actions: ProjectAction[];
  projectNames: Record<string, string>;
}

const SIGNAAL_FILTERS: { value: SignaalKleur | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'groen', label: 'Op schema' },
  { value: 'oranje', label: 'Aandacht' },
  { value: 'rood', label: 'Kritiek' },
];

export function OpenActiesDashboard({ actions, projectNames }: OpenActiesDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [signaalFilter, setSignaalFilter] = useState<SignaalKleur | 'alle'>('alle');
  const [extraFilter, setExtraFilter] = useState<'blokkerend' | 'verlopen' | 'hoog' | null>(null);

  useEffect(() => {
    setSignaalFilter(parseActiesSignaal(searchParams.get('signaal')));
    setExtraFilter(parseActiesExtraFilter(searchParams.get('filter')));
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  const updateUrl = (updates: {
    signaal?: SignaalKleur | 'alle';
    filter?: 'blokkerend' | 'verlopen' | 'hoog' | null;
    q?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    const signaal = updates.signaal ?? signaalFilter;
    const filter = updates.filter !== undefined ? updates.filter : extraFilter;
    const q = updates.q ?? search;

    if (signaal === 'alle') params.delete('signaal');
    else params.set('signaal', signaal);

    if (filter) params.set('filter', filter);
    else params.delete('filter');

    if (q.trim()) params.set('q', q.trim());
    else params.delete('q');

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const enriched = useMemo(() => enrichActions(actions), [actions]);

  const openActies = useMemo(() => {
    const q = search.toLowerCase().trim();
    const today = new Date().toISOString().slice(0, 10);
    return enriched
      .filter((a) => a.status !== 'afgerond')
      .filter((a) => signaalFilter === 'alle' || a.signaal === signaalFilter)
      .filter((a) => {
        if (extraFilter === 'blokkerend') return a.status === 'blokkerend';
        if (extraFilter === 'verlopen') {
          return a.deadline && a.deadline < today && a.status !== 'bezig';
        }
        if (extraFilter === 'hoog') {
          return a.prioriteit === 'hoog' && (a.status === 'open' || a.status === 'blokkerend');
        }
        return true;
      })
      .filter(
        (a) =>
          !q ||
          a.titel.toLowerCase().includes(q) ||
          (projectNames[a.projectId] ?? '').toLowerCase().includes(q) ||
          (a.toegewezenAan ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const order = { rood: 0, oranje: 1, groen: 2 };
        return order[a.signaal] - order[b.signaal];
      });
  }, [enriched, search, signaalFilter, extraFilter, projectNames]);

  const perSignaal = useMemo(
    () => ({
      groen: enriched.filter((a) => a.status !== 'afgerond' && a.signaal === 'groen').length,
      oranje: enriched.filter((a) => a.status !== 'afgerond' && a.signaal === 'oranje').length,
      rood: enriched.filter((a) => a.status !== 'afgerond' && a.signaal === 'rood').length,
    }),
    [enriched]
  );

  const planningWeeks = useMemo(() => {
    const weeks = new Map<string, ActionMetSignaal[]>();
    for (const a of openActies) {
      const w = a.planningWeek ?? 'Ongepland';
      if (!weeks.has(w)) weeks.set(w, []);
      weeks.get(w)!.push(a);
    }
    return [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [openActies]);

  const extraFilterLabels: Record<'blokkerend' | 'verlopen' | 'hoog', string> = {
    blokkerend: 'Blokkerende acties',
    verlopen: 'Verlopen deadlines',
    hoog: 'Hoge prioriteit',
  };

  return (
    <div className="space-y-6">
      {extraFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {extraFilterLabels[extraFilter]}
          </Badge>
          <button
            type="button"
            onClick={() => {
              setExtraFilter(null);
              updateUrl({ filter: null });
            }}
            className="text-[10px] text-[#2D6FE8] hover:underline"
          >
            Filter wissen
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {(['groen', 'oranje', 'rood'] as SignaalKleur[]).map((s) => {
          const stijl = SIGNAAL_STIJL[s];
          const isActive = signaalFilter === s;
          return (
            <ClickableStatCard
              key={s}
              href={actiesUrl({ signaal: s })}
              ariaLabel={`Filter op ${stijl.label}`}
              className={cn(isActive && 'ring-2 ring-[#2D6FE8]')}
            >
              <Card className={cn('relative h-full overflow-hidden ring-1', stijl.ring, stijl.bg)}>
                <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-current opacity-5 blur-2xl" />
                <CardContent className="relative flex items-center gap-4 p-4">
                  <span className={cn('h-4 w-4 rounded-full', stijl.dot)} />
                  <div>
                    <p className={cn('font-mono text-3xl font-bold', stijl.text)}>{perSignaal[s]}</p>
                    <p className="text-xs text-muted-foreground">{stijl.label}</p>
                  </div>
                </CardContent>
              </Card>
            </ClickableStatCard>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek actie, project of medewerker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ q: search })}
            onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: search })}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SIGNAAL_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSignaalFilter(value);
                updateUrl({ signaal: value });
              }}
              className={cn(
                'filter-pill',
                signaalFilter === value ? 'filter-pill-active' : 'filter-pill-inactive'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="section-heading text-base">Actielijst ({openActies.length})</h3>
          {openActies.map((action) => (
            <ActionCard key={action.id} action={action} projectNaam={projectNames[action.projectId]} />
          ))}
          {openActies.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Geen acties gevonden</p>
          )}
        </div>

        <div>
          <h3 className="section-heading mb-3 text-base">Planning per week</h3>
          <div className="space-y-3">
            {planningWeeks.map(([week, weekActions]) => (
              <Card key={week}>
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[#2D6FE8]" />
                    {week}
                    <Badge variant="outline" className="text-[10px]">
                      {weekActions.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-1">
                  {weekActions.map((a) => {
                    const stijl = SIGNAAL_STIJL[a.signaal];
                    return (
                      <Link
                        key={a.id}
                        href={getActionHref(a)}
                        className={cn(
                          'flex items-start gap-2 rounded border px-2 py-1.5 text-xs transition-colors hover:border-[#2D6FE8]/40 hover:shadow-sm',
                          stijl.bg
                        )}
                      >
                        <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', stijl.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{a.titel}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {projectNames[a.projectId]}
                            {a.deadline && ` · ${a.deadline}`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action, projectNaam }: { action: ActionMetSignaal; projectNaam?: string }) {
  const stijl = SIGNAAL_STIJL[action.signaal];
  const href = getActionHref(action);

  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          'surface-card overflow-hidden ring-1 transition-all hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[#2D6FE8]',
          stijl.ring
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className={cn('mt-1.5 h-3 w-3 shrink-0 rounded-full', stijl.dot)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground group-hover:text-[#2D6FE8]">{action.titel}</p>
                <Badge variant="outline" className={cn('text-[10px]', stijl.text)}>
                  {stijl.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {action.type}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                <span>{projectNaam ?? action.projectId}</span>
                {action.traceCode && (
                  <>
                    {' '}
                    · <span className="font-mono">{action.traceCode}</span>
                  </>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                {action.toegewezenAan && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {action.toegewezenAan}
                  </span>
                )}
                {action.planningWeek && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {action.planningWeek}
                  </span>
                )}
                {action.deadline && (
                  <span
                    className={cn(
                      action.dagenTotDeadline !== null && action.dagenTotDeadline < 0 && 'text-red-600',
                      action.dagenTotDeadline !== null &&
                        action.dagenTotDeadline <= 7 &&
                        action.dagenTotDeadline >= 0 &&
                        'text-amber-600'
                    )}
                  >
                    Deadline: {action.deadline}
                    {action.dagenTotDeadline !== null &&
                      ` (${action.dagenTotDeadline < 0 ? `${Math.abs(action.dagenTotDeadline)}d te laat` : `${action.dagenTotDeadline}d`})`}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#2D6FE8]" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
