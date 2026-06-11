import { fetchRoutingLayerData } from '../lib/services/trace-routing/fetch-routing-layers';
import { buildRoutingContext } from '../lib/services/trace-routing/context';
import { planAutomaticTrace } from '../lib/services/trace-routing/plan';
import { buildRoadGraph } from '../lib/services/trace-routing/road-graph';
import { segmentIntersectsPolygon } from '../lib/geo';

// Default: corridor N714/Espelerweg west → Waterwijk → over A6 → Kuinderweg (N351).
// Of geef eigen waypoints mee: npx tsx scripts/diagnose-route.ts "178950,524500;180200,525250"
const DEFAULT_WAYPOINTS = [
  { x: 177000, y: 523950, label: 'start N714 west' },
  { x: 178200, y: 524000, label: 'Espelerweg' },
  { x: 182300, y: 524750, label: 'Waterwijk' },
  { x: 183100, y: 524700, label: 'oost van A6' },
  { x: 185300, y: 526900, label: 'eind Kuinderweg N351' },
];

const waypoints = process.argv[2]
  ? process.argv[2].split(';').map((paar, i) => {
      const [x, y] = paar.split(',').map(Number);
      return { x, y, label: `wp${i + 1}` };
    })
  : DEFAULT_WAYPOINTS;

