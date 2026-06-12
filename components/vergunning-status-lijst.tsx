'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zetVergunningStatusAction } from '@/lib/actions/startgereedheid';
import {
  VERGUNNING_STATUS_LABELS,
  type VergunningStatus,
} from '@/lib/db/vergunningen-store';
import type { VergunningRegel } from '@/lib/services/startgereedheid';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const STATUS_KLEUR: Record<VergunningStatus, string> = {
  niet_ingediend: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300',
  ingediend: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  verleend: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
};

/**
 * Vergunningstatussen bijwerken vanuit de cockpit: zodra alles op
 * "verleend" staat, springt het criterium (en mogelijk de gate) op groen.
 */
export function VergunningStatusLijst({
  projectId,
  vergunningen,
}: {
  projectId: string;
  vergunningen: VergunningRegel[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (vergunningen.length === 0) return null;

  const wijzig = (vergunningId: string, status: VergunningStatus) => {
    startTransition(async () => {
      await zetVergunningStatusAction(projectId, vergunningId, status);
      router.refresh();
    });
  };

  return (
    <div className="mt-1.5 space-y-1">
      {vergunningen.map((v) => (
        <div key={v.id} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium">{v.naam}</p>
            <p className="text-[9px] text-muted-foreground">
              {v.bevoegdGezag} · termijn {v.termijnWeken} wkn
            </p>
          </div>
          <select
            value={v.status}
            disabled={pending}
            onChange={(e) => wijzig(v.id, e.target.value as VergunningStatus)}
            className={cn(
              'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
              STATUS_KLEUR[v.status],
            )}
          >
            {(Object.keys(VERGUNNING_STATUS_LABELS) as VergunningStatus[]).map((s) => (
              <option key={s} value={s}>
                {VERGUNNING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      ))}
      {pending && (
        <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Loader2 className="h-2.5 w-2.5 animate-spin" /> Status bijwerken…
        </p>
      )}
    </div>
  );
}
