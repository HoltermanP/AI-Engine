import { pointInPolygon, traceLengthM } from '@/lib/geo';
import type { Leglocatie } from '@/demo/roads';
import type { AvoiZone } from '@/demo/avoi';
import { zoneLabel } from '@/demo/avoi';
import { getAvoiForGemeente } from '@/demo/avoi';
import { ontwerpEisVoorDiscipline } from './context';
import { getGebiedProfiel } from '@/demo/reports/context';
import {
  buildRoadGraph,
  resolveWaypointNode,
  aStar,
  extractEdgeKeysFromPath,
  addPathPenalties,
  type RoadGraph,
  type AStarOptions,
  type RouteCostProfile,
} from './road-graph';
import { buildRoutingContext } from './context';
import type {
  RouteCrossing,
  RouteSegmentAnalysis,
  RoutingContext,
  TraceRouteAlternative,
  TraceRoutingInput,
  TraceRoutingResult,
  TraceWaypoint,
} from './types';

const MAX_ALTERNATIVES = 3;

const ALTERNATIVE_PROFILES: { id: string; label: string; beschrijving: string; profile: RouteCostProfile }[] = [
  {
    id: 'aanbevolen',
    label: 'Aanbevolen',
    beschrijving: 'Beste balans: AVOI, wegen, openbaar terrein',
    profile: 'default',
  },
  {
    id: 'alternatief-omweg',
    label: 'Alternatief via omweg',
    beschrijving: 'Vermijdt het primaire tracé — andere wegverbinding',
    profile: 'default',
  },
  {
    id: 'openbaar-terrein',
    label: 'Voorkeur openbaar terrein',
    beschrijving: 'Maximale vermijding privaat terrein (zakelijk recht)',
    profile: 'avoid_private',
  },
];

const STEP_M = 25;

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function offsetPointAlongLine(
  line: [number, number][],
  offsetM: number
): [number, number][] {
  if (line.length < 2) return line;
  const out: [number, number][] = [];

  for (let i = 0; i < line.length; i++) {
    const [x, y] = line[i];
    let angle: number;
    if (i === 0) {
      const [x2, y2] = line[i + 1];
      angle = Math.atan2(y2 - y, x2 - x);
    } else if (i === line.length - 1) {
      const [x1, y1] = line[i - 1];
      angle = Math.atan2(y - y1, x - x1);
    } else {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i + 1];
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
    const perpX = -Math.sin(angle) * offsetM;
    const perpY = Math.cos(angle) * offsetM;
    out.push([Math.round((x + perpX) * 10) / 10, Math.round((y + perpY) * 10) / 10]);
  }
  return out;
}

function densifyLine(line: [number, number][], stepM = STEP_M): [number, number][] {
  if (line.length < 2) return line;
  const out: [number, number][] = [line[0]];

  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const segLen = dist([x1, y1], [x2, y2]);
    const steps = Math.max(1, Math.floor(segLen / stepM));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]);
    }
  }
  return out;
}

function pathToCenterline(graph: RoadGraph, nodePath: number[]): [number, number][] {
  return nodePath.map((id) => [graph.nodes[id].x, graph.nodes[id].y] as [number, number]);
}

function segmentCrossesBuildings(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  pandPolygonen: [number, number][][]
): boolean {
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  for (const pand of pandPolygonen) {
    if (pointInPolygon(midX, midY, pand)) return true;
    if (pointInPolygon(ax, ay, pand) || pointInPolygon(bx, by, pand)) return true;
  }
  return false;
}

function routeCrossesBuildings(
  line: [number, number][],
  pandPolygonen: [number, number][][]
): boolean {
  if (pandPolygonen.length === 0 || line.length < 2) return false;
  for (const [x, y] of line) {
    for (const pand of pandPolygonen) {
      if (pointInPolygon(x, y, pand)) return true;
    }
  }
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    if (segmentCrossesBuildings(x1, y1, x2, y2, pandPolygonen)) return true;
  }
  return false;
}

function snapWaypointToRoad(
  graph: RoadGraph,
  wp: TraceWaypoint,
  snapDist: number
): TraceWaypoint | null {
  const nodeId = resolveWaypointNode(graph, wp.x, wp.y, snapDist);
  if (nodeId === null) return null;
  const node = graph.nodes[nodeId];
  return { x: node.x, y: node.y };
}

function failedRoute(): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  return { centerline: [], roadNaam: 'Directe lijn', fallback: true, nodePath: [] };
}

function snapDistanceForWaypoints(from: TraceWaypoint, to: TraceWaypoint): number {
  const span = dist([from.x, from.y], [to.x, to.y]);
  return Math.min(950, Math.max(450, span * 1.1));
}

