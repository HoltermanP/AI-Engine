'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/progress-bar';
import { ClickableBar, ClickableStatCard } from '@/components/clickable-stat-card';
import type { ManagementKPIs } from '@/lib/services/project-stats';
import {
  actiesUrl,
  dashboardUrl,
  rapportageUrl,
  tracesUrl,
} from '@/lib/navigation/dashboard-links';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface EnhancedKpiDashboardProps {
  kpis: ManagementKPIs;
  actiesPerSignaal?: { groen: number; oranje: number; rood: number };
}

export function EnhancedKpiDashboard({ kpis, actiesPerSignaal }: EnhancedKpiDashboardProps) {
  const faseEntries = Object.entries(kpis.tracesPerFase) as [string, number][];
  const maxFase = Math.max(...faseEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard href={dashboardUrl({ status: 'actief' })} ariaLabel="Actieve projecten bekijken">
          <Card className="relative h-full overflow-hidden border-[#2D6FE8]/20 bg-gradient-to-br from-[#2D6FE8]/8 via-white to-white stat-glow-blue">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#2D6FE8]/15 blur-2xl" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <FolderKanban className="h-4 w-4 text-[#2D6FE8]" />
                Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-4xl font-bold text-foreground">
                {kpis.actieveProjecten}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                actief · {kpis.totaalProjecten} totaal · {kpis.conceptProjecten} concept
              </p>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard href={rapportageUrl()} ariaLabel="Voortgangsrapportage bekijken">
          <Card className="relative h-full overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-white to-white stat-glow-emerald">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/15 blur-2xl" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Voortgang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-4xl font-bold text-foreground">
                {kpis.gemiddeldeVoortgang}%
              </p>
              <ProgressBar value={kpis.gemiddeldeVoortgang} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {kpis.totaalTraces} tracés · {kpis.totaleTracelengteKm} km
              </p>
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard href={actiesUrl()} ariaLabel="Open acties bekijken">
          <Card className="relative h-full overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-white to-white stat-glow-amber">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-amber-600" />
                Open acties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-4xl font-bold text-foreground">
                {kpis.openActies}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpis.hoogPrioriteitActies} hoge prioriteit
              </p>
              {actiesPerSignaal && (
                <div className="mt-2 flex gap-2">
                  <Link
                    href={actiesUrl({ signaal: 'groen' })}
                    className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {actiesPerSignaal.groen}
                  </Link>
                  <Link
                    href={actiesUrl({ signaal: 'oranje' })}
                    className="flex items-center gap-1 text-[10px] text-amber-700 hover:underline"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {actiesPerSignaal.oranje}
                  </Link>
                  <Link
                    href={actiesUrl({ signaal: 'rood' })}
                    className="flex items-center gap-1 text-[10px] text-red-700 hover:underline"
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {actiesPerSignaal.rood}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </ClickableStatCard>

        <ClickableStatCard href={actiesUrl({ filter: 'blokkerend' })} ariaLabel="Risico's en kritieke acties bekijken">
          <Card className="relative h-full overflow-hidden border-red-500/20 bg-gradient-to-br from-red-500/8 via-white to-white stat-glow-red">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-400/15 blur-2xl" />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Risico&apos;s
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-4xl font-bold text-red-600">
                {kpis.blokkerendeActies}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {kpis.blokkerendeConflicten} conflicten · {kpis.verlopenDeadlines} verlopen deadlines
              </p>
            </CardContent>
          </Card>
        </ClickableStatCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-[#2D6FE8]" />
              Tracés per fase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faseEntries.map(([fase, count]) => (
              <ClickableBar
                key={fase}
                href={tracesUrl({ fase: fase as 'VO' | 'DO' | 'UO' | 'as_built' })}
                ariaLabel={`Tracés in fase ${fase} bekijken`}
                className="px-1 py-0.5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-20 font-mono text-xs text-muted-foreground">{fase}</span>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-muted">
                      <div
                        className="flex h-full items-center rounded-full bg-gradient-to-r from-[#2D6FE8] to-[#60a5fa] px-2 text-[10px] font-medium text-white shadow-sm transition-all duration-500"
                        style={{ width: `${Math.max(8, (count / maxFase) * 100)}%` }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                  </div>
                </div>
              </ClickableBar>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-[#2D6FE8]" />
              Disciplineverdeling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpis.disciplineVerdeling.map(({ label, count, discipline }) => (
              <ClickableBar
                key={discipline}
                href={tracesUrl({ discipline })}
                ariaLabel={`Projecten met discipline ${label}`}
                className="px-2 py-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{label}</span>
                  <span className="font-mono font-medium text-[#2D6FE8]">{count}</span>
                </div>
              </ClickableBar>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ClickableStatCard href={tracesUrl({ uitvoering: 'klaar' })} ariaLabel="Tracés klaar voor uitvoering">
          <Card className="h-full border-emerald-500/15 bg-gradient-to-br from-emerald-50/80 to-white">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold">{kpis.tracesKlaarVoorUitvoering}</p>
                <p className="text-xs text-muted-foreground">Klaar voor uitvoering</p>
              </div>
            </CardContent>
          </Card>
        </ClickableStatCard>
        <ClickableStatCard href={dashboardUrl({ status: 'afgerond' })} ariaLabel="Afgeronde projecten">
          <Card className="h-full border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/5 to-white">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2D6FE8]/10 text-sm font-bold text-[#2D6FE8] ring-1 ring-[#2D6FE8]/20">
                {kpis.afgerondeProjecten}
              </div>
              <div>
                <p className="font-mono text-2xl font-bold">{kpis.afgerondeProjecten}</p>
                <p className="text-xs text-muted-foreground">Afgeronde projecten</p>
              </div>
            </CardContent>
          </Card>
        </ClickableStatCard>
        <ClickableStatCard href={tracesUrl({ conflicten: 'alle' })} ariaLabel="Conflicten bekijken">
          <Card className="h-full border-amber-500/15 bg-gradient-to-br from-amber-50/80 to-white">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-mono text-2xl font-bold">{kpis.totaalConflicten}</p>
                <p className="text-xs text-muted-foreground">Totaal conflicten</p>
              </div>
            </CardContent>
          </Card>
        </ClickableStatCard>
      </div>
    </div>
  );
}
