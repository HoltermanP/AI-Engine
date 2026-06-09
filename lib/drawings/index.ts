import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import { formatDocCode } from '@/lib/dossier/doc-code';
import type { DrawingResult } from './types';
import { generateTracePlan } from './trace-plan';
import { generateLengthProfile } from './length-profile';
import { generateCrossSection } from './cross-section';
import { generateCrossingDetail } from './crossing-detail';
import { generateStationDrawing } from './station';
import { valideerTekening, projectForTrace } from './format';
import { wrapDrawingWithTitelblok, type TitelblokOpts } from './titelblok';

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

/**
 * Genereert alle tekeningen voor een tracé en voorziet elke SVG van een
 * NLCS-titelblok. Het optionele `titelblok`-argument overschrijft de
 * defaults (projectnaam/opdrachtgever uit het demoproject, doc-code per
 * tekening); bestaande callers blijven zonder argument werken.
 */
export function generateDrawings(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[],
  titelblok?: TitelblokOpts
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

  const project = projectForTrace(trace);
  return drawings.map((drawing, i) => ({
    ...drawing,
    svg: wrapDrawingWithTitelblok(drawing.svg, {
      projectnaam: project.naam,
      opdrachtgever: project.opdrachtgever,
      tekeningnummer: formatDocCode({
        projectCode: trace.code,
        fase: 'do',
        type: 'TEK',
        volgnummer: i + 1,
      }),
      ...titelblok,
    }),
  }));
}
