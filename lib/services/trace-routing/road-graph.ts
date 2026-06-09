import { pointInPolygon } from '@/lib/geo';
import type { RoutingContext } from './types';

const NODE_MERGE_M = 22;
const ENDPOINT_BRIDGE_M = 100;
const NEAR_SEGMENT_BRIDGE_M = 100;

export interface GraphNode {
  id: number;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: number;
  to: number;
  lengthM: number;
  roadId: string;
  roadNaam: string;
  roadType: string;
}

export interface RoadGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Map<number, { to: number; edgeIdx: number }[]>;
}

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function findOrCreateNode(
  nodes: GraphNode[],
  index: Map<string, number>,
  x: number,
  y: number
): number {
  for (const node of nodes) {
    if (dist([node.x, node.y], [x, y]) <= NODE_MERGE_M) {
      return node.id;
    }
  }
  const id = nodes.length;
  nodes.push({ id, x, y });
  index.set(`${Math.round(x)}-${Math.round(y)}`, id);
  return id;
}

/** Verbind eindpunten van verschillende wegsegmenten (BGT-weggedeeltes). */
function bridgeRoadEndpoints(
  nodes: GraphNode[],
  edges: GraphEdge[],
  roads: RoutingContext['roadCenterlines'],
  index: Map<string, number>,
  pandPolygonen: [number, number][][]
): void {
  const endpoints: { x: number; y: number; roadId: string }[] = [];
  for (const road of roads) {
    const line = road.centerline;
    if (line.length < 2) continue;
    endpoints.push({ x: line[0][0], y: line[0][1], roadId: road.id });
    const last = line[line.length - 1];
    endpoints.push({ x: last[0], y: last[1], roadId: road.id });
  }

  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      if (endpoints[i].roadId === endpoints[j].roadId) continue;
      const ax = endpoints[i].x;
      const ay = endpoints[i].y;
      const bx = endpoints[j].x;
      const by = endpoints[j].y;
      const d = dist([ax, ay], [bx, by]);
      if (d <= 0.5 || d > ENDPOINT_BRIDGE_M) continue;

      let blocked = false;
      for (const pand of pandPolygonen) {
        if (segmentIntersectsPolygon(ax, ay, bx, by, pand)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const from = findOrCreateNode(nodes, index, ax, ay);
      const to = findOrCreateNode(nodes, index, bx, by);
      if (from === to) continue;
      edges.push({
        from,
        to,
        lengthM: d,
        roadId: 'kruising',
        roadNaam: 'Kruising',
        roadType: 'kruising',
      });
      edges.push({
        from: to,
        to: from,
        lengthM: d,
        roadId: 'kruising',
        roadNaam: 'Kruising',
        roadType: 'kruising',
      });
    }
  }
}

function addPairEdges(
  edges: GraphEdge[],
  from: number,
  to: number,
  lengthM: number
): void {
  if (lengthM < 0.5 || from === to) return;
  edges.push({
    from,
    to,
    lengthM,
    roadId: 'kruising',
    roadNaam: 'Kruising',
    roadType: 'kruising',
  });
  edges.push({
    from: to,
    to: from,
    lengthM,
    roadId: 'kruising',
    roadNaam: 'Kruising',
    roadType: 'kruising',
  });
}

