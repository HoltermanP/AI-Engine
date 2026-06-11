/** Test: de pand-guard moet opslaan van een tracé dwars door een pand weigeren. */
import { DEMO_TRACES } from '../demo/traces';
import { fetchBebouwingVoorLijn } from '../lib/services/trace-routing/fetch-routing-layers';
import { saveManualTraceAction } from '../lib/actions/trace-routing';

async function main() {
  const trace = DEMO_TRACES.find((t) => t.code === 'EL-LS-009')!;
  const panden = await fetchBebouwingVoorLijn(trace.coordinates.map(([x, y]) => ({ x, y })));

  // Lijn dwars door het eerste pand
  const pand = panden[0];
  const cx = pand.reduce((s, [x]) => s + x, 0) / pand.length;
  const cy = pand.reduce((s, [, y]) => s + y, 0) / pand.length;
  const lijn: [number, number, number][] = [
    [cx - 40, cy, -0.65],
    [cx + 40, cy, -0.65],
  ];
  const geweigerd = await saveManualTraceAction('trace-ls-009', lijn, [lijn]);
  console.log('Dwars door pand →', JSON.stringify(geweigerd));

  // Geldige lijn (het bestaande tracé zelf) moet wél opslaan
  const geldig = await saveManualTraceAction(
    'trace-ls-009',
    trace.coordinates,
    trace.traceLines,
    trace.wegnaam
  );
  console.log('Geldig tracé →', geldig.ok ? 'opgeslagen ✓' : `geweigerd: ${geldig.error}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
