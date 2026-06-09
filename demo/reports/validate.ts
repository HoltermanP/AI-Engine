#!/usr/bin/env tsx
/**
 * Valideer alle voorbeeldrapporten.
 * Uitvoeren: npx tsx demo/reports/validate.ts
 */
import { valideerAlleVoorbeeldRapporten } from './voorbeelden';

const { geldig, resultaten } = valideerAlleVoorbeeldRapporten();

const mislukt = resultaten.filter((r) => !r.geldig);

console.log(`\n📋 Voorbeeldrapporten validatie`);
console.log(`   Totaal: ${resultaten.length} rapporten`);
console.log(`   Geldig: ${resultaten.length - mislukt.length}`);
console.log(`   Ongeldig: ${mislukt.length}\n`);

if (mislukt.length > 0) {
  for (const r of mislukt) {
    console.log(`❌ ${r.trace} / ${r.type}`);
    for (const f of r.fouten) console.log(`   - ${f}`);
  }
  process.exit(1);
}

console.log('✅ Alle voorbeeldrapporten voldoen aan de structuur-eisen.\n');
process.exit(0);
