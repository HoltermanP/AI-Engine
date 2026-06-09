// Client-veilige tracé-filterhelpers — geen server-only imports (db/store, node:fs),
// zodat client components deze kunnen gebruiken zonder de hele datalaag te bundelen.
import type { ProjectStatus } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import type { Discipline, TraceFase } from '@/lib/db/types';
import type { TracePhase } from '@/lib/process/phases';

export interface TraceStats {
  trace: DemoTrace;
  lengteM: number;
  voortgang: number;
  processFase: TracePhase;
  openStappen: number;
  conflicten: number;
  blokkerendeConflicten: number;
}

export interface EnrichedTraceRow extends TraceStats {
  projectId: string;
  projectNaam: string;
  projectnummer: string;
  projectStatus: ProjectStatus;
  opdrachtgever: string;
}

export interface TraceFilterParams {
  fase?: TraceFase;
  discipline?: Discipline;
  uitvoering?: 'klaar';
  conflicten?: 'alle' | 'blokkerend';
  q?: string;
}

export function filterTraces(
  traces: EnrichedTraceRow[],
  filters: TraceFilterParams
): EnrichedTraceRow[] {
  let result = traces;

  if (filters.fase) {
    result = result.filter((t) => t.trace.fase === filters.fase);
  }
  if (filters.discipline) {
    result = result.filter((t) => t.trace.discipline === filters.discipline);
  }
  if (filters.uitvoering === 'klaar') {
    result = result.filter((t) => t.trace.fase === 'UO' || t.trace.fase === 'as_built');
  }
  if (filters.conflicten === 'blokkerend') {
    result = result.filter((t) => t.blokkerendeConflicten > 0);
  } else if (filters.conflicten === 'alle') {
    result = result.filter((t) => t.conflicten > 0);
  }
  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (t) =>
        t.trace.naam.toLowerCase().includes(q) ||
        t.trace.code.toLowerCase().includes(q) ||
        t.projectNaam.toLowerCase().includes(q) ||
        t.trace.wegnaam.toLowerCase().includes(q) ||
        t.trace.leglocatie.toLowerCase().includes(q)
    );
  }

  return result;
}

export function countTracesPerFase(traces: EnrichedTraceRow[]): Record<TraceFase, number> {
  const counts: Record<TraceFase, number> = { VO: 0, DO: 0, UO: 0, as_built: 0 };
  for (const t of traces) {
    counts[t.trace.fase]++;
  }
  return counts;
}
