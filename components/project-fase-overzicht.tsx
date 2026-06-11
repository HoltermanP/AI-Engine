'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DeliverableStatusBadge } from '@/components/deliverable-status-badge';
import {
  PROJECT_FASEN,
  bepaalActieveFase,
  berekenFaseVoortgang,
  type DeliverableStatus,
  type DeliverableStatusRecord,
  type ProjectFaseId,
} from '@/lib/process/fasen';
import { cn } from '@/lib/utils';

interface ProjectFaseOverzichtProps {
  records: DeliverableStatusRecord[];
  className?: string;
}

function FaseIndicator({
  nummer,
  afgerond,
  actief,
}: {
  nummer: number;
  afgerond: boolean;
  actief: boolean;
}) {
  if (afgerond) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
        actief
          ? 'bg-[#2D6FE8] text-white shadow-md shadow-[#2D6FE8]/30'
          : 'bg-muted text-muted-foreground ring-1 ring-border'
      )}
    >
      {nummer}
    </span>
  );
}

export function ProjectFaseOverzicht({ records, className }: ProjectFaseOverzichtProps) {
  const [open, setOpen] = useState(false);

  const voortgang = useMemo(() => berekenFaseVoortgang(records), [records]);
  const actieveFase = useMemo(() => bepaalActieveFase(records), [records]);

  const statusPerDeliverable = useMemo(() => {
    const map = new Map<string, DeliverableStatus>();
    for (const record of records) {
      map.set(`${record.faseId}:${record.deliverableId}`, record.status);
    }
    return map;
  }, [records]);

  const isAfgerond = (faseId: ProjectFaseId) => {
    const v = voortgang.find((item) => item.fase.id === faseId);
    return !!v && v.totaal > 0 && v.definitief === v.totaal;
  };

  return (
    <Card className={cn('surface-card gap-0 py-0', className)}>
      <CardContent className="p-3">
        {/* Fase-stepper: horizontaal scrollbaar; labels van niet-actieve fasen vanaf md */}
        <ol
          aria-label="Projectfasen"
          className="flex items-center gap-1 overflow-x-auto [scrollbar-width:thin]"
        >
          {PROJECT_FASEN.map((fase, index) => {
            const actief = fase.id === actieveFase;
            const afgerond = isAfgerond(fase.id);
            return (
              <li key={fase.id} className="flex min-w-0 shrink-0 items-center md:flex-1">
                {index > 0 && (
                  <div className="mx-1 flex min-w-[0.75rem] flex-1 items-center">
                    <div
                      className={cn(
                        'h-0.5 w-full min-w-[0.75rem] rounded-full transition-colors',
                        afgerond || isAfgerond(PROJECT_FASEN[index - 1].id)
                          ? 'bg-emerald-400'
                          : 'bg-border'
                      )}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    'flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2 py-1.5',
                    actief && 'bg-[#2D6FE8]/10 ring-1 ring-[#2D6FE8]/30'
                  )}
                >
                  <FaseIndicator nummer={fase.nummer} afgerond={afgerond} actief={actief} />
                  <div className={cn('min-w-0', !actief && 'hidden md:block')}>
                    <p
                      className={cn(
                        'truncate text-xs font-medium leading-tight',
                        actief ? 'text-[#2D6FE8]' : 'text-foreground'
                      )}
                    >
                      {fase.kort}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {actief
                        ? 'Actieve fase'
                        : afgerond
                          ? 'Afgerond'
                          : `Fase ${fase.nummer}`}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Uitklapbaar deliverables-overzicht per fase */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-2 flex min-h-10 w-full items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )}
          {open ? 'Verberg deliverables per fase' : 'Toon deliverables per fase'}
        </button>

        {open && (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PROJECT_FASEN.map((fase) => {
              const v = voortgang.find((item) => item.fase.id === fase.id);
              return (
                <div
                  key={fase.id}
                  className={cn(
                    'rounded-lg border border-border/60 p-3',
                    fase.id === actieveFase && 'border-[#2D6FE8]/40 bg-[#2D6FE8]/[0.04]'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {fase.nummer}. {fase.naam}
                    </p>
                    {v && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {v.definitief}/{v.totaal} definitief
                      </span>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {fase.deliverables.map((deliverable) => {
                      const status =
                        statusPerDeliverable.get(`${fase.id}:${deliverable.id}`) ??
                        'ontbreekt';
                      return (
                        <li
                          key={deliverable.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {deliverable.naam}
                          </span>
                          <DeliverableStatusBadge status={status} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