/** Koppel weg-eindpunten aan het dichtstbijzijnde punt op een ander wegsegment (T-kruisingen). */
function bridgeEndpointsToNearSegments(
  nodes: GraphNode[],
  edges: GraphEdge[],
  roads: RoutingContext['roadCenterlines'],
  index: Map<string, number>,
  pandPolygonen: [number, number][][]
): void {
  for (const road of roads) {
    const line = road.centerline;
    if (line.length < 2) continue;
    const endpoints: [number, number][] = [
      [line[0][0], line[0][1]],
      [line[line.length - 1][0], line[line.length - 1][1]],
    ];

    for (const [ex, ey] of endpoints) {
      let best: { px: number; py: number; d: number } | null = null;
      for (const other of roads) {
        if (other.id === road.id) continue;
        const ol = other.centerline;
        for (let i = 1; i < ol.length; i++) {
          const proj = projectOnSegment(
            ex,
            ey,
            ol[i - 1][0],
            ol[i - 1][1],
            ol[i][0],
            ol[i][1]
          );
          if (proj.d > NEAR_SEGMENT_BRIDGE_M) continue;
          if (!best || proj.d < best.d) {
            best = { px: proj.x, py: proj.y, d: proj.d };
          }
        }
      }
      if (!best || best.d < 0.5) continue;

      let blocked = false;
      for (const pand of pandPolygonen) {
        if (segmentIntersectsPolygon(ex, ey, best.px, best.py, pand)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const epNode = findOrCreateNode(nodes, index, ex, ey);
      const onNode = findOrCreateNode(nodes, index, best.px, best.py);
      addPairEdges(edges, epNode, onNode, best.d);
    }
  }
}

export function buildRoadGraph(ctx: RoutingContext): RoadGraph {
  const nodes: GraphNode[] = [];
  const index = new Map<string, number>();
  const edges: GraphEdge[] = [];

  for (const road of ctx.roadCenterlines) {
    const line = road.centerline;
    if (line.length < 2) continue;

    let prevNode = findOrCreateNode(nodes, index, line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) {
      const node = findOrCreateNode(nodes, index, line[i][0], line[i][1]);
      const lengthM = dist([nodes[prevNode].x, nodes[prevNode].y], [nodes[node].x, nodes[node].y]);
      if (lengthM < 0.5) {
        prevNode = node;
        continue;
      }
      edges.push({
        from: prevNode,
        to: node,
        lengthM,
        roadId: road.id,
        roadNaam: road.naam,
        roadType: road.type,
      });
      edges.push({
        from: node,
        to: prevNode,
        lengthM,
        roadId: road.id,
        roadNaam: road.naam,
        roadType: road.type,
      });
      prevNode = node;
    }
  }

  // Kruisingen via eindpunten (geen globale node-snap — voorkomt diagonale lijnen door blokken)
  bridgeRoadEndpoints(nodes, edges, ctx.roadCenterlines, index, ctx.pandPolygonen);
  bridgeEndpointsToNearSegments(nodes, edges, ctx.roadCenterlines, index, ctx.pandPolygonen);

  const adjacency = new Map<number, { to: number; edgeIdx: number }[]>();
  edges.forEach((edge, edgeIdx) => {
    const list = adjacency.get(edge.from) ?? [];
    list.push({ to: edge.to, edgeIdx });
    adjacency.set(edge.from, list);
  });

  return { nodes, edges, adjacency };
}

export function nearestNode(graph: RoadGraph, x: number, y: number, maxDist = 300): number | null {
  const compSize = computeComponentSizes(graph);
  let best: { id: number; dist: number; size: number } | null = null;
  for (const node of graph.nodes) {
    const d = dist([node.x, node.y], [x, y]);
    if (d > maxDist) continue;
    const size = compSize.get(node.id) ?? 1;
    if (!best || size > best.size || (size === best.size && d < best.dist)) {
      best = { id: node.id, dist: d, size };
    }
  }
  return best?.id ?? null;
}

function computeComponentSizes(graph: RoadGraph): Map<number, number> {
  const nodeComp = new Map<number, number>();
  const sizes = new Map<number, number>();
  let cid = 0;

  for (const node of graph.nodes) {
    if (nodeComp.has(node.id)) continue;
    const queue = [node.id];
    nodeComp.set(node.id, cid);
    let count = 0;
    while (queue.length) {
      const u = queue.pop()!;
      count++;
      for (const { to } of graph.adjacency.get(u) ?? []) {
        if (!nodeComp.has(to)) {
          nodeComp.set(to, cid);
          queue.push(to);
        }
      }
    }
    sizes.set(cid, count);
    cid++;
  }

  const nodeSize = new Map<number, number>();
  for (const [nodeId, compId] of nodeComp) {
    nodeSize.set(nodeId, sizes.get(compId) ?? 1);
  }
  return nodeSize;
}

function projectOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { x: number; y: number; d: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const d = Math.hypot(px - ax, py - ay);
    return { x: ax, y: ay, d };
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return { x, y, d: Math.hypot(px - x, py - y) };
}

function addBidirectionalEdge(
  graph: RoadGraph,
  from: number,
  to: number,
  lengthM: number,
  meta: Pick<GraphEdge, 'roadId' | 'roadNaam' | 'roadType'>
): void {
  if (lengthM < 0.5) return;
  const edgeIdxA = graph.edges.length;
  graph.edges.push({ from, to, lengthM, ...meta });
  const edgeIdxB = graph.edges.length;
  graph.edges.push({ from: to, to: from, lengthM, ...meta });
  const listA = graph.adjacency.get(from) ?? [];
  listA.push({ to, edgeIdx: edgeIdxA });
  graph.adjacency.set(from, listA);
  const listB = graph.adjacency.get(to) ?? [];
  listB.push({ to: from, edgeIdx: edgeIdxB });
  graph.adjacency.set(to, listB);
}

/** Koppel waypoint aan dichtstbijzijnde weg (voorkeur grootste verbonden netwerk). */
export function resolveWaypointNode(
  graph: RoadGraph,
  x: number,
  y: number,
  maxDist = 900
): number | null {
  const compSize = computeComponentSizes(graph);

  let bestNode: { id: number; d: number; size: number } | null = null;
  for (const node of graph.nodes) {
    const d = dist([node.x, node.y], [x, y]);
    if (d > maxDist) continue;
    const size = compSize.get(node.id) ?? 1;
    if (!bestNode || size > bestNode.size || (size === bestNode.size && d < bestNode.d)) {
      bestNode = { id: node.id, d, size };
    }
  }
  if (bestNode) return bestNode.id;

  let best: {
    edgeIdx: number;
    px: number;
    py: number;
    d: number;
    size: number;
  } | null = null;

  for (let edgeIdx = 0; edgeIdx < graph.edges.length; edgeIdx++) {
    const edge = graph.edges[edgeIdx];
    if (edge.roadId === 'kruising') continue;
    if (edge.from >= edge.to) continue;
    const a = graph.nodes[edge.from];
    const b = graph.nodes[edge.to];
    const proj = projectOnSegment(x, y, a.x, a.y, b.x, b.y);
    if (proj.d > maxDist) continue;
    const size = Math.max(compSize.get(edge.from) ?? 1, compSize.get(edge.to) ?? 1);
    if (!best || size > best.size || (size === best.size && proj.d < best.d)) {
      best = { edgeIdx, px: proj.x, py: proj.y, d: proj.d, size };
    }
  }

  if (!best) return null;

  const edge = graph.edges[best.edgeIdx];
  const fromNode = graph.nodes[edge.from];
  const toNode = graph.nodes[edge.to];
  const newId = graph.nodes.length;
  graph.nodes.push({ id: newId, x: best.px, y: best.py });

  const meta = {
    roadId: edge.roadId,
    roadNaam: edge.roadNaam,
    roadType: edge.roadType,
  };
  addBidirectionalEdge(
    graph,
    newId,
    edge.from,
    dist([best.px, best.py], [fromNode.x, fromNode.y]),
    meta
  );
  addBidirectionalEdge(
    graph,
    newId,
    edge.to,
    dist([best.px, best.py], [toNode.x, toNode.y]),
    meta
  );

  return newId;
}

function segmentIntersectsPolygon(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  polygon: [number, number][]
): boolean {
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  if (pointInPolygon(midX, midY, polygon)) return true;
  if (pointInPolygon(ax, ay, polygon) || pointInPolygon(bx, by, polygon)) return true;
  return false;
}

function distPointToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function minDistToLine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  line: [number, number][]
): number {
  let min = Infinity;
  for (let i = 1; i < line.length; i++) {
    min = Math.min(
      min,
      distPointToSegment(ax, ay, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1])
    );
  }
  return min;
}

