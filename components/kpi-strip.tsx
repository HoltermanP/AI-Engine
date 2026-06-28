import Link from 'next/link';
import { Activity, AlertTriangle, FolderKanban, Ruler, Spline } from 'lucide-react';
import type { ManagementKPIs } from '@/lib/services/project-stats';
import { actiesUrl, dashboardUrl, rapportageUrl, tracesUrl } from '@/lib/navigation/dashboard-links';
import { cn } from '@/lib/utils';

interface KpiStripProps {
  kpis: ManagementKPIs;
}

interface StripItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  waarde: string | number;
  label: string;
  accent?: 'blauw' | 'amber' | 'rood';
}

/**
 * Smalle, klikbare KPI-balk bovenaan het dashboard: één oogopslag-overzicht
 * dat geen ruimte wegneemt van de projectenlijst (snel naar een project).
 */
export function KpiStrip({ kpis }: KpiStripProps) {
  const items: StripItem[] = [
    {
      href: dashboardUrl({ status: 'actief' }),
      icon: FolderKanban,
      waarde: kpis.actieveProjecten,
      label: 'actieve projecten',
      accent: 'blauw',
    },
    {
      href: tracesUrl(),
      icon: Spline,
      waarde: kpis.totaalTraces,
      label: 'tracés',
    },
    {
      href: rapportageUrl(),
      icon: Ruler,
      waarde: `${kpis.totaleTracelengteKm} km`,
      label: 'totale lengte',
    },
    {
      href: actiesUrl(),
      icon: Activity,
      waarde: kpis.openActies,
      label: 'open acties',
      accent: 'amber',
    },
    {
      href: actiesUrl({ filter: 'blokkerend' }),
      icon: AlertTriangle,
      waarde: kpis.blokkerendeActies,
      label: 'risico’s',
      accent: 'rood',
    },
  ];

  const accentText: Record<NonNullable<StripItem['accent']>, string> = {
    blauw: 'text-[#2D6FE8]',
    amber: 'text-amber-600',
    rood: 'text-red-600',
  };

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
      {items.map(({ href, icon: Icon, waarde, label, accent }) => (
        <Link
          key={label}
          href={href}
          className="group flex min-w-[8.5rem] flex-1 items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
          aria-label={`${waarde} ${label}`}
        >
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              accent ? accentText[accent] : 'text-muted-foreground'
            )}
          />
          <div className="min-w-0">
            <span
              className={cn(
                'font-[family-name:var(--font-ibm-plex-mono)] text-lg font-bold leading-none',
                accent === 'rood' && Number(kpis.blokkerendeActies) > 0
                  ? 'text-red-600'
                  : 'text-foreground'
              )}
            >
              {waarde}
            </span>
            <p className="truncate text-[11px] text-muted-foreground group-hover:text-foreground">
              {label}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
