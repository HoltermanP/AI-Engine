import Link from 'next/link';
import type {
  CriteriumStatus,
  StartgereedheidResultaat,
} from '@/lib/services/startgereedheid';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Rocket,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

const VERDICT_STIJL: Record<
  StartgereedheidResultaat['verdict'],
  { label: string; ring: string; badge: string; glow: string }
> = {
  GO: {
    label: 'GO — klaar voor uitvoering',
    ring: '#10B981',
    badge: 'bg-emerald-500 text-white',
    glow: 'from-emerald-500/15',
  },
  BIJNA: {
    label: 'Bijna startgereed',
    ring: '#F59E0B',
    badge: 'bg-amber-500 text-white',
    glow: 'from-amber-500/15',
  },
  NO_GO: {
    label: 'Nog niet startgereed',
    ring: '#EF4444',
    badge: 'bg-red-500 text-white',
    glow: 'from-red-500/15',
  },
};

function StatusIcoon({ status }: { status: CriteriumStatus }) {
  if (status === 'gereed') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
  if (status === 'aandacht') return <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  if (status === 'ontbreekt') return <CircleAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />;
  return <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

function VoortgangsRing({ pct, kleur }: { pct: number; kleur: string }) {
  const r = 30;
  const omtrek = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/60" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={kleur}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * omtrek} ${omtrek}`}
        transform="rotate(-90 40 40)"
        className="transition-all duration-700"
      />
      <text x="40" y="44" textAnchor="middle" className="fill-foreground font-[family-name:var(--font-space-grotesk)] text-[17px] font-bold">
        {pct}%
      </text>
    </svg>
  );
}

/**
 * Go/no-go-cockpit "Start uitvoering": één blik op de gate van het
 * engineeringsproces — wat is gereed, wat ontbreekt en waar los je het op.
 */
export function StartUitvoeringPanel({ resultaat }: { resultaat: StartgereedheidResultaat }) {
  const stijl = VERDICT_STIJL[resultaat.verdict];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', stijl.glow)} />

      <div className="relative flex items-center gap-4 border-b border-border/60 p-4">
        <VoortgangsRing pct={resultaat.pct} kleur={stijl.ring} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2D6FE8]/10">
              <Rocket className="h-3.5 w-3.5 text-[#2D6FE8]" />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#2D6FE8]">
              Startgereedheid uitvoering
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold', stijl.badge)}>
              <ShieldCheck className="h-3 w-3" />
              {stijl.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {resultaat.gereed}/{resultaat.totaalVereist} producten gereed
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{resultaat.samenvatting}</p>
        </div>
      </div>

      <ul className="relative divide-y divide-border/50">
        {resultaat.criteria.map((c) => (
          <li key={c.id} className="group flex items-start gap-2.5 px-4 py-2">
            <span className="mt-0.5">
              <StatusIcoon status={c.status} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs font-medium', c.status === 'gereed' ? 'text-foreground' : 'text-foreground')}>
                {c.titel}
              </p>
              <p className="text-[10px] leading-snug text-muted-foreground">{c.detail}</p>
            </div>
            {c.actieHref && c.status !== 'gereed' && (
              <Link
                href={c.actieHref}
                className="mt-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[#2D6FE8]/30 px-2 py-0.5 text-[10px] font-medium text-[#2D6FE8] opacity-80 transition-all hover:bg-[#2D6FE8]/10 hover:opacity-100"
              >
                {c.actieLabel ?? 'Oplossen'}
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
