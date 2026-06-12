'use server';

/**
 * Server actions voor werkvoorbereidings-documenten per tracé.
 *
 * Genereert deterministisch (zonder AI) markdown-documenten op basis van de
 * demo-store: uitgangspuntennotitie, proefsleuvenplan, V&G-plan ontwerpfase
 * en kabeltrekplan. Elke actie retourneert { titel, docCode, markdown } of
 * { error } zodat de client de fout inline kan tonen.
 */

import {
  getDemoTrace,
  getDemoProject,
  getDemoBestaandNet,
  getDemoTraceSession,
} from '@/lib/db/demo-store';
import type { DemoTrace } from '@/demo/traces';
import { genereerUitgangspuntennotitie } from '@/lib/dossier/uitgangspunten';
import {
  genereerProefsleuvenPlan,
  type ProefsleufNetInput,
  type ProefsleufTraceInput,
} from '@/lib/services/proefsleuven';
import { genereerVgPlan } from '@/lib/dossier/vg-plan';
import { genereerKabeltrekplan } from '@/lib/dossier/kabeltrekplan';
import { sectiesUitTraceLines } from '@/lib/dossier/trekvak-geometrie';
import type { TraceSectie } from '@/lib/calc/kabeltrek';
import { traceLengthM } from '@/lib/geo';

export type WvbDocumentResultaat =
  | { titel: string; docCode: string; markdown: string }
  | { error: string };

interface WvbContext {
  trace: DemoTrace;
  projectNaam: string;
  projectCode: string;
  opdrachtgever?: string;
}

function getContext(traceId: string): WvbContext | null {
  const trace = getDemoTrace(traceId);
  if (!trace) return null;
  const project = getDemoProject(trace.projectId);
  return {
    trace,
    projectNaam: project?.naam ?? 'Onbekend project',
    projectCode: project?.projectnummer ?? 'PROJ',
    opdrachtgever: project?.opdrachtgever,
  };
}

function traceLengte(trace: DemoTrace): number {
  return (
    trace.segmenten.reduce((sum, s) => sum + s.lengteM, 0) ||
    traceLengthM(trace.coordinates, trace.traceLines)
  );
}

/** Signalen (vrije tekst) uit de opgeslagen tracétoets van deze sessie. */
function toetsSignalen(traceId: string): string[] {
  const toets = getDemoTraceSession(traceId)?.traceToets;
  if (!toets) return [];
  return toets.conflicten.map(
    (c) => `${c.titel}${c.toelichting ? ` — ${c.toelichting}` : ''}`
  );
}

/** Punt op het tracé bij gegeven kettingmaat (lineaire interpolatie). */
function puntOpChainage(
  coordinates: [number, number, number?][],
  chainage: number
): [number, number] {
  let rest = chainage;
  for (let i = 1; i < coordinates.length; i++) {
    const [x1, y1] = coordinates[i - 1];
    const [x2, y2] = coordinates[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (rest <= len) {
      const t = len === 0 ? 0 : rest / len;
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
    }
    rest -= len;
  }
  const laatste = coordinates[coordinates.length - 1];
  return laatste ? [laatste[0], laatste[1]] : [0, 0];
}

export async function genereerUitgangspuntenAction(
  traceId: string
): Promise<WvbDocumentResultaat> {
  try {
    const ctx = getContext(traceId);
    if (!ctx) return { error: `Tracé "${traceId}" niet gevonden.` };
    const { trace } = ctx;

    const notitie = genereerUitgangspuntennotitie({
      projectNaam: ctx.projectNaam,
      projectCode: ctx.projectCode,
      traceNaam: trace.naam,
      traceCode: trace.code,
      discipline: trace.discipline,
      netType: trace.netType,
      vereisteDekkingM: trace.vereisteDekking,
      diepteNapM: trace.coordinates[0]?.[2],
    });
    return { titel: notitie.titel, docCode: notitie.docCode, markdown: notitie.markdown };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Genereren uitgangspuntennotitie mislukt.',
    };
  }
}

