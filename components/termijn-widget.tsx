import Link from 'next/link';
import type { TermijnSignaal } from '@/lib/services/termijnbewaking';
import { cn } from '@/lib/utils';
import { AlarmClock, ArrowRight } from 'lucide-react';

const URGENTIE_STIJL = {
  rood: 'border-red-500/50 bg-red-500/5',
  oranje: 'border-amber-500/50 bg-amber-500/5',
  blauw: 'border-[#2D6FE8]/40 bg-[#2D6FE8]/5',
} as const;

const URGENTIE_STIP = {
  rood: 'bg-red-500',
  oranje: 'bg-amber-500',
  blauw: 'bg-[#2D6FE8]',
} as const;

/**
 * Termijnbewaking-widget: naderende vergunningbesluiten, het KLIC-meldvenster
 * en kritiek-pad-starts — gesorteerd op urgentie.
 */
export function TermijnWidget({
  signalen,
  toonProject = false,
}: {
  signalen: TermijnSignaal[];
  toonProject?: boolean;
}) {
  if (signalen.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#2D6FE8]">
        <AlarmClock className="h-3.5 w-3.5" />
        Termijnbewaking
      </p>
      <div className="mt-2 space-y-1.5">
        {signalen.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className={cn(
              'group flex items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors hover:brightness-95',
              URGENTIE_STIJL[s.urgentie],
            )}
          >
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', URGENTIE_STIP[s.urgentie])} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {s.titel}
                {toonProject && (
                  <span className="ml-1 font-normal text-muted-foreground">· {s.projectNaam}</span>
                )}
              </span>
              <span className="block text-[10px] leading-snug text-muted-foreground">{s.detail}</span>
            </span>
            <span className="mt-0.5 flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
              {s.dagenResterend < 0
                ? `${Math.abs(s.dagenResterend)}d over tijd`
                : s.dagenResterend === 0
                  ? 'vandaag'
                  : `${s.dagenResterend}d`}
              <ArrowRight className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
