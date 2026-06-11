/**
 * Render een demo-tracé tegen de échte BGT-bebouwingscontouren.
 * Gebruik: npx tsx scripts/render-trace-bgt.ts EL-LS-009
 */
import { writeFileSync } from 'fs';
import { DEMO_TRACES } from '../demo/traces';
import { fetchBebouwingVoorLijn } from '../lib/services/trace-routing/fetch-routing-layers';

async function main() {
  const code = process.argv[2] ?? 'EL-LS-009';
  const trace = DEMO_TRACES.find((t) => t.code === code);
  if (!trace) throw new Error(`Tracé ${code} niet gevonden`);

  const lijn = trace.coordinates.map(([x, y]) => ({ x, y }));
  const panden = await fetchBebouwingVoorLijn(lijn);

  const marge = 120;
  const xs = trace.coordinates.map(([x]) => x);
  const ys = trace.coordinates.map(([, y]) => y);
  const minX = Math.min(...xs) - marge;
  const maxX = Math.max(...xs) + marge;
  const minY = Math.min(...ys) - marge;
  const maxY = Math.max(...ys) + marge;
  const schaal = 1800 / (maxX - minX);
  const H = (maxY - minY) * schaal;
  const px = (x: number) => ((x - minX) * schaal).toFixed(1);
  const py = (y: number) => (H - (y - minY) * schaal).toFixed(1);
  const inBeeld = panden.filter((p) =>
    p.some(([x, y]) => x > minX && x < maxX && y > minY && y < maxY)
  );

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 ${H.toFixed(0)}" style="background:#fff">`,
    ...inBeeld.map(
      (p) =>
        `<polygon points="${p.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}" fill="#94a3b8" stroke="#475569" stroke-width="0.5"/>`
    ),
    `<polyline points="${trace.coordinates.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}" fill="none" stroke="#b91c1c" stroke-width="5"/>`,
    `</svg>`,
  ].join('\n');

  writeFileSync('/tmp/trace-bgt-check.svg', svg);
  console.log(`${code}: ${inBeeld.length} BGT-bebouwingsvlakken in beeld | hoogte ${H.toFixed(0)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
