import Link from 'next/link';
import { Activity, AlertTriangle, FolderKanban, Ruler, Spline } from 'lucide-react';
import type { ManagementKPIs } from '@/lib/services/project-stats';
import { actiesUrl, dashboardUrl, rapportageUrl, tracesUrl } from '@/lib/navigation/dashboard-links';
import { cn } from '@/lib/utils';

interface KpiStripProps {
  kpis: ManagementKPIs;
}

type Accent = 'blauw' | 'groen' | 'paars' | 'amber' | 'rood';

interface StripItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  waarde: string | number;
  label: string;
  accent: Accent;
  alarm?: boolean;
}

const ACCENT: Record<Accent, { chip: string; icon: string; waarde?: string }> = {
  blauw: { chip: 'bg-[#2D6FE8]/10 ring-[#2D6FE8]/15', icon: 'text-[#2D6FE8]' },
  groen: { chip: 'bg-emerald-500/10 ring-emerald-500/15', icon: 'text-emerald-600' },
  paars: { chip: 'bg-violet-500/10 ring-violet-500/15', icon: 'text-violet-600' },
  amber: { chip: 'bg-amber-500/10 ring-amber-500/15', icon: 'text-amber-600' },
  rood: { chip: 'bg-red-500/10 ring-red-500/15', icon: 'text-red-600', waarde: 'text-red-600' },
};

/**
 * Klikbare KPI-balk bovenaan het dashboard: overzicht in één oogopslag met
 * ruime, goed leesbare cijfers en icoon-chips, zonder ruimte weg te nemen van
 * de projectenlijst.
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
      accent: 'groen',
    },
    {
      href: rapportageUrl(),
      icon: Ruler,
      waarde: `${kpis.totaleTracelengteKm} km`,
      label: 'totale lengte',
      accent: 'paars',
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
      alarm: kpis.blokkerendeActies > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)] sm:grid-cols-3 lg:flex lg:items-stretch lg:gap-1">
      {items.map(({ href, icon: Icon, waarde, label, accent, alarm }, i) => {
        const a = ACCENT[accent];
        return (
          <Link
            key={label}
            href={href}
            aria-label={`${waarde} ${label}`}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all hover:bg-muted/70 lg:flex-1',
              i > 0 && 'lg:border-l lg:border-border/60'
            )}
          >
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105',
                a.chip
              )}
            >
              <Icon className={cn('h-5 w-5', a.icon)} />
            </span>
            <div className="min-w-0">
              <span
                className={cn(
                  'block font-[family-name:var(--font-ibm-plex-mono)] text-2xl font-bold leading-none tracking-tight',
                  alarm ? a.waarde : 'text-foreground'
                )}
              >
                {waarde}
              </span>
              <p className="mt-1 truncate text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {label}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
