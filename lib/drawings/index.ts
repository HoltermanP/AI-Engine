import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { DrawingResult } from './types';
import { generateTracePlan } from './trace-plan';
import { generateLengthProfile } from './length-profile';
import { generateCrossSection } from './cross-section';
import { generateCrossingDetail } from './crossing-detail';
import { generateKnelpuntenOverzicht } from './knelpunten-overzicht';
import { generateStationDrawing } from './station';
import { valideerTekening } from './format';
import { type TitelblokOpts } from './titelblok';

export type { DrawingResult, DrawingType } from './types';
export {
  TEKENING_STRUCTUUR_EISEN,
  valideerTekening,
  valideerAlleTekeningen,
  defaultRevisieRows,
} from './format';
export { TEKENING_NORMEN, NLCS_LIJNDIKTE, NLCS_LIJNTYPE } from './nlcs';
export {
  generateTraceDxf,
  generateLengthProfileDxf,
  DXF_LAGEN,
  type TraceDxfInput,
  type LengteprofielDxfInput,
} from './dxf';
export {
  renderTitelblokSvg,
  wrapDrawingWithTitelblok,
  type TitelblokOpts,
  type TitelblokStatus,
} from './titelblok';
export { getConfiguredDwgConverter, type DwgConverter } from './dwg-converter';

/** Tekeningfase: bepaalt de set, het titelbloknummer (doc-code) en de status. */
export type TekeningFase = 'vo' | 'do' | 'uo';

const FASE_SET: Record<TekeningFase, DrawingResult['type'][]> = {
  // VO: situatie + AVOI-dwarsprofiel (voorkeursligging)
  vo: ['trace_plan', 'cross_section'],
  // DO: volledige ontwerpset incl. knelpunten- en boringenstaat
  do: ['trace_plan', 'length_profile', 'cross_section', 'crossing_detail', 'knelpunten_overzicht'],
  // UO/werktekeningen: volledige set met definitieve maatvoering
  uo: ['trace_plan', 'length_profile', 'cross_section', 'crossing_detail', 'knelpunten_overzicht'],
};

const FASE_PREFIX: Record<TekeningFase, string> = {
  vo: 'VO',
  do: 'DO',
  uo: 'Werktekening',
};


/**
 * Genereert de tekeningen voor een tracé per ontwerpfase (VO/DO/UO) en
 * voorziet elke SVG van een NLCS-titelblok met fase-doc-code en status.
 * Het optionele `titelblok`-argument overschrijft de defaults; bestaande
 * callers zonder fase krijgen de DO-set.
 */
export function generateDrawings(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[],
  titelblok?: TitelblokOpts,
  fase: TekeningFase = 'do',
  conflicten: DetectedConflict[] = []
): DrawingResult[] {
  const alle: DrawingResult[] = [
    { type: 'trace_plan', label: 'Situatietekening', svg: generateTracePlan(trace, bestaandNet, conflicten), formaat: 'svg' },
    { type: 'length_profile', label: 'Lengteprofiel', svg: generateLengthProfile(trace), formaat: 'svg' },
    { type: 'cross_section', label: 'Dwarsprofiel (AVOI)', svg: generateCrossSection(trace), formaat: 'svg' },
    { type: 'crossing_detail', label: 'Kruisingsdetail', svg: generateCrossingDetail(trace), formaat: 'svg' },
    ...(FASE_SET[fase].includes('knelpunten_overzicht')
      ? generateKnelpuntenOverzicht(trace, conflicten)
      : []),
  ];

  const drawings = alle.filter((d) => FASE_SET[fase].includes(d.type));

  if (trace.discipline === 'stations' && fase !== 'vo') {
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

  // Elke tekening heeft al een volwaardig NLCS-titelblok ín het tekenvlak
  // (svgDocument); een tweede extern blok eronder is dubbelop en
  // onprofessioneel. Het titelblok-argument blijft beschikbaar voor callers
  // die een kale SVG alsnog willen wrappen (wrapDrawingWithTitelblok).
  void titelblok;
  return drawings.map((drawing) => ({
    ...drawing,
    label: `${FASE_PREFIX[fase]} — ${drawing.label}`,
  }));
}

/** Volledig tekeningenpakket: VO-, DO- en werktekeningen (UO) in één keer. */
export function generateAlleFaseTekeningen(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[],
  titelblok?: TitelblokOpts,
  conflicten: DetectedConflict[] = []
): DrawingResult[] {
  return (['vo', 'do', 'uo'] as TekeningFase[]).flatMap((fase) =>
    generateDrawings(trace, bestaandNet, titelblok, fase, conflicten)
  );
}

export { generateKnelpuntenOverzicht } from './knelpunten-overzicht';