async function main() {
  const t0 = performance.now();
  const layerData = await fetchRoutingLayerData(waypoints);
  const fetchMs = Math.round(performance.now() - t0);

  const input = {
    waypoints,
    discipline: 'elektra_ls' as const,
    projectId: 'diagnose',
    vereisteDekking: 0.6,
    layerData,
  };
  const ctx = buildRoutingContext(input);

  const tGraph = performance.now();
  const graaf = buildRoadGraph(ctx);
  console.log(
    `graafopbouw ${Math.round(performance.now() - tGraph)} ms | nodes ${graaf.nodes.length} | edges ${graaf.edges.length}`
  );

  const t1 = performance.now();
  const result = planAutomaticTrace(input);
  const planMs = Math.round(performance.now() - t1);

  const route = result.coordinates.map(([x, y]) => [x, y] as [number, number]);

  let pandHits = 0;
  for (let i = 1; i < route.length; i++) {
    for (const pand of ctx.pandPolygonen) {
      if (segmentIntersectsPolygon(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1], pand)) {
        pandHits++;
        break;
      }
    }
  }

  // Grilligheid: scherpe richtingswisselingen (> 60° binnen 60 m)
  let spikes = 0;
  for (let i = 2; i < route.length; i++) {
    const [ax, ay] = route[i - 2];
    const [bx, by] = route[i - 1];
    const [cx, cy] = route[i];
    const v1 = Math.atan2(by - ay, bx - ax);
    const v2 = Math.atan2(cy - by, cx - bx);
    let hoek = Math.abs(v2 - v1) * (180 / Math.PI);
    if (hoek > 180) hoek = 360 - hoek;
    const len = Math.hypot(cx - ax, cy - ay);
    if (hoek > 60 && len < 60) spikes++;
  }

  console.log(`fetch ${fetchMs} ms | plan ${planMs} ms`);

  // ── Audit: data-dekking en eis-status per laag ───────────────────────────
  const pandCount = layerData.bgt?.filter((f) => f.type === 'pand').length ?? 0;
  const wegCount = layerData.bgt?.filter((f) => f.type === 'weg').length ?? 0;
  const publiekCount = ctx.percelen.filter((p) => p.publiek).length;
  const breedteBekend = ctx.watergangen.filter((w) => w.breedteM !== undefined).length;
  const audit: [string, number, string][] = [
    ['NWB-wegvakken', layerData.nwb?.length ?? 0, 'corridor-voorkeur + kruisingstechniek (P/R/G/W)'],
    ['BGT wegdelen', wegCount, 'routegraaf + verhardingstype kruisingen'],
    ['BGT panden', pandCount, `harde blokkade + ${1.0} m gevelmarge`],
    ['BGT waterdelen', ctx.watergangen.length, `kruisingen; breedte bekend bij ${breedteBekend}`],
    ['BRK percelen', ctx.percelen.length, `publiek/privaat (${publiekCount} publiek via wegproxy)`],
    ['Bomen', ctx.bomen.length, 'kritiek <2 m ×6 · wortelzone <4,5 m ×1,5'],
    ['Bestaand net (K&L)', ctx.bestaandNet?.length ?? 0, 'parallelafstand-eis + volg-korting'],
    ['Belemmeringen weg/spoor', ctx.belemmeringen.length, 'spoor = ProRail-boring'],
    ['Referentietracés', ctx.referentieTraces.length, 'geleerde voorkeurscorridor ×0,6'],
    [
      'Risicozones',
      ctx.risicoZones.length,
      'bodem/Natura 2000/archeologie/NGE — vermijden of gemotiveerd afwijken',
    ],
  ];
  console.log('── audit datalagen & eisen ──');
  for (const [laag, aantal, eis] of audit) {
    const status = aantal > 0 ? 'OK ' : 'LEEG';
    console.log(`  [${status}] ${laag.padEnd(24)} ${String(aantal).padStart(5)}  ${eis}`);
  }
  if ((layerData.nwb?.length ?? 0) >= 6000) console.log('  ⚠ NWB-cap geraakt — verhoog NWB_ROUTING_MAX');
  console.log(`  normen: ${ctx.normReferenties.join(' · ')}`);
  console.log(
    `route: ${result.totaleLengteM} m | punten ${route.length} | pandHits ${pandHits} | spikes ${spikes} | ` +
      `alternatieven ${result.alternatieven?.length ?? 0}`
  );
  console.log(`waarschuwingen: ${result.waarschuwingen.join('; ') || '-'}`);

  // SVG-dump voor visuele controle — ingezoomd op de route zelf
  const marge = 150;
  const minX = Math.min(...route.map(([x]) => x)) - marge;
  const maxX = Math.max(...route.map(([x]) => x)) + marge;
  const minY = Math.min(...route.map(([, y]) => y)) - marge;
  const maxY = Math.max(...route.map(([, y]) => y)) + marge;
  const schaal = 2400 / (maxX - minX);
  const H = (maxY - minY) * schaal;
  const px = (x: number) => ((x - minX) * schaal).toFixed(1);
  const py = (y: number) => (H - (y - minY) * schaal).toFixed(1);
  const poly = (p: [number, number][]) => p.map(([x, y]) => `${px(x)},${py(y)}`).join(' ');

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 ${H.toFixed(0)}" style="background:#fff">`,
    ...ctx.pandPolygonen.map((p) => `<polygon points="${poly(p)}" fill="#cbd5e1"/>`),
    ...ctx.roadCenterlines.map(
      (r) => `<polyline points="${poly(r.centerline)}" fill="none" stroke="#fde68a" stroke-width="2"/>`
    ),
    ...ctx.watergangen.map(
      (w) => `<polyline points="${poly(w.coordinates)}" fill="none" stroke="#7dd3fc" stroke-width="2"/>`
    ),
    `<polyline points="${poly(route)}" fill="none" stroke="#b91c1c" stroke-width="4"/>`,
    ...waypoints.map(
      (w, i) =>
        `<circle cx="${px(w.x)}" cy="${py(w.y)}" r="10" fill="${
          i === 0 ? '#16a34a' : i === waypoints.length - 1 ? '#ea580c' : '#2563eb'
        }"/>`
    ),
    `</svg>`,
  ].join('\n');
  const { writeFileSync } = await import('fs');
  writeFileSync('/tmp/route-diagnose.svg', svg);
  console.log('SVG: /tmp/route-diagnose.svg');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