export function edgeKey(from: number, to: number): string {
  return from < to ? `${from}-${to}` : `${to}-${from}`;
}

export type RouteCostProfile = 'default' | 'avoid_private' | 'prefer_main_roads';

export interface AStarOptions {
  edgePenalty?: Map<string, number>;
  profile?: RouteCostProfile;
  /** Laatste redmiddel: negeer pand-blokkades bij geen route gevonden */
  ignorePandBlock?: boolean;
}

export function edgeCost(
  edge: GraphEdge,
  fromNode: GraphNode,
  toNode: GraphNode,
  ctx: RoutingContext,
  options?: AStarOptions
): number {
  let cost = edge.lengthM;

  if (!options?.ignorePandBlock) {
    for (const pand of ctx.pandPolygonen) {
      if (segmentIntersectsPolygon(fromNode.x, fromNode.y, toNode.x, toNode.y, pand)) {
        return Infinity;
      }
    }
  }

  for (const begroeid of ctx.begroeidPolygonen) {
    if (segmentIntersectsPolygon(fromNode.x, fromNode.y, toNode.x, toNode.y, begroeid)) {
      cost *= 2.5;
    }
  }

  let onPrivate = false;
  for (const perceel of ctx.percelen) {
    if (
      segmentIntersectsPolygon(fromNode.x, fromNode.y, toNode.x, toNode.y, perceel.polygon) &&
      !perceel.publiek
    ) {
      const mult = options?.profile === 'avoid_private' ? 8 : 3;
      cost *= mult;
      onPrivate = true;
    } else if (
      segmentIntersectsPolygon(fromNode.x, fromNode.y, toNode.x, toNode.y, perceel.polygon) &&
      perceel.publiek
    ) {
      cost *= 0.85;
    }
  }

  if (!onPrivate) {
    for (const bel of ctx.belemmeringen) {
      if (bel.categorie === 'weg' || bel.categorie === 'spoor') {
        const d = minDistToLine(fromNode.x, fromNode.y, toNode.x, toNode.y, bel.coordinates);
        if (d < 25) cost *= 0.7;
      }
    }

    for (const net of ctx.bestaandNet ?? []) {
      const line2d = net.coordinates.map(([x, y]) => [x, y] as [number, number]);
      const d = minDistToLine(fromNode.x, fromNode.y, toNode.x, toNode.y, line2d);
      if (d < 15) cost *= 0.75;
    }
  }

  if (edge.roadType !== 'kruising') {
    cost *= options?.profile === 'prefer_main_roads'
      ? edge.roadType === 'provincialeweg'
        ? 0.65
        : edge.roadType === 'gemeenteweg'
          ? 0.8
          : 0.9
      : 0.9;
  }

  const penalty = options?.edgePenalty?.get(edgeKey(edge.from, edge.to));
  if (penalty) cost *= penalty;

  return cost;
}

