import type { DemoTrace } from '@/demo/traces';
import type { BoreEngineeringResult } from '@/lib/bore/types';
import type { DrawingResult } from './types';
import { generateAllBorePlanDrawings } from './bore-plan';
import { generateAllBoreProfileDrawings } from './bore-profile';
import { generateAllBoreSetupDrawings } from './bore-setup';
import { valideerTekening } from './format';

export function generateBoreDrawings(
  trace: DemoTrace,
  result: BoreEngineeringResult,
): DrawingResult[] {
  const plans = generateAllBorePlanDrawings(trace, result);
  const profiles = generateAllBoreProfileDrawings(trace, result.segmenten);
  const setups = generateAllBoreSetupDrawings(trace, result.segmenten);

  const drawings: DrawingResult[] = [
    ...plans.map((p) => ({
      type: 'bore_plan' as const,
      label: p.label,
      svg: p.svg,
      formaat: 'svg' as const,
      segmentVolgorde: p.volgorde,
    })),
    ...profiles.map((p) => ({
      type: 'bore_profile' as const,
      label: p.label,
      svg: p.svg,
      formaat: 'svg' as const,
      segmentVolgorde: p.volgorde,
    })),
    ...setups.map((p) => ({
      type: 'bore_setup' as const,
      label: p.label,
      svg: p.svg,
      formaat: 'svg' as const,
      segmentVolgorde: p.volgorde,
    })),
  ];

  for (const drawing of drawings) {
    const { geldig, fouten } = valideerTekening(drawing.svg, drawing.type);
    if (!geldig) {
      throw new Error(
        `Boor-tekening ${drawing.type} S${drawing.segmentVolgorde} voor ${trace.code}: ${fouten.join('; ')}`
      );
    }
  }

  return drawings;
}
