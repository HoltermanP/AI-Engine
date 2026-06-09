import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import type { DrawingResult } from './types';
import { generateTracePlan } from './trace-plan';
import { generateLengthProfile } from './length-profile';
import { generateCrossSection } from './cross-section';
import { generateCrossingDetail } from './crossing-detail';
import { generateStationDrawing } from './station';
import { valideerTekening } from './format';

export type { DrawingResult, DrawingType } from './types';
export {
  TEKENING_STRUCTUUR_EISEN,
  valideerTekening,
  valideerAlleTekeningen,
  defaultRevisieRows,
} from './format';
export { TEKENING_NORMEN, NLCS_LIJNDIKTE, NLCS_LIJNTYPE } from './nlcs';

export function generateDrawings(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[]
): DrawingResult[] {
  const drawings: DrawingResult[] = [
    { type: 'trace_plan', label: 'Tracétekening', svg: generateTracePlan(trace, bestaandNet), formaat: 'svg' },
    { type: 'length_profile', label: 'Lengteprofiel', svg: generateLengthProfile(trace), formaat: 'svg' },
    { type: 'cross_section', label: 'Dwarsprofiel (AVOI)', svg: generateCrossSection(trace), formaat: 'svg' },
    { type: 'crossing_detail', label: 'Kruisingsdetail', svg: generateCrossingDetail(trace), formaat: 'svg' },
  ];

  if (trace.discipline === 'stations') {
    drawings.push({
      type: 'station',
      label: 'Stationstekening',
      svg: generateStationDrawing(trace),
      formaat: 'svg',
    });
  }

  for (const drawing of drawings) {
    const { geldig, fouten } = valideerTekening(drawing.svg, drawing.type);
    if (!geldig) {
      throw new Error(
        `Tekening ${drawing.type} voor ${trace.code} voldoet niet aan structuur-eisen: ${fouten.join('; ')}`
      );
    }
  }

  return drawings;
}