function routeBetweenWaypoints(
  graph: RoadGraph,
  ctx: RoutingContext,
  from: TraceWaypoint,
  to: TraceWaypoint,
  astarOptions?: AStarOptions
): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  const snapDist = snapDistanceForWaypoints(from, to);
  const startNode = resolveWaypointNode(graph, from.x, from.y, snapDist);
  const goalNode = resolveWaypointNode(graph, to.x, to.y, snapDist);

  if (startNode === null || goalNode === null) {
    return routeChainedMidpoints(graph, ctx, from, to, astarOptions, snapDist);
  }

  const direct = tryRouteBetweenNodes(graph, ctx, startNode, goalNode, astarOptions);
  if (!direct.fallback) return direct;

  return routeChainedMidpoints(graph, ctx, from, to, astarOptions, snapDist);
}

function tryRouteBetweenNodes(
  graph: RoadGraph,
  ctx: RoutingContext,
  startNode: number,
  goalNode: number,
  astarOptions?: AStarOptions
): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  const path = aStar(graph, startNode, goalNode, ctx, astarOptions);
  if (!path || path.length < 2) {
    return failedRoute();
  }
  const built = buildRouteFromPath(graph, path, false);
  if (routeCrossesBuildings(built.centerline, ctx.pandPolygonen)) {
    return failedRoute();
  }
  return built;
}

function routeChainedMidpoints(
  graph: RoadGraph,
  ctx: RoutingContext,
  from: TraceWaypoint,
  to: TraceWaypoint,
  astarOptions: AStarOptions | undefined,
  snapDist: number
): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  const span = dist([from.x, from.y], [to.x, to.y]);
  const steps = Math.min(12, Math.max(4, Math.ceil(span / 120)));

  const startSnap = snapWaypointToRoad(graph, from, snapDist);
  const endSnap = snapWaypointToRoad(graph, to, snapDist);
  if (!startSnap || !endSnap) return failedRoute();

  const chain: TraceWaypoint[] = [startSnap];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const raw = {
      x: from.x + t * (to.x - from.x),
      y: from.y + t * (to.y - from.y),
    };
    const snapped = snapWaypointToRoad(graph, raw, snapDist);
    if (snapped) {
      const last = chain[chain.length - 1];
      if (dist([last.x, last.y], [snapped.x, snapped.y]) > 5) {
        chain.push(snapped);
      }
    }
  }
  if (dist([chain[chain.length - 1].x, chain[chain.length - 1].y], [endSnap.x, endSnap.y]) > 5) {
    chain.push(endSnap);
  } else {
    chain[chain.length - 1] = endSnap;
  }

  if (chain.length < 2) return failedRoute();

  const mergedLine: [number, number][] = [];
  const roadCounts = new Map<string, number>();
  let nodePath: number[] = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i];
    const b = chain[i + 1];
    const segSnap = Math.min(snapDist, snapDistanceForWaypoints(a, b));
    const sNode = resolveWaypointNode(graph, a.x, a.y, segSnap);
    const gNode = resolveWaypointNode(graph, b.x, b.y, segSnap);

    if (sNode === null || gNode === null) return failedRoute();

    const seg = tryRouteBetweenNodes(graph, ctx, sNode, gNode, astarOptions);
    if (seg.fallback || seg.centerline.length < 2) return failedRoute();

    nodePath = nodePath.length ? nodePath.concat(seg.nodePath.slice(1)) : seg.nodePath;
    if (mergedLine.length) {
      mergedLine.push(...seg.centerline.slice(1));
    } else {
      mergedLine.push(...seg.centerline);
    }
    roadCounts.set(seg.roadNaam, (roadCounts.get(seg.roadNaam) ?? 0) + seg.centerline.length);
  }

  if (mergedLine.length < 2 || routeCrossesBuildings(mergedLine, ctx.pandPolygonen)) {
    return failedRoute();
  }

  let roadNaam = 'Onbekende weg';
  let maxScore = 0;
  for (const [naam, score] of roadCounts) {
    if (score > maxScore) {
      maxScore = score;
      roadNaam = naam;
    }
  }

  return {
    centerline: densifyLine(mergedLine),
    roadNaam,
    fallback: false,
    nodePath,
  };
}

