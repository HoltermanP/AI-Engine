'use client';

import { useMemo } from 'react';
import type { ProjectPlanning, PlanningActiviteit } from '@/lib/planning/types';
import {
  PLANNING_CATEGORIE_KLEUREN,
  PLANNING_CATEGORIE_LABELS,
} from '@/lib/planning/types';
import { diffDays, formatDatumNl } from '@/lib/planning/dates';
import { cn } from '@/lib/utils';

interface PlanningGanttChartProps {
  planning: ProjectPlanning;
  traceFilter?: string | null;
}

const ROW_H = 32;
const LABEL_W = 220;
const DAY_W = 18;

function statusOpacity(status: PlanningActiviteit['status']): number {
  if (status === 'afgerond') return 0.55;
  if (status === 'bezig') return 1;
  if (status === 'blokkerend') return 1;
  return 0.75;
}

export function PlanningGanttChart({ planning, traceFilter }: PlanningGanttChartProps) {
  const { rows, totalDays, weeks, todayOffset } = useMemo(() => {
    const start = new Date(planning.startDatum);
    const end = new Date(planning.eindDatum);
    const total = diffDays(planning.startDatum, planning.eindDatum);
    const today = new Date().toISOString().slice(0, 10);
    const todayOff =
      today >= planning.startDatum && today <= planning.eindDatum
        ? diffDays(planning.startDatum, today) - 1
        : -1;

    let activiteiten = planning.activiteiten;
    if (traceFilter) {
      activiteiten = activiteiten.filter(
        (a) => a.traceCode === traceFilter || a.categorie === 'project',
      );
    }

    const grouped = new Map<string, PlanningActiviteit[]>();
    for (const a of activiteiten) {
      const key = a.traceCode ?? 'Project';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }

    const sortedKeys = [...grouped.keys()].sort((a, b) =>
      a === 'Project' ? -1 : b === 'Project' ? 1 : a.localeCompare(b),
    );

    const rowList: { type: 'header' | 'bar'; label: string; activity?: PlanningActiviteit }[] = [];
    for (const key of sortedKeys) {
      rowList.push({ type: 'header', label: key });
      for (const a of grouped.get(key)!) {
        rowList.push({ type: 'bar', label: a.titel, activity: a });
      }
    }

    const weekMarks: { offset: number; label: string }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const off = Math.round((cur.getTime() - start.getTime()) / 86400000);
      if (cur.getDay() === 1) {
        weekMarks.push({
          offset: off,
          label: cur.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
        });
      }
      cur.setDate(cur.getDate() + 7);
    }

    return { rows: rowList, totalDays: total, weeks: weekMarks, todayOffset: todayOff };
  }, [planning, traceFilter]);

  const chartW = totalDays * DAY_W;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap gap-3 border-b border-border bg-muted/30 px-3 py-2">
        {(Object.keys(PLANNING_CATEGORIE_LABELS) as (keyof typeof PLANNING_CATEGORIE_LABELS)[]).map(
          (cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: PLANNING_CATEGORIE_KLEUREN[cat] }}
              />
              {PLANNING_CATEGORIE_LABELS[cat]}
            </span>
          ),
        )}
      </div>

      <div className="flex overflow-x-auto">
        <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-card" style={{ width: LABEL_W }}>
          <div
            className="flex items-end border-b border-border bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground"
            style={{ height: 36 }}
          >
            Activiteit
          </div>
          {rows.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className={cn(
                'flex items-center border-b border-border/60 px-2 text-[10px]',
                row.type === 'header' && 'bg-muted/50 font-semibold text-foreground',
              )}
              style={{ height: ROW_H }}
            >
              <span className={cn('truncate', row.type === 'bar' && 'pl-2 font-normal text-muted-foreground')}>
                {row.type === 'header' ? row.label : row.label.replace(/^.*? — /, '')}
              </span>
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative border-b border-border bg-muted/40" style={{ height: 36, width: chartW }}>
            {weeks.map((w) => (
              <div
                key={w.offset}
                className="absolute bottom-0 border-l border-border/60 pl-1 text-[9px] text-muted-foreground"
                style={{ left: w.offset * DAY_W, height: '100%' }}
              >
                {w.label}
              </div>
            ))}
          </div>

          <div className="relative" style={{ width: chartW }}>
            {todayOffset >= 0 && (
              <div
                className="pointer-events-none absolute top-0 z-10 w-0.5 bg-red-500/80"
                style={{ left: todayOffset * DAY_W + DAY_W / 2, height: rows.length * ROW_H }}
                title="Vandaag"
              />
            )}

            {rows.map((row, i) => (
              <div
                key={`chart-${row.label}-${i}`}
                className="relative border-b border-border/40"
                style={{ height: ROW_H }}
              >
                {Array.from({ length: totalDays }).map((_, di) =>
                  di % 7 === 0 ? (
                    <div
                      key={di}
                      className="absolute top-0 h-full border-l border-border/30"
                      style={{ left: di * DAY_W }}
                    />
                  ) : null,
                )}

                {row.activity && (
                  <GanttBar
                    activity={row.activity}
                    planningStart={planning.startDatum}
                    dayW={DAY_W}
                    totalDays={totalDays}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
        {formatDatumNl(planning.startDatum)} — {formatDatumNl(planning.eindDatum)} · {planning.duurDagen}{' '}
        dagen · {planning.activiteiten.length} activiteiten
      </div>
    </div>
  );
}

function GanttBar({
  activity,
  planningStart,
  dayW,
  totalDays,
}: {
  activity: PlanningActiviteit;
  planningStart: string;
  dayW: number;
  totalDays: number;
}) {
  const startOff = diffDays(planningStart, activity.startDatum) - 1;
  const width = Math.max(activity.duurDagen * dayW - 2, dayW);
  const left = Math.max(0, startOff * dayW + 1);
  const color = PLANNING_CATEGORIE_KLEUREN[activity.categorie];
  const opacity = statusOpacity(activity.status);

  return (
    <div
      className={cn(
        'absolute top-1.5 flex h-[calc(100%-12px)] min-w-[4px] cursor-default items-center overflow-hidden rounded px-1 text-[9px] font-medium text-white shadow-sm',
        activity.kritiekPad && 'ring-1 ring-amber-400',
        activity.status === 'blokkerend' && 'ring-2 ring-red-500',
      )}
      style={{
        left,
        width: Math.min(width, totalDays * dayW - left),
        backgroundColor: color,
        opacity,
      }}
      title={`${activity.titel}\n${formatDatumNl(activity.startDatum)} – ${formatDatumNl(activity.eindDatum)}\n${activity.beschrijving.slice(0, 120)}…`}
    >
      {width > 40 && (
        <span className="truncate">{activity.duurDagen}d</span>
      )}
    </div>
  );
}
