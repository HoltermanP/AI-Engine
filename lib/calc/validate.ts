/**
 * Valideert kernformules engineering-berekeningen (smoke tests).
 * Run: npm run calc:validate
 */
import { buildCalcInput, runCalculations } from './index';
import {
  hazenWilliamsVerliesM,
  renouardDrukverliesMbar,
  spanningsvalLsV,
  dekkingM,
} from './formulas';
import { DEMO_TRACES } from '@/demo/traces';

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

console.log('Formule-validatie\n');

// Spanningsval LS: 200m, 250A, 240mm² Al → ~8-12V range
const sv = spanningsvalLsV(200, 250, 240, 0.028);
assert('Spanningsval LS realistisch (5-15 V)', sv > 5 && sv < 15, `got ${sv.toFixed(1)} V`);

// Hazen-Williams: 200m, Ø315, 0.05 m³/s → < 1 mwk
const hw = hazenWilliamsVerliesM(200, 0.315, 0.05, 130);
assert('Hazen-Williams eenheden (Q m³/s)', hw > 0 && hw < 2, `got ${hw.toFixed(3)} m`);

// Renouard: 300m DN110, 150 m³/h → < 1 mbar
const rv = renouardDrukverliesMbar(300, 110, 150);
assert('Renouard drukverlies < 1 mbar', rv > 0 && rv < 1, `got ${rv.toFixed(3)} mbar`);

// Dekking
const dek = dekkingM(-0.18, -0.65, 0.05);
assert('Dekking berekening', dek > 0.4 && dek < 0.5, `got ${dek.toFixed(3)} m`);

console.log('\nTracé-berekeningen\n');

for (const trace of DEMO_TRACES.slice(0, 3)) {
  const results = runCalculations(trace);
  const input = buildCalcInput(trace);
  assert(
    `${trace.code}: ${results.length} berekeningen`,
    results.length >= 3,
    `got ${results.length}, lengte ${input.lengteM.toFixed(0)}m, sectie ${input.sectieMm2}`,
  );
  const legdiepte = results.find((r) => r.type === 'legdiepte_dekking');
  assert(
    `${trace.code}: legdiepte heeft voldoet`,
    legdiepte != null && 'voldoet' in legdiepte.resultaat,
  );
}

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed > 0 ? 1 : 0);