function buildRouteFromPath(
  graph: RoadGraph,
  path: number[],
  fallback: boolean
): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  const centerline = densifyLine(pathToCenterline(graph, path));
  const edgeRoads = new Map<string, number>();
  for (let i = 1; i < path.length; i++) {
    const fromId = path[i - 1];
    const toId = path[i];
    const edge = graph.edges.find((e) => e.from === fromId && e.to === toId);
    if (edge && edge.roadNaam !== 'Kruising') {
      edgeRoads.set(edge.roadNaam, (edgeRoads.get(edge.roadNaam) ?? 0) + edge.lengthM);
    }
  }
  let roadNaam = 'Onbekende weg';
  let maxLen = 0;
  for (const [naam, len] of edgeRoads) {
    if (len > maxLen) {
      maxLen = len;
      roadNaam = naam;
    }
  }

  return { centerline, roadNaam, fallback, nodePath: path };
}

function waterBreedte(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  const xs = coords.map(([x]) => x);
  const ys = coords.map(([, y]) => y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

function detectCrossings(
  line: [number, number][],
  ctx: RoutingContext
): RouteCrossing[] {
  const crossings: RouteCrossing[] = [];

  for (const water of ctx.watergangen) {
    if (water.coordinates.length < 2) continue;
    const midIdx = Math.floor(line.length / 2);
    const [mx, my] = line[midIdx] ?? line[0];
    const wx = water.coordinates.reduce((s, [x]) => s + x, 0) / water.coordinates.length;
    const wy = water.coordinates.reduce((s, [, y]) => s + y, 0) / water.coordinates.length;
    if (dist([mx, my], [wx, wy]) > 80) continue;

    const breedte = waterBreedte(water.coordinates);
    const legtechniek = breedte > 10 ? 'hdd' : breedte > 4 ? 'persing' : 'sleufloos';
    crossings.push({
      type: 'water',
      naam: water.naam,
      breedteM: Math.round(breedte),
      legtechniek,
      normReferentie:
        ctx.discipline === 'water'
          ? 'NEN-EN 805 / Vitens onderdoorrichtlijn'
          : 'NEN 7171 / netbeheerder HDD-eisen',
    });
  }

  for (const bel of ctx.belemmeringen) {
    if (bel.categorie !== 'weg') continue;
    const midIdx = Math.floor(line.length / 2);
    const [mx, my] = line[midIdx] ?? line[0];
    let minD = Infinity;
    for (let i = 1; i < bel.coordinates.length; i++) {
      const [x1, y1] = bel.coordinates[i - 1];
      const [x2, y2] = bel.coordinates[i];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / lenSq));
      minD = Math.min(minD, Math.hypot(mx - (x1 + t * dx), my - (y1 + t * dy)));
    }
    if (minD < 30) {
      crossings.push({
        type: 'weg',
        naam: bel.naam ?? bel.id,
        legtechniek: 'sleufloos',
        normReferentie: 'Asfaltzagen / persing conform gemeente',
      });
    }
  }

  return crossings;
}

function zoneToLeglocatie(zone: AvoiZone): Leglocatie {
  switch (zone) {
    case 'onder_verharding':
      return 'onder_verharding';
    case 'parallelweg':
      return 'parallelweg';
    case 'utiliteitsstrook':
      return 'parallelweg';
    case 'berm_noord':
    case 'berm_zuid':
    default:
      return 'berm';
  }
}

function kiesLegtechniek(
  crossings: RouteCrossing[],
  ctx: RoutingContext,
  fallback: boolean
): RouteSegmentAnalysis['legtechniek'] {
  if (crossings.some((k) => k.type === 'water' && (k.breedteM ?? 0) > 10)) return 'hdd';
  if (crossings.some((k) => k.legtechniek === 'hdd')) return 'hdd';
  if (crossings.some((k) => k.legtechniek === 'persing')) return 'persing';
  if (ctx.discipline === 'gas_ld' || ctx.discipline === 'elektra_ls') {
    return fallback ? 'open_ontgraving' : 'sleufloos';
  }
  if (crossings.some((k) => k.type === 'weg')) return 'sleufloos';
  return 'open_ontgraving';
}