export async function genereerProefsleuvenAction(
  traceId: string
): Promise<WvbDocumentResultaat> {
  try {
    const ctx = getContext(traceId);
    if (!ctx) return { error: `Tracé "${traceId}" niet gevonden.` };
    const { trace } = ctx;

    // Vereenvoudiging: in-/uittredepunten van boringen worden afgeleid uit de
    // cumulatieve segmentlengtes langs de tracégeometrie (indicatieve ligging).
    const boringen: ProefsleufTraceInput['boringen'] = [];
    let chainage = 0;
    for (const seg of trace.segmenten) {
      if (seg.legtechniek !== 'open_ontgraving') {
        boringen.push({
          wegnaam: seg.wegnaam,
          startRd: puntOpChainage(trace.coordinates, chainage),
          eindRd: puntOpChainage(trace.coordinates, chainage + seg.lengteM),
        });
      }
      chainage += seg.lengteM;
    }

    const bestaandNet: ProefsleufNetInput[] = getDemoBestaandNet().map((net) => ({
      id: net.id,
      thema: net.thema,
      beheerder: net.beheerder,
      nauwkeurigheid: net.nauwkeurigheid,
      coordinates: net.coordinates,
    }));

    const plan = genereerProefsleuvenPlan(
      {
        traceId: trace.id,
        traceCode: trace.code,
        traceNaam: trace.naam,
        projectCode: ctx.projectCode,
        coordinates: trace.coordinates,
        boringen,
      },
      bestaandNet
    );
    return {
      titel: `Proefsleuvenplan ${trace.code}`,
      docCode: plan.docCode,
      markdown: plan.markdown,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Genereren proefsleuvenplan mislukt.' };
  }
}

export async function genereerVgPlanAction(
  traceId: string
): Promise<WvbDocumentResultaat> {
  try {
    const ctx = getContext(traceId);
    if (!ctx) return { error: `Tracé "${traceId}" niet gevonden.` };
    const { trace } = ctx;

    const signalen = toetsSignalen(traceId);
    const aantalBoringen = trace.segmenten.filter(
      (s) => s.legtechniek !== 'open_ontgraving'
    ).length;
    const nabijWater = /water|watergang|sloot|duiker|keur/i.test(signalen.join(' '));

    const plan = genereerVgPlan({
      projectNaam: ctx.projectNaam,
      projectCode: ctx.projectCode,
      opdrachtgever: ctx.opdrachtgever,
      traceNaam: trace.naam,
      traceCode: trace.code,
      discipline: trace.discipline,
      lengteM: traceLengte(trace),
      signalen,
      aantalBoringen,
      nabijWater,
    });
    return { titel: plan.titel, docCode: plan.docCode, markdown: plan.markdown };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Genereren V&G-plan mislukt.' };
  }
}

export async function genereerKabeltrekplanAction(
  traceId: string
): Promise<WvbDocumentResultaat> {
  try {
    const ctx = getContext(traceId);
    if (!ctx) return { error: `Tracé "${traceId}" niet gevonden.` };
    const { trace } = ctx;

    if (!trace.discipline.startsWith('elektra')) {
      return {
        error:
          'Kabeltrekplan is alleen van toepassing op kabeltracés (elektra LS/MS); dit tracé betreft een leiding.',
      };
    }
    const isMs = trace.discipline === 'elektra_ms';

    // Secties uit de werkelijke tracégeometrie (rechtstanden + bochten met
    // echte hoeken); fallback op segmentlengtes wanneer er geen polyline is.
    let secties: TraceSectie[] = sectiesUitTraceLines(
      trace.traceLines.length ? trace.traceLines : [trace.coordinates],
    );
    if (secties.length === 0) {
      secties = trace.segmenten.map((seg) => ({ type: 'recht' as const, lengteM: seg.lengteM }));
    }
    if (secties.length === 0) {
      secties.push({ type: 'recht', lengteM: traceLengte(trace) });
    }

    // Default-kabelparameters: MS 3×2,8 kg/m, Ø35 mm, max 30 kN; LS 3,5 kg/m, Ø25 mm, max 15 kN.
    const kabel = isMs
      ? { massaKgPerM: 3 * 2.8, diameterMm: 35, maxTrekkrachtKN: 30 }
      : { massaKgPerM: 3.5, diameterMm: 25, maxTrekkrachtKN: 15 };

    const vanLocatie = trace.segmenten[0]?.wegnaam ?? trace.wegnaam ?? 'Begin tracé';
    const totLocatie =
      trace.segmenten[trace.segmenten.length - 1]?.wegnaam ?? 'Einde tracé';

    const plan = genereerKabeltrekplan({
      projectCode: ctx.projectCode,
      projectNaam: ctx.projectNaam,
      traceCode: trace.code,
      traceNaam: trace.naam,
      kabelOmschrijving: `${trace.netType} (${
        isMs ? '3×2,8 kg/m, Ø35 mm, max 30 kN' : '3,5 kg/m, Ø25 mm, max 15 kN'
      } — defaultwaarden)`,
      trekvakken: [
        {
          naam: 'TV-1',
          vanLocatie,
          totLocatie: totLocatie === vanLocatie ? `${totLocatie} (einde tracé)` : totLocatie,
          secties,
        },
      ],
      kabel,
    });
    return { titel: plan.titel, docCode: plan.docCode, markdown: plan.markdown };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Genereren kabeltrekplan mislukt.' };
  }
}
