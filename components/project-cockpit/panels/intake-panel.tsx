'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';

/**
 * Zijpaneel "Start" — projectoverzicht met de tracélijst. Selecteren toont het
 * tracé op de gedeelde kaart; doorklikken opent de stap "Tracé tekenen".
 */
export function IntakePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { allTraces, selectedTraceId, setSelectedTraceId } = useCockpit();

  useCockpitMap(useMemo(() => ({ editable: false, defaultDrawMode: 'none' as const }), []));

  const naarStap = useCallback(
    (stap: string, traceId?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('stap', stap);
      if (traceId) params.set('traceId', traceId);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3 p-3">
      <div>
        <h2 className="text-sm font-semibold">Tracés in dit project</h2>
        <p className="text-[11px] text-muted-foreground">
          Kies een tracé om te bekijken, of begin met tekenen.
        </p>
      </div>

      <div className="space-y-1.5">
        {allTraces.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nog geen tracés. Ga naar “Tracé tekenen” om te beginnen.
          </p>
        )}
        {allTraces.map((t) => (
          <Card
            key={t.id}
            onClick={() => setSelectedTraceId(t.id)}
            className={cn(
              'cursor-pointer p-2.5 transition-colors hover:border-[#2D6FE8]/50',
              selectedTraceId === t.id && 'border-[#2D6FE8] ring-1 ring-[#2D6FE8]/30'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: t.kleur }}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{t.code} — {t.naam}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {DISCIPLINE_LABELS[t.discipline]} · {t.fase}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTraceId(t.id);
                  naarStap('trace', t.id);
                }}
              >
                <GitBranch className="mr-1 h-3.5 w-3.5" /> Tekenen
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
