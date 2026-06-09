#!/usr/bin/env tsx
/**
 * Valideer SVG-tekeningen voor alle demo-traces.
 * Uitvoeren: npm run drawings:validate
 */
import { DEMO_TRACES } from '@/demo/traces';
import { getKlicForTrace } from '@/demo/klic';
import { generateDrawings, valideerTekening } from '@/lib/drawings';

let totaal = 0;
let geldig = 0;
const mislukt: { trace: string; type: string; fouten: string[] }[] = [];

for (const trace of DEMO_TRACES) {
  const net = getKlicForTrace(trace.id);
  const tekeningen = generateDrawings(trace, net);

  for (const t of tekeningen) {
    totaal++;
    const result = valideerTekening(t.svg, t.type);
    if (result.geldig) {
      geldig++;
    } else {
      mislukt.push({ trace: trace.code, type: t.type, fouten: result.fouten });
    }
  }
}

console.log('\n📐 SVG-tekeningen validatie');
console.log(`   Totaal: ${totaal} tekeningen (${DEMO_TRACES.length} tracés)`);
console.log(`   Geldig: ${geldig}`);
console.log(`   Ongeldig: ${mislukt.length}\n`);

if (mislukt.length > 0) {
  for (const r of mislukt) {
    console.log(`❌ ${r.trace} / ${r.type}`);
    for (const f of r.fouten) console.log(`   - ${f}`);
  }
  process.exit(1);
}

console.log('✅ Alle SVG-tekeningen voldoen aan de structuur-eisen.\n');
process.exit(0);
