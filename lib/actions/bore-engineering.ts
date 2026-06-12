'use server';

import { getTrace } from '@/lib/db/store';
import { runBoreEngineering, heeftSleuflozeSegmenten, sleuflozeSegmenten } from '@/lib/bore';
import { generateBoreDrawings } from '@/lib/drawings/bore-index';
import type { BoreEngineeringResult } from '@/lib/bore/types';
import type { DrawingResult } from '@/lib/drawings/types';
import { saveBoreEngineeringToDossier } from '@/lib/dossier/store';
import { parseGef } from '@/lib/connectors/gef/parse-gef';
import { addDemoSonderingen, getDemoUploadedSonderingen } from '@/lib/db/demo-store';

/**
 * GEF-CPT-upload: parse het bestand en voeg de sondering toe aan de sessie.
 * Boorengineering pakt geüploade sonderingen binnen 500 m van een segment
 * automatisch op (vóór demo-CPT's).
 */
export async function uploadGefAction(
  bestandsnaam: string,
  inhoud: string,
): Promise<
  | { ok: true; melding: string; sonderingId: string; aantalLagen: number; waarschuwingen: string[] }
  | { ok: false; error: string }
> {
  try {
    const resultaat = parseGef(inhoud, bestandsnaam.replace(/\.gef$/i, ''));
    addDemoSonderingen([resultaat.sondering]);
    return {
      ok: true,
      melding: `Sondering ${resultaat.sondering.id} geladen: ${resultaat.sondering.diepte} m diep, ${resultaat.sondering.lagen.length} lagen (dominant ${resultaat.sondering.grondsoort}). Totaal ${getDemoUploadedSonderingen().length} geüploade CPT('s).`,
      sonderingId: resultaat.sondering.id,
      aantalLagen: resultaat.sondering.lagen.length,
      waarschuwingen: resultaat.waarschuwingen,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'GEF-bestand kon niet worden gelezen.',
    };
  }
}

export async function getSleuflozeSegmentenAction(traceId: string) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  return sleuflozeSegmenten(trace).map((s) => ({
    volgorde: s.volgorde,
    wegnaam: s.wegnaam,
    legtechniek: s.legtechniek,
    lengteM: s.lengteM,
  }));
}

export async function runBoorengineeringAction(
  traceId: string,
  selectedVolgordes?: number[],
): Promise<BoreEngineeringResult> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  if (!heeftSleuflozeSegmenten(trace)) {
    throw new Error('Geen sleufloze segmenten (HDD/persing/sleufloos) op dit tracé');
  }
  const result = runBoreEngineering(trace, selectedVolgordes);
  saveBoreEngineeringToDossier(trace.projectId, traceId, trace.code, result);
  return result;
}

export async function generateBoorTekeningenAction(
  traceId: string,
  engineering: BoreEngineeringResult,
): Promise<DrawingResult[]> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  return generateBoreDrawings(trace, engineering);
}

export async function runVolledigeBoorengineeringAction(
  traceId: string,
  selectedVolgordes?: number[],
): Promise<{ engineering: BoreEngineeringResult; tekeningen: DrawingResult[] }> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const engineering = await runBoorengineeringAction(traceId, selectedVolgordes);
  const tekeningen = await generateBoorTekeningenAction(traceId, engineering);
  const { saveTekeningenToDossier, addToDossier } = await import('@/lib/dossier/store');
  saveTekeningenToDossier(trace.projectId, traceId, tekeningen);

  // Uitvoeringsplan boringen hoort bij de boorset in het dossier
  const { buildBoorUitvoeringsplan } = await import('@/lib/bore/uitvoeringsplan');
  addToDossier({
    projectId: trace.projectId,
    traceId,
    naam: `Uitvoeringsplan boringen — ${trace.code}`,
    type: 'rapport',
    inhoud: buildBoorUitvoeringsplan(trace, engineering),
    formaat: 'markdown',
  });

  return { engineering, tekeningen };
}
