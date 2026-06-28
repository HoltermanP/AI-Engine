import { segmentIntersectsPolygon } from '@/lib/geo';
import type { RoutingContext } from './types';

const NODE_MERGE_M = 10;
const ENDPOINT_BRIDGE_M = 100;
const NEAR_SEGMENT_BRIDGE_M = 100;

/** Veiligheidsmarge tot gevels: kabels niet strak langs/onder panden leggen */
export const PAND_MARGE_M = 1.0;

/** Kritieke boomafstand: binnen deze straal van een stam niet leggen (bomenverordening/netbeheerder) */
export const BOOM_KRITIEK_M = 2.0;
/** Wortelzone: hier alleen met boombescherming/handmatig graven — vermijden waar mogelijk */
export const BOOM_WORTELZONE_M = 4.5;

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

/** Polygon met bounding box zodat verre polygonen goedkoop overgeslagen worden. */
interface IndexedPolygon {
  polygon: [number, number][];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function indexPolygons(polygonen: [number, number][][]): IndexedPolygon[] {
  return polygonen
    .filter((p) => p.length >= 3)
    .map((polygon) => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of polygon) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      return { polygon, minX, minY, maxX, maxY };
    });
}

function segmentIntersectsIndexed(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ip: IndexedPolygon,
  margeM = 0
): boolean {
  if (Math.max(ax, bx) < ip.minX - margeM || Math.min(ax, bx) > ip.maxX + margeM) return false;
  if (Math.max(ay, by) < ip.minY - margeM || Math.min(ay, by) > ip.maxY + margeM) return false;
  if (segmentIntersectsPolygon(ax, ay, bx, by, ip.polygon)) return true;
  if (margeM <= 0) return false;
  // Binnen marge van de polygoonrand: afstand segment-rand benaderen via eindpunten
  const poly = ip.polygon;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [px1, py1] = poly[j];
    const [px2, py2] = poly[i];
    if (
      distPointToSegment(ax, ay, px1, py1, px2, py2) < margeM ||
      distPointToSegment(bx, by, px1, py1, px2, py2) < margeM ||
      distPointToSegment(px1, py1, ax, ay, bx, by) < margeM ||
      distPointToSegment(px2, py2, ax, ay, bx, by) < margeM
    ) {
      return true;
    }
  }
  return false;
}

/** Spatial grid over polygonen: per segment alleen nabije polygonen toetsen. */
const POLY_CEL_M = 120;

interface PolygonGrid {
  cells: Map<string, IndexedPolygon[]>;
}

