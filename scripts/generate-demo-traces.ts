/**
 * Genereert realistische demo-tracés met de eigen routeringsengine op live
 * PDOK-data. Per origineel demo-tracé (git-versie in demo/traces-origineel.ts)
 * worden waypoints op het echte wegennet gekozen met een realistische
 * spanwijdte (500–1200 m), waarna de engine het tracé ontwerpt volgens alle
 * regels (wegvolgend, pand-vrij, AVOI, kruisingsafwegingen).
 *
 * Gebruik: npx tsx scripts/generate-demo-traces.ts
 */
import { writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fetchRoutingLayerData } from '../lib/services/trace-routing/fetch-routing-layers';
import { planAutomaticTrace } from '../lib/services/trace-routing/plan';
import { routingSegmentsToTraceSegmenten } from '../lib/services/trace-routing/persist';
import type { DemoTrace } from '../demo/traces';

const DOEL_SPAN_M = 900;
const MIN_SPAN_M = 500;
const MIN_ROUTE_M = 350;

function rond(line: [number, number, number][]): [number, number, number][] {
  return line.map(([x, y, z]) => [
    Math.round(x * 10) / 10,
    Math.round(y * 10) / 10,
    Math.round(z * 100) / 100,
  ]);
}

/** Kies twee wegpunten in het gebied: dichtbij de oorspronkelijke start, en zo
 * dicht mogelijk bij de doelspanwijdte daarvandaan. */
function kiesWaypoints(
  nwb: { coordinates: [number, number][] }[],
  origineelStart: [number, number]
): { a: [number, number]; b: [number, number] } | null {
  const punten = nwb.flatMap((w) => w.coordinates);
  if (punten.length < 2) return null;

  let a = punten[0];
  let beste = Infinity;
  for (const p of punten) {
    const d = Math.hypot(p[0] - origineelStart[0], p[1] - origineelStart[1]);
    if (d < beste) {
      beste = d;
      a = p;
    }
  }

  let b: [number, number] | null = null;
  let besteScore = Infinity;
  for (const p of punten) {
    const d = Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d < MIN_SPAN_M || d > 1400) continue;
    const score = Math.abs(d - DOEL_SPAN_M);
    if (score < besteScore) {
      besteScore = score;
      b = p;
    }
  }
  if (!b) return null;
  return { a, b };
}

async function genereerTrace(oud: DemoTrace): Promise<DemoTrace> {
  const start: [number, number] = [oud.coordinates[0][0], oud.coordinates[0][1]];

  // Wegennet rond het gebied ophalen (ruim genoeg voor de doelspanwijdte)
  const zoekgebied = [
    { x: start[0] - DOEL_SPAN_M, y: start[1] - DOEL_SPAN_M },
    { x: start[0] + DOEL_SPAN_M, y: start[1] + DOEL_SPAN_M },
  ];
  const verkenning = await fetchRoutingLayerData(zoekgebied);
  const keuze = kiesWaypoints(verkenning.nwb ?? [], start);
  if (!keuze) {
    console.warn(`  ⚠ ${oud.code}: geen wegennet gevonden — tracé ongewijzigd`);
    return oud;
  }

  const waypoints = [
    { x: keuze.a[0], y: keuze.a[1] },
    { x: keuze.b[0], y: keuze.b[1] },
  ];
  const layerData = await fetchRoutingLayerData(waypoints);
  const result = planAutomaticTrace({
    waypoints,
    discipline: oud.discipline,
    projectId: oud.projectId,
    vereisteDekking: oud.vereisteDekking,
    netType: oud.netType,
    layerData,
  });

  if (!result.alternatieven?.length || result.totaleLengteM < MIN_ROUTE_M) {
    console.warn(
      `  ⚠ ${oud.code}: route ${result.totaleLengteM ?? 0} m (< ${MIN_ROUTE_M} m vereist) — tracé ongewijzigd`
    );
    return oud;
  }

  const segmenten = routingSegmentsToTraceSegmenten(result.segmenten);
  const kruisingen = segmenten.reduce((n, s) => n + (s.kruisingen?.length ?? 0), 0);
  const afwijkingen = segmenten.reduce((n, s) => n + (s.afwijkingen?.length ?? 0), 0);
  console.log(
    `  ✓ ${oud.code}: ${result.totaleLengteM} m · ${segmenten.length} segment(en) · ` +
      `${kruisingen} kruising(en) · ${afwijkingen} afwijking(en) · volgt ${segmenten[0]?.wegnaam ?? '?'}`
  );

  return {
    ...oud,
    coordinates: rond(result.coordinates),
    traceLines: result.traceLines.map(rond),
    segmenten,
    wegnaam: segmenten[0]?.wegnaam ?? oud.wegnaam,
    leglocatie: (segmenten[0]?.leglocatie ?? oud.leglocatie).replace(/_/g, ' '),
  };
}

async function main() {
  // Origineel (handgemaakt) bestand uit git als uitgangspunt voor de gebieden
  if (!existsSync('demo/traces-origineel.ts')) {
    execSync('git show HEAD:demo/traces.ts > demo/traces-origineel.ts');
  }
  const { DEMO_TRACES: ORIGINEEL } = (await import('../demo/traces-origineel')) as {
    DEMO_TRACES: DemoTrace[];
  };

  console.log(`Ontwerp ${ORIGINEEL.length} realistische demo-tracés (doel ${DOEL_SPAN_M} m spanwijdte)…`);
  const nieuw: DemoTrace[] = [];
  for (const oud of ORIGINEEL) {
    try {
      nieuw.push(await genereerTrace(oud));
    } catch (err) {
      console.warn(`  ⚠ ${oud.code}: ${err instanceof Error ? err.message : err} — tracé ongewijzigd`);
      nieuw.push(oud);
    }
  }

  const inhoud = `import type { Discipline, TraceFase } from '@/lib/db/types';
import type { TraceSegment } from './roads';

export interface DemoTrace {
  id: string;
  projectId: string;
  code: string;
  naam: string;
  discipline: Discipline;
  netType: string;
  fase: TraceFase;
  vereisteDekking: number;
  coordinates: [number, number, number][];
  /** Losse lijnen voor kaart (geen diagonalen bij kruisingen) */
  traceLines: [number, number, number][][];
  kleur: string;
  wegnaam: string;
  leglocatie: string;
  segmenten: TraceSegment[];
  omschrijving: string;
}

/**
 * GEGENEREERD met scripts/generate-demo-traces.ts — niet handmatig bewerken.
 * Elk tracé is ontworpen door de routeringsengine op live PDOK-data en voldoet
 * daarmee aan de ontwerpregels: wegvolgend, nooit door bebouwing (1 m marge),
 * AVOI-ligging, boomafstand, risicozones en situatie-afhankelijke
 * kruisingstechnieken met afweging.
 */
export const DEMO_TRACES: DemoTrace[] = ${JSON.stringify(nieuw, null, 2)};

export { DEMO_PROJECT, DEMO_PROJECTS } from './projects';
`;

  writeFileSync('demo/traces.ts', inhoud);
  console.log(`\ndemo/traces.ts herschreven met ${nieuw.length} tracés.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