function analyseSegment(
  centerline: [number, number][],
  roadNaam: string,
  ctx: RoutingContext,
  volgorde: number,
  fallback: boolean
): RouteSegmentAnalysis {
  const offsetLine = offsetPointAlongLine(centerline, ctx.offsetM);
  const lengteM = Math.round(traceLengthM(offsetLine.map(([x, y]) => [x, y, ctx.diepteNap])));
  const crossings = detectCrossings(offsetLine, ctx);
  const legtechniek = kiesLegtechniek(crossings, ctx, fallback);

  const { gemeente } = getGebiedProfiel(ctx.projectId);
  const avoi = getAvoiForGemeente(gemeente);
  const ontwerp = ontwerpEisVoorDiscipline(avoi, ctx.discipline);

  const opmerkingen: string[] = [];
  let score = 85;
  let zakelijkRechtVereist = false;

  if (fallback) {
    score -= 25;
    opmerkingen.push('Geen wegennet gevonden — directe verbinding gebruikt');
  } else {
    opmerkingen.push(`Tracé volgt ${roadNaam}`);
  }

  opmerkingen.push(`AVOI ${gemeente}: ${zoneLabel(ontwerp.zone)} (${ontwerp.leglocatieHint})`);

  for (const [x, y] of offsetLine) {
    for (const pand of ctx.pandPolygonen) {
      if (pointInPolygon(x, y, pand)) {
        score = 0;
        opmerkingen.push('BLokkade: tracé onder bebouwing');
      }
    }
    for (const perceel of ctx.percelen) {
      if (pointInPolygon(x, y, perceel.polygon) && !perceel.publiek) {
        score -= 15;
        zakelijkRechtVereist = true;
      }
    }
    for (const begroeid of ctx.begroeidPolygonen) {
      if (pointInPolygon(x, y, begroeid)) {
        score -= 8;
        opmerkingen.push('Tracé (deels) onder begroeiing — vermijden waar mogelijk');
        break;
      }
    }
  }

  if (zakelijkRechtVereist) {
    opmerkingen.push('Privaat terrein — zakelijk recht overeenkomen met eigenaar');
  }

  if (crossings.length) {
    opmerkingen.push(
      `${crossings.length} kruising(en): ${crossings.map((k) => `${k.naam} (${k.legtechniek.replace(/_/g, ' ')})`).join(', ')}`
    );
  }

  score = Math.max(0, Math.min(100, score));

  return {
    volgorde,
    wegnaam: roadNaam,
    leglocatie: zoneToLeglocatie(ontwerp.zone),
    legtechniek,
    lengteM,
    kruisingen: crossings,
    score,
    opmerkingen: [...new Set(opmerkingen)],
    zakelijkRechtVereist,
  };
}

function routesAreSimilar(a: TraceRouteAlternative, b: TraceRouteAlternative): boolean {
  const namesA = a.segmenten.map((s) => s.wegnaam).join('|');
  const namesB = b.segmenten.map((s) => s.wegnaam).join('|');
  if (namesA === namesB) return true;
  return (
    Math.abs(a.totaleLengteM - b.totaleLengteM) < 20 &&
    a.segmenten.length === b.segmenten.length
  );
}

function buildSingleRoute(
  graph: RoadGraph,
  ctx: RoutingContext,
  input: TraceRoutingInput,
  spec: (typeof ALTERNATIVE_PROFILES)[number],
  edgePenalty: Map<string, number>
): TraceRouteAlternative | null {
  const { waypoints } = input;
  const astarOptions: AStarOptions = {
    edgePenalty,
    profile: spec.profile,
  };

  const traceLines: [number, number, number][][] = [];
  const segmenten: RouteSegmentAnalysis[] = [];
  const waarschuwingen: string[] = [];
  const blokkades: string[] = [];
  const allEdgeKeys: string[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const { centerline, roadNaam, fallback, nodePath } = routeBetweenWaypoints(
      graph,
      ctx,
      from,
      to,
      astarOptions
    );

    if (fallback || centerline.length < 2 || routeCrossesBuildings(centerline, ctx.pandPolygonen)) {
      return null;
    }

    if (nodePath.length >= 2) {
      allEdgeKeys.push(...extractEdgeKeysFromPath(graph, nodePath));
    }

    const segment = analyseSegment(centerline, roadNaam, ctx, i + 1, false);
    if (segment.score === 0) {
      return null;
    }
    segmenten.push(segment);

    if (segment.zakelijkRechtVereist) {
      waarschuwingen.push(`Segment ${segment.volgorde}: zakelijk recht vereist op privaat terrein`);
    }

    let offsetLine = offsetPointAlongLine(centerline, ctx.offsetM);
    if (routeCrossesBuildings(offsetLine, ctx.pandPolygonen)) {
      offsetLine = centerline;
    }
    const line3d: [number, number, number][] = offsetLine.map(([x, y]) => [
      x,
      y,
      ctx.diepteNap,
    ]);
    if (line3d.length >= 2) {
      traceLines.push(line3d);
    }
  }

  if (!traceLines.some((line) => line.length >= 2)) return null;

  const coordinates = traceLines.flat();
  const totaleLengteM = Math.round(traceLengthM(coordinates, traceLines));
  const score =
    segmenten.length > 0
      ? Math.round(segmenten.reduce((s, seg) => s + seg.score, 0) / segmenten.length)
      : 0;

  addPathPenalties(edgePenalty, allEdgeKeys, 5);

  return {
    id: spec.id,
    label: spec.label,
    beschrijving: spec.beschrijving,
    traceLines,
    coordinates,
    segmenten,
    totaleLengteM,
    score,
    waarschuwingen,
    blokkades,
  };
}