function buildPolygonGrid(polys: IndexedPolygon[]): PolygonGrid {
  const cells = new Map<string, IndexedPolygon[]>();
  for (const ip of polys) {
    const minCx = Math.floor(ip.minX / POLY_CEL_M);
    const maxCx = Math.floor(ip.maxX / POLY_CEL_M);
    const minCy = Math.floor(ip.minY / POLY_CEL_M);
    const maxCy = Math.floor(ip.maxY / POLY_CEL_M);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx}:${cy}`;
        const cell = cells.get(key) ?? [];
        cell.push(ip);
        cells.set(key, cell);
      }
    }
  }
  return { cells };
}

function segmentIntersectsGrid(
  grid: PolygonGrid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  margeM = 0
): boolean {
  if (grid.cells.size === 0) return false;
  const minCx = Math.floor((Math.min(ax, bx) - margeM) / POLY_CEL_M);
  const maxCx = Math.floor((Math.max(ax, bx) + margeM) / POLY_CEL_M);
  const minCy = Math.floor((Math.min(ay, by) - margeM) / POLY_CEL_M);
  const maxCy = Math.floor((Math.max(ay, by) + margeM) / POLY_CEL_M);
  const getest = new Set<IndexedPolygon>();
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cell = grid.cells.get(`${cx}:${cy}`);
      if (!cell) continue;
      for (const ip of cell) {
        if (getest.has(ip)) continue;
        getest.add(ip);
        if (segmentIntersectsIndexed(ax, ay, bx, by, ip, margeM)) return true;
      }
    }
  }
  return false;
}

/** Spatial grid (celgrootte = NODE_MERGE_M) zodat node-merge geen O(n²) wordt. */
type NodeGrid = Map<string, number[]>;

function gridKey(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

function findOrCreateNode(
  nodes: GraphNode[],
  grid: NodeGrid,
  x: number,
  y: number
): number {
  const cx = Math.floor(x / NODE_MERGE_M);
  const cy = Math.floor(y / NODE_MERGE_M);

  let bestId = -1;
  let bestD = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const cell = grid.get(gridKey(cx + dx, cy + dy));
      if (!cell) continue;
      for (const id of cell) {
        const node = nodes[id];
        const d = dist([node.x, node.y], [x, y]);
        if (d <= NODE_MERGE_M && d < bestD) {
          bestD = d;
          bestId = id;
        }
      }
    }
  }
  if (bestId >= 0) return bestId;

  const id = nodes.length;
  nodes.push({ id, x, y });
  const key = gridKey(cx, cy);
  const cell = grid.get(key) ?? [];
  cell.push(id);
  grid.set(key, cell);
  return id;
}

/** Verbind eindpunten van verschillende wegsegmenten (BGT-weggedeeltes). */
function bridgeRoadEndpoints(
  nodes: GraphNode[],
  edges: GraphEdge[],
  roads: RoutingContext['roadCenterlines'],
  grid: NodeGrid,
  pandGrid: PolygonGrid
): void {
  const endpoints: { x: number; y: number; roadId: string }[] = [];
  for (const road of roads) {
    const line = road.centerline;
    if (line.length < 2) continue;
    endpoints.push({ x: line[0][0], y: line[0][1], roadId: road.id });
    const last = line[line.length - 1];
    endpoints.push({ x: last[0], y: last[1], roadId: road.id });
  }

  // Spatial grid over eindpunten: alleen buurkandidaten vergelijken
  const epGrid = new Map<string, number[]>();
  const epCel = ENDPOINT_BRIDGE_M;
  for (let i = 0; i < endpoints.length; i++) {
    const key = `${Math.floor(endpoints[i].x / epCel)}:${Math.floor(endpoints[i].y / epCel)}`;
    const cell = epGrid.get(key) ?? [];
    cell.push(i);
    epGrid.set(key, cell);
  }

  // Per eindpunt alleen de dichtstbijzijnde paar wegen verbinden — anders
  // explodeert het aantal kruisingsedges kwadratisch in dichte BGT-gebieden
  const MAX_BRUGGEN_PER_EINDPUNT = 4;
  const gelegd = new Set<string>();

  for (let i = 0; i < endpoints.length; i++) {
    const cx = Math.floor(endpoints[i].x / epCel);
    const cy = Math.floor(endpoints[i].y / epCel);
    const kandidaten: { j: number; d: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = epGrid.get(`${cx + dx}:${cy + dy}`);
        if (!cell) continue;
        for (const j of cell) {
          if (j === i) continue;
          if (endpoints[i].roadId === endpoints[j].roadId) continue;
          const d = dist(
            [endpoints[i].x, endpoints[i].y],
            [endpoints[j].x, endpoints[j].y]
          );
          if (d <= 0.5 || d > ENDPOINT_BRIDGE_M) continue;
          kandidaten.push({ j, d });
        }
      }
    }
    kandidaten.sort((a, b) => a.d - b.d);

    let bruggen = 0;
    const verbondenWegen = new Set<string>();
    for (const { j, d } of kandidaten) {
      if (bruggen >= MAX_BRUGGEN_PER_EINDPUNT) break;
      if (verbondenWegen.has(endpoints[j].roadId)) continue;
      const paarKey = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (gelegd.has(paarKey)) continue;

      const ax = endpoints[i].x;
      const ay = endpoints[i].y;
      const bx = endpoints[j].x;
      const by = endpoints[j].y;
      if (segmentIntersectsGrid(pandGrid, ax, ay, bx, by, PAND_MARGE_M)) continue;

      const from = findOrCreateNode(nodes, grid, ax, ay);
      const to = findOrCreateNode(nodes, grid, bx, by);
      if (from === to) continue;

      gelegd.add(paarKey);
      verbondenWegen.add(endpoints[j].roadId);
      bruggen++;
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
  grid: NodeGrid,
  pandGrid: PolygonGrid
): void {
  // Spatial grid over wegsegmenten zodat per eindpunt alleen nabije segmenten meedoen
  const segCel = NEAR_SEGMENT_BRIDGE_M;
  const segGrid = new Map<string, { roadId: string; ax: number; ay: number; bx: number; by: number }[]>();
  for (const road of roads) {
    const line = road.centerline;
    for (let i = 1; i < line.length; i++) {
      const seg = {
        roadId: road.id,
        ax: line[i - 1][0],
        ay: line[i - 1][1],
        bx: line[i][0],
        by: line[i][1],
      };
      const minCx = Math.floor(Math.min(seg.ax, seg.bx) / segCel);
      const maxCx = Math.floor(Math.max(seg.ax, seg.bx) / segCel);
      const minCy = Math.floor(Math.min(seg.ay, seg.by) / segCel);
      const maxCy = Math.floor(Math.max(seg.ay, seg.by) / segCel);
      for (let cx = minCx; cx <= maxCx; cx++) {
        for (let cy = minCy; cy <= maxCy; cy++) {
          const key = `${cx}:${cy}`;
          const cell = segGrid.get(key) ?? [];
          cell.push(seg);
          segGrid.set(key, cell);
        }
      }
    }
  }

  for (const road of roads) {
    const line = road.centerline;
    if (line.length < 2) continue;
    const endpoints: [number, number][] = [
      [line[0][0], line[0][1]],
      [line[line.length - 1][0], line[line.length - 1][1]],
    ];

    for (const [ex, ey] of endpoints) {
      let best: { px: number; py: number; d: number } | null = null;
      const cx = Math.floor(ex / segCel);
      const cy = Math.floor(ey / segCel);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = segGrid.get(`${cx + dx}:${cy + dy}`);
          if (!cell) continue;
          for (const seg of cell) {
            if (seg.roadId === road.id) continue;
            const proj = projectOnSegment(ex, ey, seg.ax, seg.ay, seg.bx, seg.by);
            if (proj.d > NEAR_SEGMENT_BRIDGE_M) continue;
            if (!best || proj.d < best.d) {
              best = { px: proj.x, py: proj.y, d: proj.d };
            }
          }
        }
      }
      if (!best || best.d < 0.5) continue;

      if (segmentIntersectsGrid(pandGrid, ex, ey, best.px, best.py, PAND_MARGE_M)) continue;

      const epNode = findOrCreateNode(nodes, grid, ex, ey);
      const onNode = findOrCreateNode(nodes, grid, best.px, best.py);
      addPairEdges(edges, epNode, onNode, best.d);
    }
  }
}

export function buildRoadGraph(ctx: RoutingContext): RoadGraph {
  const nodes: GraphNode[] = [];
  const grid: NodeGrid = new Map();
  const edges: GraphEdge[] = [];

  for (const road of ctx.roadCenterlines) {
    const line = road.centerline;
    if (line.length < 2) continue;

    let prevNode = findOrCreateNode(nodes, grid, line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) {
      const node = findOrCreateNode(nodes, grid, line[i][0], line[i][1]);
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
  const pandGrid = buildPolygonGrid(indexPolygons(ctx.pandPolygonen));
  bridgeRoadEndpoints(nodes, edges, ctx.roadCenterlines, grid, pandGrid);
  bridgeEndpointsToNearSegments(nodes, edges, ctx.roadCenterlines, grid, pandGrid);

  const adjacency = new Map<number, { to: number; edgeIdx: number }[]>();
  edges.forEach((edge, edgeIdx) => {
    const list = adjacency.get(edge.from) ?? [];
    list.push({ to: edge.to, edgeIdx });
    adjacency.set(edge.from, list);
  });

  return { nodes, edges, adjacency };
}

export function nearestNode(graph: RoadGraph, x: number, y: number, maxDist = 300): number | null {
  const compSize = getComponentSizes(graph);
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

/** Cache per graaf — alleen herberekenen als er nodes bijgekomen zijn (resolveWaypointNode). */
const componentSizeCache = new WeakMap<
  RoadGraph,
  { nodeCount: number; sizes: Map<number, number> }
>();

function getComponentSizes(graph: RoadGraph): Map<number, number> {
  const cached = componentSizeCache.get(graph);
  if (cached && cached.nodeCount === graph.nodes.length) return cached.sizes;
  const sizes = computeComponentSizes(graph);
  componentSizeCache.set(graph, { nodeCount: graph.nodes.length, sizes });
  return sizes;
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
  const compSize = getComponentSizes(graph);

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
  /**
   * Best-effort modus: bebouwing blokkeert niet hard (Infinity) maar krijgt een
   * enorme eindige straf. Zo blijft de router bebouwing maximaal mijden, maar
   * kan hij een verbinding leggen waar het écht niet anders kan — de doorkruiste
   * delen worden daarna gemarkeerd als 'handmatig oplossen'.
   */
  allowPandTraversal?: boolean;
}

/** Straf voor het doorkruisen van bebouwing in best-effort modus (zeer hoog, maar eindig). */
const PAND_BEST_EFFORT_PENALTY = 1e6;

/**
 * Geometrische eigenschappen van een edge t.o.v. de routing-context.
 * Profiel-onafhankelijk, dus één keer per edge te berekenen — A* bezoekt
 * edges vele malen en de polygon-checks zijn verreweg het duurst.
 */
interface EdgeGeometry {
  pandBlocked: boolean;
  begroeidCount: number;
  privaatCount: number;
  publiekCount: number;
  /** Korting voor parallel aan weg/spoor en bestaand net (alleen buiten privaat terrein). */
  korting: number;
  /** Binnen de vrij te houden parallelafstand van een bestaande kabel/leiding */
  teDichtOpNet: boolean;
  /** Zwaarste doorkruiste risicozone (bodem/natura/archeologie/NGE) */
  risicoErnst: 'hoog' | 'middel' | 'laag' | null;
  /** Bomen binnen de kritieke afstand (BOOM_KRITIEK_M) van dit segment */
  boomKritiek: number;
  /** Bomen in de wortelzone (BOOM_KRITIEK_M–BOOM_WORTELZONE_M) */
  boomWortelzone: number;
}

/** Spatial grid voor boompunten — celgrootte zodanig dat ±1 cel de wortelzone dekt */
const BOOM_CEL_M = 25;

interface CtxPolygonIndex {
  pandGrid: PolygonGrid;
  begroeid: IndexedPolygon[];
  percelen: { ip: IndexedPolygon; publiek: boolean }[];
  bomenGrid: Map<string, { x: number; y: number }[]>;
  risico: { ip: IndexedPolygon; ernst: 'hoog' | 'middel' | 'laag' }[];
}

function boomCelKey(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

const ctxPolygonCache = new WeakMap<RoutingContext, CtxPolygonIndex>();

function getCtxPolygonIndex(ctx: RoutingContext): CtxPolygonIndex {
  let idx = ctxPolygonCache.get(ctx);
  if (!idx) {
    const bomenGrid = new Map<string, { x: number; y: number }[]>();
    for (const boom of ctx.bomen ?? []) {
      const key = boomCelKey(Math.floor(boom.x / BOOM_CEL_M), Math.floor(boom.y / BOOM_CEL_M));
      const cell = bomenGrid.get(key) ?? [];
      cell.push(boom);
      bomenGrid.set(key, cell);
    }
    idx = {
      pandGrid: buildPolygonGrid(indexPolygons(ctx.pandPolygonen)),
      begroeid: indexPolygons(ctx.begroeidPolygonen),
      percelen: ctx.percelen
        .filter((p) => p.polygon.length >= 3)
        .map((p) => ({
          ip: indexPolygons([p.polygon])[0],
          publiek: p.publiek === true,
        })),
      bomenGrid,
      risico: (ctx.risicoZones ?? [])
        .filter((z) => z.polygon.length >= 4)
        .map((z) => ({ ip: indexPolygons([z.polygon])[0], ernst: z.ernst })),
    };
    ctxPolygonCache.set(ctx, idx);
  }
  return idx;
}

/** Tel bomen rond een segment via het grid (alleen nabijgelegen cellen). */
function telBomenNabijSegment(
  grid: Map<string, { x: number; y: number }[]>,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { kritiek: number; wortelzone: number } {
  let kritiek = 0;
  let wortelzone = 0;
  if (grid.size === 0) return { kritiek, wortelzone };

  const minCx = Math.floor((Math.min(ax, bx) - BOOM_WORTELZONE_M) / BOOM_CEL_M);
  const maxCx = Math.floor((Math.max(ax, bx) + BOOM_WORTELZONE_M) / BOOM_CEL_M);
  const minCy = Math.floor((Math.min(ay, by) - BOOM_WORTELZONE_M) / BOOM_CEL_M);
  const maxCy = Math.floor((Math.max(ay, by) + BOOM_WORTELZONE_M) / BOOM_CEL_M);

  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const cell = grid.get(boomCelKey(cx, cy));
      if (!cell) continue;
      for (const boom of cell) {
        const d = distPointToSegment(boom.x, boom.y, ax, ay, bx, by);
        if (d <= BOOM_KRITIEK_M) kritiek++;
        else if (d <= BOOM_WORTELZONE_M) wortelzone++;
      }
    }
  }
  return { kritiek, wortelzone };
}

const edgeGeometryCache = new WeakMap<RoadGraph, Map<number, EdgeGeometry>>();

function getEdgeGeometry(graph: RoadGraph, edgeIdx: number, ctx: RoutingContext): EdgeGeometry {
  let cache = edgeGeometryCache.get(graph);
  if (!cache) {
    cache = new Map();
    edgeGeometryCache.set(graph, cache);
  }
  const hit = cache.get(edgeIdx);
  if (hit) return hit;

  const edge = graph.edges[edgeIdx];
  const a = graph.nodes[edge.from];
  const b = graph.nodes[edge.to];
  const polyIdx = getCtxPolygonIndex(ctx);

  const pandBlocked = segmentIntersectsGrid(polyIdx.pandGrid, a.x, a.y, b.x, b.y, PAND_MARGE_M);

  let begroeidCount = 0;
  for (const begroeid of polyIdx.begroeid) {
    if (segmentIntersectsIndexed(a.x, a.y, b.x, b.y, begroeid)) begroeidCount++;
  }

  let privaatCount = 0;
  let publiekCount = 0;
  for (const perceel of polyIdx.percelen) {
    if (!segmentIntersectsIndexed(a.x, a.y, b.x, b.y, perceel.ip)) continue;
    if (perceel.publiek) publiekCount++;
    else privaatCount++;
  }

  // Parallelafstand tot bestaande K&L geldt altijd (NEN 7171/netbeheerder);
  // de volg-korting alleen buiten privaat terrein
  let teDichtOpNet = false;
  let langsNet = false;
  for (const net of ctx.bestaandNet ?? []) {
    const line2d = net.coordinates.map(([x, y]) => [x, y] as [number, number]);
    const d = minDistToLine(a.x, a.y, b.x, b.y, line2d);
    const vrij = net.vrijTeHoudenAfstand ?? 1.0;
    if (d < vrij) {
      teDichtOpNet = true;
    } else if (d < 15) {
      langsNet = true;
    }
  }

  // Kortingen zijn eenmalig per categorie — stapeling per object maakte
  // wijkroutes met veel kleine percelen/leidingen kunstmatig goedkoop
  let korting = 1;
  if (privaatCount === 0) {
    let langsWeg = false;
    for (const bel of ctx.belemmeringen) {
      if (bel.categorie === 'weg' || bel.categorie === 'spoor') {
        const d = minDistToLine(a.x, a.y, b.x, b.y, bel.coordinates);
        if (d < 25) {
          langsWeg = true;
          break;
        }
      }
    }
    // Geleerde voorkeur: geüploade referentieontwerpen wegen het zwaarst
    let langsReferentie = false;
    for (const ref of ctx.referentieTraces ?? []) {
      const d = minDistToLine(a.x, a.y, b.x, b.y, ref);
      if (d < 20) {
        langsReferentie = true;
        break;
      }
    }
    if (langsWeg) korting *= 0.8;
    if (langsNet) korting *= 0.75;
    if (langsReferentie) korting *= 0.6;
  }

  const bomen = telBomenNabijSegment(polyIdx.bomenGrid, a.x, a.y, b.x, b.y);

  let risicoErnst: EdgeGeometry['risicoErnst'] = null;
  const ernstRang = { laag: 1, middel: 2, hoog: 3 } as const;
  for (const zone of polyIdx.risico) {
    if (!segmentIntersectsIndexed(a.x, a.y, b.x, b.y, zone.ip)) continue;
    if (!risicoErnst || ernstRang[zone.ernst] > ernstRang[risicoErnst]) {
      risicoErnst = zone.ernst;
    }
  }

  const geom: EdgeGeometry = {
    pandBlocked,
    begroeidCount,
    privaatCount,
    publiekCount,
    korting,
    teDichtOpNet,
    risicoErnst,
    boomKritiek: bomen.kritiek,
    boomWortelzone: bomen.wortelzone,
  };
  cache.set(edgeIdx, geom);
  return geom;
}

function edgeCostForIdx(
  graph: RoadGraph,
  edgeIdx: number,
  ctx: RoutingContext,
  options?: AStarOptions
): number {
  const edge = graph.edges[edgeIdx];
  const geom = getEdgeGeometry(graph, edgeIdx, ctx);

  // Harde eis: een tracé loopt nooit onder of vlak langs bebouwing.
  // In best-effort modus blokkeert dit niet hard maar met een enorme straf,
  // zodat een verbinding mogelijk blijft als er geen bebouwingsvrije route is.
  let cost = edge.lengthM;
  if (geom.pandBlocked) {
    if (!options?.allowPandTraversal) return Infinity;
    cost *= PAND_BEST_EFFORT_PENALTY;
  }

  if (geom.begroeidCount > 0) cost *= 2.5 ** geom.begroeidCount;
  // Boomafstand: kritieke zone sterk vermijden, wortelzone licht ontmoedigen
  if (geom.boomKritiek > 0) cost *= 6 ** Math.min(geom.boomKritiek, 3);
  else if (geom.boomWortelzone > 0) cost *= 1.5;
  if (geom.privaatCount > 0) {
    // Richtlijn: zo min mogelijk door privaat terrein — alleen wanneer er
    // werkelijk geen openbare route is, wordt privaat geaccepteerd
    const mult = options?.profile === 'avoid_private' ? 10 : 5;
    cost *= mult ** geom.privaatCount;
  }
  // Voorkeur publieke grond; in best-effort modus iets sterker zodat ook het
  // gemarkeerde tracé zo veel mogelijk over openbaar terrein blijft lopen
  if (geom.publiekCount > 0) cost *= options?.allowPandTraversal ? 0.85 : 0.9;
  if (geom.privaatCount === 0) cost *= geom.korting;
  // Parallelafstand tot bestaande K&L (NEN 7171/netbeheerder): te dichtbij vermijden
  if (geom.teDichtOpNet) cost *= 2.5;
  // Risicozones (bodem/Natura 2000/archeologie/NGE): vermijden waar mogelijk
  if (geom.risicoErnst === 'hoog') cost *= 2.2;
  else if (geom.risicoErnst === 'middel') cost *= 1.6;
  else if (geom.risicoErnst === 'laag') cost *= 1.25;

  if (edge.roadType !== 'kruising') {
    // Doorgaande wegen (AVOI-corridors) hebben ook standaard de voorkeur
    // boven wijk- en voetpadroutes
    const isHoofdweg = edge.roadType === 'provincialeweg' || edge.roadType === 'rijksweg';
    cost *= options?.profile === 'prefer_main_roads'
      ? isHoofdweg
        ? 0.65
        : edge.roadType === 'gemeenteweg'
          ? 0.8
          : 0.9
      : isHoofdweg
        ? 0.82
        : edge.roadType === 'gemeenteweg'
          ? 0.9
          : 0.93;
  }

  // NWB-centerlines zijn schone hartlijnen; uit BGT-vlakken afgeleide lijnen zijn
  // ruwe diagonalen tussen vlak-hoekpunten. Stevige opslag zodat het tracé de
  // schone NWB-hartlijn volgt en de BGT-diagonalen alleen als laatste redmiddel
  // gebruikt (anders zigzag tussen parallelle lijnvarianten).
  if (edge.roadId.startsWith('bgt-')) cost *= 1.8;

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

/** Binaire min-heap voor de A*-open-set (lineair zoeken werd het knelpunt). */
class MinHeap {
  private ids: number[] = [];
  private fs: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, f: number): void {
    this.ids.push(id);
    this.fs.push(f);
    let i = this.ids.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.fs[parent] <= this.fs[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): { id: number; f: number } | undefined {
    if (this.ids.length === 0) return undefined;
    const top = { id: this.ids[0], f: this.fs[0] };
    const lastId = this.ids.pop()!;
    const lastF = this.fs.pop()!;
    if (this.ids.length > 0) {
      this.ids[0] = lastId;
      this.fs[0] = lastF;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.fs.length && this.fs[l] < this.fs[smallest]) smallest = l;
        if (r < this.fs.length && this.fs[r] < this.fs[smallest]) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(i: number, j: number): void {
    [this.ids[i], this.ids[j]] = [this.ids[j], this.ids[i]];
    [this.fs[i], this.fs[j]] = [this.fs[j], this.fs[i]];
  }
}

export function aStar(
  graph: RoadGraph,
  startId: number,
  goalId: number,
  ctx: RoutingContext,
  options?: AStarOptions
): number[] | null {
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const heap = new MinHeap();
  const goalNode = graph.nodes[goalId];

  gScore.set(startId, 0);
  const f0 = heuristic(graph.nodes[startId], goalNode);
  fScore.set(startId, f0);
  heap.push(startId, f0);

  // Noodrem: bij een pathologische graaf liever "geen route" dan een geblokkeerde server
  const maxExpansions = Math.max(100_000, graph.nodes.length * 50);
  let expansions = 0;

  while (heap.size > 0) {
    const { id: current, f } = heap.pop()!;
    if (f > (fScore.get(current) ?? Infinity)) continue; // verouderde heap-entry
    if (current === goalId) {
      const path: number[] = [current];
      while (cameFrom.has(path[path.length - 1])) {
        path.push(cameFrom.get(path[path.length - 1])!);
      }
      return path.reverse();
    }
    if (++expansions > maxExpansions) return null;

    const gCurrent = gScore.get(current) ?? Infinity;
    for (const { to, edgeIdx } of graph.adjacency.get(current) ?? []) {
      const cost = edgeCostForIdx(graph, edgeIdx, ctx, options);
      if (cost === Infinity) continue;
      const tentative = gCurrent + cost;
      if (tentative < (gScore.get(to) ?? Infinity)) {
        cameFrom.set(to, current);
        gScore.set(to, tentative);
        const fNew = tentative + heuristic(graph.nodes[to], goalNode);
        fScore.set(to, fNew);
        heap.push(to, fNew);
      }
    }
  }

  return null;
}
