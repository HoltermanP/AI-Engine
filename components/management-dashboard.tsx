import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectActionsPanel } from '@/components/project-actions-panel';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ClickableBar, ClickableStatCard } from '@/components/clickable-stat-card';
import type { ManagementKPIs, ProjectSummary } from '@/lib/services/project-stats';
import { FASE_LABELS } from '@/lib/db/types';
import type { TraceFase } from '@/lib/db/types';
import type { ProjectStatus } from '@/demo/projects';
import {
  actiesUrl,
  dashboardUrl,
  rapportageUrl,
  tracesUrl,
} from '@/lib/navigation/dashboard-links';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FolderKanban,
  Layers,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagementDashboardProps {
  kpis: ManagementKPIs;
  summaries: ProjectSummary[];
  highlightStatus?: ProjectStatus;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  accent?: 'default' | 'warning' | 'success' | 'danger';
  href: string;
}) {
  const accentColors = {
    default: 'text-[#2D6FE8]',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
    danger: 'text-red-600',
  };

  const accentStyles = {
    default: 'border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/8 via-white to-white stat-glow-blue',
    warning: 'border-amber-500/15 bg-gradient-to-br from-amber-500/8 via-white to-white stat-glow-amber',
    success: 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 via-white to-white stat-glow-emerald',
    danger: 'border-red-500/15 bg-gradient-to-br from-red-500/8 via-white to-white stat-glow-red',
  };

  const accentKey = accent ?? 'default';

  return (
    <ClickableStatCard href={href} ariaLabel={title}>
      <Card className={cn('relative h-full overflow-hidden', accentStyles[accentKey])}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon className={`h-4 w-4 ${accentColors[accentKey]}`} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`font-[family-name:var(--font-ibm-plex-mono)] text-3xl font-semibold ${accentColors[accentKey]}`}
          >
            {value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </CardContent>
      </Card>
    </ClickableStatCard>
  );
}

function DistributionBar({
  label,
  count,
  total,
  color,
  href,
  highlighted,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  href: string;
  highlighted?: boolean;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <ClickableBar href={href} ariaLabel={`${label}: ${count} tracés`} className={cn('px-2 py-1', highlighted && 'bg-[#2D6FE8]/5 ring-1 ring-[#2D6FE8]/30')}>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground">{label}</span>
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-muted-foreground">
            {count} ({pct}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-foreground/[0.04]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            }}
          />
        </div>
      </div>
    </ClickableBar>
  );
}

const FASE_COLORS: Record<TraceFase, string> = {
  VO: '#94a3b8',
  DO: '#2D6FE8',
  UO: '#f59e0b',
  as_built: '#10b981',
};

