'use client';

import type { Netontwerp } from '@/lib/netontwerp/types';
import type { MapTrace } from '@/components/trace-map';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import { lijnLengteM } from '@/lib/netontwerp/chainage';
import { getTraceLines } from '@/lib/trace-edit';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface StapTraceProps {
  ontwerp: Netontwerp;
  traces: MapTrace[];
  geselecteerdTraceId: string | undefined;
  onSelecteerTrace: (traceId: string) => void;
  opslagStatus: 'idle' | 'saving' | 'saved';
}

/**
 * Stap 2 — tracé schetsen. Het tekenen zelf gebeurt op de kaart (teken-/
 * bewerkmodus links); dit paneel toont de tracés van het ontwerp en de
 * opslagstatus.
 */
export function StapTrace({
  ontwerp,
  traces,
  geselecteerdTraceId,
  onSelecteerTrace,
  opslagStatus,
}: StapTraceProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="font-semibold">Tracé schetsen</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
          <li>Selecteer hieronder het tracé dat je wilt schetsen of aanpassen.</li>
          <li>Kies links de modus <strong>Tekenen</strong> (nieuwe lijn) of <strong>Bewerken</strong> (punten verslepen).</li>
          <li>Klik op de kaart om punten toe te voegen — wijzigingen worden automatisch opgeslagen.</li>
        </ol>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Opslag:{' '}
          {opslagStatus === 'saving' ? 'bezig…' : opslagStatus === 'saved' ? 'opgeslagen ✓' : 'gereed'}
        </p>
      </div>

      <div className="space-y-2">
        {traces.map((trace) => {
          const lengte = getTraceLines(trace).reduce((s, l) => s + lijnLengteM(l), 0);
          const keuze = ontwerp.kabelKeuzes.find((k) => k.traceId === trace.id);
          const actief = trace.id === geselecteerdTraceId;
          return (
            <button
              key={trace.id}
              type="button"
              onClick={() => onSelecteerTrace(trace.id)}
              className={`w-full rounded-lg border p-3 text-left text-xs transition-colors ${
                actief ? 'border-[#2D6FE8] bg-[#2D6FE8]/5' : 'border-border bg-card hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: trace.kleur }}
                />
                <span className="font-medium">{trace.code}</span>
                <span className="ml-auto font-mono text-muted-foreground">
                  {lengte.toFixed(0)} m
                </span>
              </div>
              <p className="mt-1 truncate text-muted-foreground">{trace.naam}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {DISCIPLINE_LABELS[trace.discipline as keyof typeof DISCIPLINE_LABELS] ?? trace.discipline}
                {keuze ? ` · kabel gekozen` : ''}
              </p>
            </button>
          );
        })}
      </div>

      {geselecteerdTraceId && (
        <Link
          href={`/project/${ontwerp.projectId}/trace/${geselecteerdTraceId}`}
          className="flex items-center gap-1.5 text-xs text-[#2D6FE8] hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open tracé-werkruimte (data, risico’s, engineering)
        </Link>
      )}
    </div>
  );
}
