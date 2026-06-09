'use client';

import { useMemo, useState } from 'react';
import type { ProjectPlanning, PlanningActiviteit } from '@/lib/planning/types';
import {
  PLANNING_CATEGORIE_KLEUREN,
  PLANNING_CATEGORIE_LABELS,
} from '@/lib/planning/types';
import { formatDatumNl } from '@/lib/planning/dates';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, Flag, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanningActiviteitenProps {
  planning: ProjectPlanning;
}

const STATUS_LABELS: Record<PlanningActiviteit['status'], string> = {
  afgerond: 'Afgerond',
  bezig: 'Bezig',
  gepland: 'Gepland',
  blokkerend: 'Blokkerend',
};

export function PlanningActiviteiten({ planning }: PlanningActiviteitenProps) {
  const [traceFilter, setTraceFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const traceCodes = useMemo(() => {
    const codes = new Set(planning.activiteiten.map((a) => a.traceCode).filter(Boolean) as string[]);
    return [...codes].sort();
  }, [planning]);

  const filtered = useMemo(() => {
    if (traceFilter === 'all') return planning.activiteiten;
    return planning.activiteiten.filter((a) => a.traceCode === traceFilter || a.categorie === 'project');
  }, [planning, traceFilter]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Activiteitenbeschrijving</p>
        <Select value={traceFilter} onValueChange={(v) => setTraceFilter(v ?? 'all')}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Filter tracé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle tracés</SelectItem>
            {traceCodes.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((a) => {
          const isOpen = expanded.has(a.id);
          const predLabels = a.voorgangers
            .map((vid) => planning.activiteiten.find((x) => x.id === vid)?.titel)
            .filter(Boolean);

          return (
            <Card
              key={a.id}
              className={cn('overflow-hidden', a.kritiekPad && 'border-l-4 border-l-amber-500')}
            >
              <CardHeader
                className="cursor-pointer p-3 pb-2"
                onClick={() => toggle(a.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {isOpen ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-sm leading-snug">{a.titel}</CardTitle>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDatumNl(a.startDatum)} — {formatDatumNl(a.eindDatum)} · {a.duurDagen} dagen
                        {a.traceCode && ` · ${a.traceCode}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {a.milestone && (
                      <Badge variant="outline" className="text-[10px]">
                        <Flag className="mr-0.5 h-3 w-3" /> Milestone
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: `${PLANNING_CATEGORIE_KLEUREN[a.categorie]}50`,
                        color: PLANNING_CATEGORIE_KLEUREN[a.categorie],
                      }}
                    >
                      {PLANNING_CATEGORIE_LABELS[a.categorie]}
                    </Badge>
                    <Badge
                      variant={
                        a.status === 'blokkerend'
                          ? 'destructive'
                          : a.status === 'afgerond'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {STATUS_LABELS[a.status]} {a.voortgangPct > 0 && a.voortgangPct < 100 ? `${a.voortgangPct}%` : ''}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-3 border-t border-border/60 bg-muted/20 p-3 pt-3 text-xs">
                  <div>
                    <p className="mb-1 font-medium text-foreground">Omschrijving</p>
                    <p className="leading-relaxed text-muted-foreground">{a.beschrijving}</p>
                  </div>

                  {predLabels.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-foreground">Voorgangers</p>
                      <ul className="list-inside list-disc text-muted-foreground">
                        {predLabels.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="mb-1 font-medium text-foreground">Deliverables</p>
                    <div className="flex flex-wrap gap-1">
                      {a.deliverables.map((d) => (
                        <Badge key={d} variant="secondary" className="text-[10px] font-normal">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {a.toegewezenAan && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3 w-3" />
                      {a.toegewezenAan}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