function emptyRoutingResult(partial: Partial<TraceRoutingResult>): TraceRoutingResult {
  return {
    traceLines: [[]],
    coordinates: [],
    segmenten: [],
    totaleLengteM: 0,
    score: 0,
    samenvatting: [],
    waarschuwingen: [],
    blokkades: [],
    normReferenties: [],
    alternatieven: [],
    ...partial,
  };
}

function snapWaypointsToGraph(
  graph: RoadGraph,
  waypoints: TraceWaypoint[]
): TraceWaypoint[] {
  return waypoints.map((wp) => {
    const nodeId = resolveWaypointNode(graph, wp.x, wp.y);
    if (nodeId === null) return wp;
    const node = graph.nodes[nodeId];
    return { ...wp, x: node.x, y: node.y };
  });
}

export function planAutomaticTrace(input: TraceRoutingInput): TraceRoutingResult {
  const { waypoints: rawWaypoints } = input;

  if (rawWaypoints.length < 2) {
    return emptyRoutingResult({
      waarschuwingen: ['Minimaal 2 punten nodig (start en eind)'],
      normReferenties: normReferenties(input),
    });
  }

  const ctx = buildRoutingContext(input);
  const graph = buildRoadGraph(ctx);
  const waypoints = snapWaypointsToGraph(graph, rawWaypoints);
  const inputWithSnapped = { ...input, waypoints };

  if (graph.nodes.length === 0) {
    return emptyRoutingResult({
      waarschuwingen: ['Geen wegennet beschikbaar in dit gebied'],
      blokkades: ['Geen NWB/BGT wegen gevonden'],
      normReferenties: ctx.normReferenties,
    });
  }

  const edgePenalty = new Map<string, number>();
  const alternatieven: TraceRouteAlternative[] = [];

  for (const spec of ALTERNATIVE_PROFILES) {
    if (alternatieven.length >= MAX_ALTERNATIVES) break;
    const route = buildSingleRoute(graph, ctx, inputWithSnapped, spec, edgePenalty);
    if (!route) continue;
    if (alternatieven.some((existing) => routesAreSimilar(existing, route))) continue;
    alternatieven.push(route);
  }

  if (alternatieven.length === 0) {
    const pandBlok =
      ctx.pandPolygonen.length > 0
        ? ' — tracé mag niet door bebouwing lopen'
        : '';
    return emptyRoutingResult({
      waarschuwingen: [`Geen route langs wegen gevonden tussen de waypoints${pandBlok}`],
      blokkades:
        ctx.pandPolygonen.length > 0
          ? ['Geen pad gevonden zonder door panden te lopen']
          : ['Geen verbinding in wegennet'],
      normReferenties: ctx.normReferenties,
    });
  }

  const primary = alternatieven[0];
  const samenvatting = [
    `Automatisch tracé: ${primary.totaleLengteM} m over ${primary.segmenten.length} segment(en)`,
    `${alternatieven.length} route-alternatief${alternatieven.length > 1 ? 'en' : ''} berekend`,
    `Discipline ${input.discipline} — dekking ${input.vereisteDekking} m`,
    `Gemeente ${ctx.gemeente} — AVOI-offset ${ctx.offsetM} m`,
  ];

  const heeftHdd = primary.segmenten.some((s) => s.legtechniek === 'hdd');
  const heeftPrivaat = primary.segmenten.some((s) => s.zakelijkRechtVereist);
  if (heeftHdd) samenvatting.push('Gestuurd boren (HDD) toegepast bij waterkruising >10 m');
  if (heeftPrivaat) samenvatting.push('Zakelijk recht vereist — voorkeur openbaar terrein niet overal haalbaar');

  return {
    id: primary.id,
    label: primary.label,
    traceLines: primary.traceLines,
    coordinates: primary.coordinates,
    segmenten: primary.segmenten,
    totaleLengteM: primary.totaleLengteM,
    score: primary.score,
    samenvatting,
    waarschuwingen: primary.waarschuwingen,
    blokkades: primary.blokkades,
    normReferenties: ctx.normReferenties,
    alternatieven,
    geselecteerdeAlternativeId: primary.id,
  };
}

function normReferenties(input: TraceRoutingInput): string[] {
  return buildRoutingContext(input).normReferenties;
}

export { buildRoutingContext };
