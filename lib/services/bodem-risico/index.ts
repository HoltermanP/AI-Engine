import type { VervuildeGrondLocatie } from '@/lib/connectors/vervuilde-grond/types';
import {
  classifyVervuildeGrondLocaties,
  samenvattingBodemRisico,
} from './classify';
import {
  aggregateBodemRisicoGebieden,
  enrichLocatiesMetAfstand,
} from './gebieden';
import { analyseBodemTraceKruisingen } from './trace-kruising';
import type {
  BodemRisicoGebied,
  BodemRisicoLocatie,
  BodemRisicoSamenvatting,
  BodemTraceKruising,
} from './types';

export { classifyVervuildeGrondLocaties, samenvattingBodemRisico } from './classify';
export { aggregateBodemRisicoGebieden, enrichLocatiesMetAfstand } from './gebieden';
export {
  analyseBodemTraceKruisingen,
  BODEM_NABIJ_THRESHOLD_M,
  gebiedLabelMetRelatie,
} from './trace-kruising';
export { detectBodemRisicoConflicts } from './conflicten';

export type {
  BodemGebiedType,
  BodemRisicoGebied,
  BodemRisicoLocatie,
  BodemRisicoSamenvatting,
  BodemRisicoklasse,
  BodemTraceKruising,
  BodemTraceRelatie,
} from './types';
export {
  GEBIED_TYPE_LABEL,
  RISICO_KLEUR,
  RISICO_LABEL,
  RISICO_VOLGORDE,
} from './types';

export interface BodemRisicoAnalyse {
  locaties: BodemRisicoLocatie[];
  gebieden: BodemRisicoGebied[];
  samenvatting: BodemRisicoSamenvatting;
  traceKruisingen: BodemTraceKruising[];
}

export function analyseerBodemRisico(
  locaties: VervuildeGrondLocatie[],
  trace?: [number, number, number?][],
  traceLines?: [number, number, number?][][]
): BodemRisicoAnalyse {
  const classified = classifyVervuildeGrondLocaties(locaties);
  const enriched = trace ? enrichLocatiesMetAfstand(classified, trace) : classified;
  const gebieden = aggregateBodemRisicoGebieden(enriched);
  const samenvatting = samenvattingBodemRisico(enriched);
  const traceKruisingen =
    trace && trace.length > 0
      ? analyseBodemTraceKruisingen(enriched, trace, traceLines)
      : [];

  return { locaties: enriched, gebieden, samenvatting, traceKruisingen };
}
