#!/usr/bin/env tsx
/** Valideer boorengineering voor demo-traces met sleufloze segmenten. */
import { DEMO_TRACES } from '@/demo/traces';
import { runBoreEngineering, sleuflozeSegmenten } from '@/lib/bore';
import { generateBoreDrawings } from '@/lib/drawings/bore-index';

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? `: ${detail}` : ''}`);
  }
}

console.log('Boorengineering validatie\n');

const boreTraces = DEMO_TRACES.filter((t) => sleuflozeSegmenten(t).length > 0);
assert('Demo-traces met boringen', boreTraces.length >= 3, `got ${boreTraces.length}`);

for (const trace of boreTraces) {
  const segs = sleuflozeSegmenten(trace);
  const result = runBoreEngineering(trace);
  assert(
    `${trace.code}: ${result.segmenten.length} segmenten uitgewerkt`,
    result.segmenten.length === segs.length,
  );

  for (const seg of result.segmenten) {
    assert(
      `${trace.code} S${seg.volgorde}: boorplan + berekeningen`,
      seg.boorplan.samenvatting.length > 20 && seg.berekeningen.length >= 4,
    );
    const traj = seg.berekeningen.find((b) => b.type === 'boogtraject');
    assert(`${trace.code} S${seg.volgorde}: boogtraject check`, traj != null);
  }

  const tekeningen = generateBoreDrawings(trace, result);
  // Boorplan + boorprofiel per segment; HDD/persing krijgt ook een booropstellingtekening
  const verwacht = result.segmenten.reduce(
    (n, s) => n + 2 + (s.methode === 'hdd' || s.methode === 'persing' ? 1 : 0),
    0
  );
  assert(
    `${trace.code}: ${tekeningen.length} tekeningen (verwacht ${verwacht})`,
    tekeningen.length === verwacht,
  );
}

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed > 0 ? 1 : 0);
