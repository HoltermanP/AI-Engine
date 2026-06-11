import { writeFileSync } from 'fs';
import { fetchRoutingLayerData } from '../lib/services/trace-routing/fetch-routing-layers';
import { planAutomaticTrace } from '../lib/services/trace-routing/plan';
import { routingSegmentsToTraceSegmenten } from '../lib/services/trace-routing/persist';
import { generateTracePlan } from '../lib/drawings/trace-plan';
import { DEMO_TRACES } from '../demo/traces';

const waypoints = [
  { x: 179000, y: 523900 },
  { x: 180400, y: 525100 },
];

async function main() {
  const layerData = await fetchRoutingLayerData(waypoints);
  const result = planAutomaticTrace({
    waypoints,
    discipline: 'elektra_ls',
    projectId: 'check',
    vereisteDekking: 0.6,
    layerData,
  });

  const segmenten = routingSegmentsToTraceSegmenten(result.segmenten);
  const kruisingen = segmenten.flatMap((s) => s.kruisingen ?? []);
  console.log(`segmenten ${segmenten.length} | kruisingen ${kruisingen.length}`);
  for (const k of kruisingen) {
    console.log(
      `- ${k.naam} → ${k.methodeLabel} | ${k.beheerder} | ${k.vergunning} | afweging: ${k.afweging?.length ?? 0} regels | loc ${k.x},${k.y}`
    );
  }

  const basis = DEMO_TRACES[0];
  const trace = {
    ...basis,
    coordinates: result.coordinates,
    traceLines: result.traceLines,
    segmenten,
  };
  const svg = generateTracePlan(trace, []);
  writeFileSync('/tmp/tekening-kruisingen.svg', svg);
  console.log(
    `SVG: bevat OPMERKINGEN=${svg.includes('OPMERKINGEN KRUISINGEN')} | K1-marker=${svg.includes('Kruising K1')}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
