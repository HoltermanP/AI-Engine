/** Bewijs: hoe ver verspringt een klikpunt door de huidige waypoint-snapping? */
import { DEMO_TRACES } from '../demo/traces';
import { fetchRoutingLayerData } from '../lib/services/trace-routing/fetch-routing-layers';
import { buildRoutingContext } from '../lib/services/trace-routing/context';
import { buildRoadGraph, resolveWaypointNode } from '../lib/services/trace-routing/road-graph';

async function main() {
  // Oude eindpunten van EL-LS-007 (het tracé dat na regeneratie 30 m werd)
  const trace = DEMO_TRACES.find((t) => t.code === 'EL-LS-007')!;
  const start = trace.coordinates[0];
  const eind = trace.coordinates[trace.coordinates.length - 1];
  const waypoints = [
    { x: start[0], y: start[1] },
    { x: eind[0], y: eind[1] },
  ];
  console.log(`klik-afstand start↔eind: ${Math.hypot(eind[0] - start[0], eind[1] - start[1]).toFixed(0)} m`);

  const layerData = await fetchRoutingLayerData(waypoints);
  const ctx = buildRoutingContext({
    waypoints,
    discipline: trace.discipline,
    projectId: trace.projectId,
    vereisteDekking: trace.vereisteDekking,
    layerData,
  });
  const graph = buildRoadGraph(ctx);

  for (const [label, wp] of [['start', waypoints[0]], ['eind', waypoints[1]]] as const) {
    const nodeId = resolveWaypointNode(graph, wp.x, wp.y, 900);
    if (nodeId === null) {
      console.log(`${label}: GEEN snap binnen 900 m`);
      continue;
    }
    const node = graph.nodes[nodeId];
    const d = Math.hypot(node.x - wp.x, node.y - wp.y);
    console.log(`${label}: snapt ${d.toFixed(0)} m weg (node ${nodeId})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
