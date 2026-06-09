import type { ConflictErnst, ConflictType } from '@/lib/db/types';
import type { BodemRisicoklasse, BodemTraceKruising } from './types';
import { RISICO_LABEL } from './types';
import { gebiedLabelMetRelatie } from './trace-kruising';

function ernstVoorKruising(k: BodemTraceKruising): ConflictErnst {
  if (k.relatie === 'doorschreden') {
    if (k.risicoklasse === 'zeer_hoog' || k.risicoklasse === 'hoog') return 'blokkerend';
    if (k.risicoklasse === 'middel') return 'waarschuwing';
    return 'info';
  }
  if (k.risicoklasse === 'zeer_hoog' || k.risicoklasse === 'hoog') return 'waarschuwing';
  return 'info';
}

export interface BodemConflictDraft {
  traceId: string;
  titel: string;
  type: ConflictType;
  ernst: ConflictErnst;
  norm?: string;
  waardeGemeten?: number;
  waardeEis?: number;
  toelichting: string;
  x: number;
  y: number;
}

export function detectBodemRisicoConflicts(
  traceId: string,
  kruisingen: BodemTraceKruising[]
): BodemConflictDraft[] {
  const conflicts: BodemConflictDraft[] = [];

  for (const k of kruisingen) {
    const ernst = ernstVoorKruising(k);
    const relLabel = k.relatie === 'doorschreden' ? 'doorschreden' : `nabij (${k.afstandTraceM} m)`;
    conflicts.push({
      traceId,
      titel: `Bodemrisico — ${k.naam}`,
      type: 'bodemrisico',
      ernst,
      norm: 'NEN 5725 / Wbb',
      waardeGemeten: k.afstandTraceM,
      waardeEis: k.relatie === 'doorschreden' ? 0 : undefined,
      toelichting: `Risicogebied ${relLabel}: ${RISICO_LABEL[k.risicoklasse as BodemRisicoklasse]} (${gebiedLabelMetRelatie(k).split(': ').slice(1).join(': ')}) — ${k.naam}`,
      x: k.x,
      y: k.y,
    });
  }

  return conflicts;
}
