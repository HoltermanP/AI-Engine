/**
 * Toets alle demo-tracés tegen live BGT-bebouwing (pand + overig bouwwerk).
 * Gebruik: npx tsx scripts/check-demo-traces-panden.ts
 */
import { DEMO_TRACES } from '../demo/traces';
import { fetchBebouwingVoorLijn } from '../lib/services/trace-routing/fetch-routing-layers';
import { segmentIntersectsPolygon } from '../lib/geo';

async function main() {
  let totaalHits = 0;
  for (const trace of DEMO_TRACES) {
    const lijn = trace.coordinates.map(([x, y]) => ({ x, y }));
    const panden = await fetchBebouwingVoorLijn(lijn);

    let hits = 0;
    for (const line of trace.traceLines) {
      for (let i = 1; i < line.length; i++) {
        for (const pand of panden) {
          if (
            segmentIntersectsPolygon(line[i - 1][0], line[i - 1][1], line[i][0], line[i][1], pand)
          ) {
            hits++;
            break;
          }
        }
      }
    }
    totaalHits += hits;
    console.log(
      `${hits > 0 ? '✗' : '✓'} ${trace.code} (${trace.wegnaam}): ${panden.length} bebouwingsvlakken, ${hits} doorsnijding(en)`
    );
  }
  console.log(`\nTotaal: ${totaalHits} doorsnijdingen`);
  process.exit(totaalHits > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