export function ManagementDashboard({
  kpis,
  summaries,
  highlightStatus,
}: ManagementDashboardProps) {
  const projectNames = Object.fromEntries(summaries.map((s) => [s.project.id, s.project.naam]));
  const allActions = summaries.flatMap((s) => s.acties);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Actieve projecten"
          value={kpis.actieveProjecten}
          subtitle={`${kpis.totaalProjecten} totaal · ${kpis.conceptProjecten} concept`}
          icon={FolderKanban}
          href={dashboardUrl({ status: 'actief' })}
        />
        <KpiCard
          title="Gemiddelde voortgang"
          value={`${kpis.gemiddeldeVoortgang}%`}
          subtitle={`${kpis.totaalTraces} tracés · ${kpis.totaleTracelengteKm} km`}
          icon={TrendingUp}
          href={rapportageUrl()}
        />
        <KpiCard
          title="Open acties"
          value={kpis.openActies}
          subtitle={`${kpis.hoogPrioriteitActies} hoge prioriteit`}
          icon={Activity}
          accent={kpis.hoogPrioriteitActies > 0 ? 'warning' : 'default'}
          href={actiesUrl()}
        />
        <KpiCard
          title="Blokkerende items"
          value={kpis.blokkerendeActies + kpis.blokkerendeConflicten}
          subtitle={`${kpis.blokkerendeConflicten} conflicten · ${kpis.verlopenDeadlines} verlopen deadlines`}
          icon={AlertTriangle}
          accent={kpis.blokkerendeActies > 0 ? 'danger' : 'warning'}
          href={actiesUrl({ filter: 'blokkerend' })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Tracés in uitvoering"
          value={kpis.tracesKlaarVoorUitvoering}
          subtitle="UO of as-built fase"
          icon={CheckCircle2}
          accent="success"
          href={tracesUrl({ uitvoering: 'klaar' })}
        />
        <KpiCard
          title="Totaal conflicten"
          value={kpis.totaalConflicten}
          subtitle={`${kpis.blokkerendeConflicten} blokkerend`}
          icon={AlertTriangle}
          accent={kpis.blokkerendeConflicten > 0 ? 'danger' : 'default'}
          href={tracesUrl({ conflicten: 'alle' })}
        />
        <KpiCard
          title="Afgeronde projecten"
          value={kpis.afgerondeProjecten}
          subtitle="Dossier compleet"
          icon={CheckCircle2}
          accent="success"
          href={dashboardUrl({ status: 'afgerond' })}
        />
        <KpiCard
          title="Opdrachtgevers"
          value={kpis.projectenPerOpdrachtgever.length}
          subtitle="Actieve relaties"
          icon={Users}
          href={rapportageUrl()}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <BarChart3 className="h-4 w-4 text-[#2D6FE8]" />
              Tracé-pipeline per ontwerpfase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(kpis.tracesPerFase) as [TraceFase, number][]).map(([fase, count]) => (
              <DistributionBar
                key={fase}
                label={FASE_LABELS[fase]}
                count={count}
                total={kpis.totaalTraces}
                color={FASE_COLORS[fase]}
                href={tracesUrl({ fase })}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Layers className="h-4 w-4 text-[#2D6FE8]" />
              Discipline-verdeling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.disciplineVerdeling.map(({ label, count, discipline }) => (
              <DistributionBar
                key={label}
                label={label}
                count={count}
                total={kpis.totaalTraces}
                color="#2D6FE8"
                href={tracesUrl({ discipline })}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <MapPin className="h-4 w-4 text-[#2D6FE8]" />
              Projectstatus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.statusVerdeling.map(({ status, count }) => (
              <Link
                key={status}
                href={dashboardUrl({ status })}
                className={cn(
                  'flex items-center justify-between rounded-md px-2 py-1 transition-colors hover:bg-muted/60',
                  highlightStatus === status && 'bg-[#2D6FE8]/5 ring-1 ring-[#2D6FE8]/30'
                )}
              >
                <ProjectStatusBadge status={status} />
                <span className="font-[family-name:var(--font-ibm-plex-mono)] text-sm">{count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-[#2D6FE8]" />
              Opdrachtgevers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpis.projectenPerOpdrachtgever.map(({ opdrachtgever, count }) => (
              <Link
                key={opdrachtgever}
                href={dashboardUrl({ opdrachtgever })}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-[#2D6FE8]/40 hover:bg-muted/40"
              >
                <span className="text-sm text-foreground">{opdrachtgever}</span>
                <Badge variant="outline" className="font-[family-name:var(--font-ibm-plex-mono)]">
                  {count}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-medium">Risico-indicatoren</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={actiesUrl({ filter: 'blokkerend' })}
              className="flex items-center justify-between rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 transition-colors hover:border-red-500/40"
            >
              <span className="text-sm">Blokkerende acties</span>
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold text-red-600">
                {kpis.blokkerendeActies}
              </span>
            </Link>
            <Link
              href={actiesUrl({ filter: 'verlopen' })}
              className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 transition-colors hover:border-amber-500/40"
            >
              <span className="text-sm">Verlopen deadlines</span>
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold text-amber-600">
                {kpis.verlopenDeadlines}
              </span>
            </Link>
            <Link
              href={dashboardUrl({ status: 'concept' })}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm">Concept-projecten</span>
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold">
                {kpis.conceptProjecten}
              </span>
            </Link>
            <Link
              href={tracesUrl({ fase: 'VO' })}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <span className="text-sm">Tracés in VO-fase</span>
              <span className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-semibold">
                {kpis.tracesPerFase.VO}
              </span>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Acties overzicht</CardTitle>
          <Link href="/acties" className="text-xs text-[#2D6FE8] hover:underline">
            Alle acties →
          </Link>
        </CardHeader>
        <CardContent>
          <ProjectActionsPanel
            actions={allActions}
            projectNames={projectNames}
            showProjectName
            limit={10}
            defaultFilter="te_doen"
          />
        </CardContent>
      </Card>
    </div>
  );
}