export function extractEdgeKeysFromPath(graph: RoadGraph, nodePath: number[]): string[] {
  const keys: string[] = [];
  for (let i = 1; i < nodePath.length; i++) {
    keys.push(edgeKey(nodePath[i - 1], nodePath[i]));
  }
  return keys;
}

export function addPathPenalties(
  penaltyMap: Map<string, number>,
  edgeKeys: string[],
  multiplier: number
): void {
  for (const key of edgeKeys) {
    penaltyMap.set(key, Math.max(penaltyMap.get(key) ?? 1, multiplier));
  }
}

export function heuristic(a: GraphNode, b: GraphNode): number {
  return dist([a.x, a.y], [b.x, b.y]) * 0.85;
}

export function aStar(
  graph: RoadGraph,
  startId: number,
  goalId: number,
  ctx: RoutingContext,
  options?: AStarOptions
): number[] | null {
  const open = new Set<number>([startId]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  for (const node of graph.nodes) {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
  }
  gScore.set(startId, 0);
  fScore.set(startId, heuristic(graph.nodes[startId], graph.nodes[goalId]));

  while (open.size > 0) {
    let current = -1;
    let bestF = Infinity;
    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        current = id;
      }
    }
    if (current === goalId) {
      const path: number[] = [current];
      while (cameFrom.has(path[path.length - 1])) {
        path.push(cameFrom.get(path[path.length - 1])!);
      }
      return path.reverse();
    }

    open.delete(current);
    const neighbors = graph.adjacency.get(current) ?? [];

    for (const { to, edgeIdx } of neighbors) {
      const edge = graph.edges[edgeIdx];
      const tentative =
        (gScore.get(current) ?? Infinity) +
        edgeCost(edge, graph.nodes[current], graph.nodes[to], ctx, options);

      if (tentative === Infinity) continue;

      if (tentative < (gScore.get(to) ?? Infinity)) {
        cameFrom.set(to, current);
        gScore.set(to, tentative);
        fScore.set(to, tentative + heuristic(graph.nodes[to], graph.nodes[goalId]));
        open.add(to);
      }
    }
  }

  return null;
}
