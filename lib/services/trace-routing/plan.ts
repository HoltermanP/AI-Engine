import {
  pointInPolygon,
  segmentIntersectsPolygon,
  segmentsIntersect,
  traceLengthM,
} from '@/lib/geo';
import { BOOM_KRITIEK_M, BOOM_WORTELZONE_M } from './road-graph';
import {
  beoordeelSpoorkruising,
  beoordeelWaterkruising,
  beoordeelWegkruising,
  type KruisingsBesluit,
} from './kruising-afweging';
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
import { computeZroOverzicht } from './zro';
import type {
  MarkedSegment,
  RouteCrossing,
  RouteSegmentAnalysis,
  RoutingContext,
  SegmentMarker,
  TraceRouteAlternative,
  TraceRoutingInput,
  TraceRoutingResult,
  TraceWaypoint,
} from './types';

const PANDDEKKING_WAARSCHUWING =
  'Panddekking onzeker (PDOK-data afgekapt) — tracé is niet gegarandeerd vrij van ' +
  'bebouwing; handmatige controle vereist';

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

function richtingsveranderingDeg(
  a: [number, number],
  b: [number, number],
  c: [number, number]
): number {
  const v1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const v2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let diff = Math.abs(v2 - v1) * (180 / Math.PI);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function afstandTotSegment(
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

/**
 * Verwijder zigzag-spikes: scherpe korte uitwijkingen die ontstaan door ruwe
 * BGT-centerlines en knoop-merging. Een punt vervalt alleen als de directe
 * verbinding tussen zijn buren geen pand doorsnijdt.
 */
function verwijderSpikes(
  line: [number, number][],
  pandPolygonen: [number, number][][]
): [number, number][] {
  let huidige = line;
  for (let ronde = 0; ronde < 8; ronde++) {
    if (huidige.length < 3) break;
    const volgende: [number, number][] = [huidige[0]];
    let verwijderd = false;

    for (let i = 1; i < huidige.length - 1; i++) {
      const a = volgende[volgende.length - 1];
      const b = huidige[i];
      const c = huidige[i + 1];
      const hoek = richtingsveranderingDeg(a, b, c);
      const uitwijking = afstandTotSegment(b[0], b[1], a[0], a[1], c[0], c[1]);
      // Een ruis-spike (BGT-centerline/knoop-merging) heeft minstens één kort
      // beentje en wijkt maar weinig af. Een échte kruisingshoek heeft twee
      // lange wegsegmenten — die mag nooit worden afgesneden.
      const kortsteBeen = Math.min(dist(a, b), dist(b, c));

      const isSpike = hoek > 45 && kortsteBeen < 15 && uitwijking < 10;
      if (isSpike) {
        let veilig = true;
        for (const pand of pandPolygonen) {
          if (segmentIntersectsPolygon(a[0], a[1], c[0], c[1], pand)) {
            veilig = false;
            break;
          }
        }
        if (veilig) {
          verwijderd = true;
          continue; // b overslaan
        }
      }
      volgende.push(b);
    }
    volgende.push(huidige[huidige.length - 1]);
    huidige = volgende;
    if (!verwijderd) break;
  }
  return huidige;
}

/** Douglas-Peucker met kleine tolerantie: haalt micro-ruis uit BGT-lijnen. */
function simplifyLine(line: [number, number][], toleranceM = 1.5): [number, number][] {
  if (line.length < 3) return line;
  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = true;
  keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];

  while (stack.length) {
    const [start, eind] = stack.pop()!;
    let maxD = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < eind; i++) {
      const d = afstandTotSegment(
        line[i][0],
        line[i][1],
        line[start][0],
        line[start][1],
        line[eind][0],
        line[eind][1]
      );
      if (d > maxD) {
        maxD = d;
        maxIdx = i;
      }
    }
    if (maxD > toleranceM && maxIdx > 0) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, eind]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

function gladdeRoute(
  line: [number, number][],
  ctx: RoutingContext
): [number, number][] {
  const zonderSpikes = verwijderSpikes(line, ctx.pandPolygonen);
  const vereenvoudigd = simplifyLine(zonderSpikes, 2.5);
  // Harde eis: vereenvoudiging mag nooit een hoek door een pand afsnijden —
  // anders de niet-vereenvoudigde (pand-veilige) lijn aanhouden
  return routeCrossesBuildings(vereenvoudigd, ctx.pandPolygonen)
    ? zonderSpikes
    : vereenvoudigd;
}

function routeCrossesBuildings(
  line: [number, number][],
  pandPolygonen: [number, number][][]
): boolean {
  if (pandPolygonen.length === 0 || line.length < 2) return false;
  // Echte segment-polygoon-intersectie: ook hoeken van panden tellen als doorsnijding
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const minX = Math.min(x1, x2) - 50;
    const maxX = Math.max(x1, x2) + 50;
    const minY = Math.min(y1, y2) - 50;
    const maxY = Math.max(y1, y2) + 50;
    for (const pand of pandPolygonen) {
      let inBbox = false;
      for (const [px, py] of pand) {
        if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
          inBbox = true;
          break;
        }
      }
      if (!inBbox) continue;
      if (segmentIntersectsPolygon(x1, y1, x2, y2, pand)) return true;
    }
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
  const built = buildRouteFromPath(graph, path, false, ctx);
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
    centerline: densifyLine(gladdeRoute(mergedLine, ctx)),
    roadNaam,
    fallback: false,
    nodePath,
  };
}

function buildRouteFromPath(
  graph: RoadGraph,
  path: number[],
  fallback: boolean,
  ctx: RoutingContext
): {
  centerline: [number, number][];
  roadNaam: string;
  fallback: boolean;
  nodePath: number[];
} {
  const centerline = densifyLine(gladdeRoute(pathToCenterline(graph, path), ctx));
  const edgeRoads = new Map<string, number>();
  for (let i = 1; i < path.length; i++) {
    const fromId = path[i - 1];
    const toId = path[i];
    const adj = graph.adjacency.get(fromId)?.find((n) => n.to === toId);
    const edge = adj ? graph.edges[adj.edgeIdx] : undefined;
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

/** Hoek tussen twee segmentrichtingen in graden (0–90). */
function kruisingshoekDeg(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
): number {
  const v1x = a2[0] - a1[0];
  const v1y = a2[1] - a1[1];
  const v2x = b2[0] - b1[0];
  const v2y = b2[1] - b1[1];
  const l1 = Math.hypot(v1x, v1y);
  const l2 = Math.hypot(v2x, v2y);
  if (l1 === 0 || l2 === 0) return 0;
  const cos = Math.abs((v1x * v2x + v1y * v2y) / (l1 * l2));
  return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
}

/**
 * Echt snijpunt tussen de route en een andere lijn. Alleen transversale
 * kruisingen tellen: voldoende hoek en het snijpunt in het inwendige van het
 * routesegment (zo telt parallel volgen of afslaan op een kruispunt niet mee).
 */
function vindKruisingspunt(
  line: [number, number][],
  other: [number, number][],
  minHoekDeg: number,
  interieurMarge: number
): [number, number] | null {
  for (let i = 1; i < line.length; i++) {
    const a1 = line[i - 1];
    const a2 = line[i];
    for (let j = 1; j < other.length; j++) {
      const pt = segmentsIntersect(a1, a2, other[j - 1], other[j]);
      if (!pt) continue;
      const segLen = dist(a1, a2);
      if (segLen === 0) continue;
      const t = dist(a1, pt) / segLen;
      if (t < interieurMarge || t > 1 - interieurMarge) continue;
      if (kruisingshoekDeg(a1, a2, other[j - 1], other[j]) < minHoekDeg) continue;
      return pt;
    }
  }
  return null;
}

function besluitNaarCrossing(
  type: RouteCrossing['type'],
  naam: string,
  besluit: KruisingsBesluit,
  punt: [number, number],
  breedteM?: number
): RouteCrossing {
  return {
    type,
    naam,
    breedteM,
    legtechniek: besluit.legtechniek,
    normReferentie: besluit.normReferentie,
    methode: besluit.methode,
    methodeLabel: besluit.methodeLabel,
    beheerder: besluit.beheerder,
    vergunning: besluit.vergunning,
    afweging: besluit.afweging,
    x: Math.round(punt[0] * 10) / 10,
    y: Math.round(punt[1] * 10) / 10,
  };
}

export function detectCrossings(
  line: [number, number][],
  ctx: RoutingContext,
  volgWegNaam?: string
): RouteCrossing[] {
  const crossings: RouteCrossing[] = [];
  const gezien = new Set<string>();

  // Watergangen: echte doorsnijding van de waterlijn (afweging per breedte)
  for (const water of ctx.watergangen) {
    if (water.coordinates.length < 2) continue;
    const punt = vindKruisingspunt(line, water.coordinates, 20, 0.02);
    if (!punt) continue;
    const key = `water:${water.naam}`;
    if (gezien.has(key)) continue;
    gezien.add(key);

    // Echte breedte uit het BGT-waterdeel; zonder breedte een conservatieve
    // middencategorie (de oude bbox-schatting verwarde lengte met breedte)
    const breedte = water.breedteM ?? 6;
    const besluit = beoordeelWaterkruising(breedte, ctx.discipline);
    if (water.breedteM === undefined) {
      besluit.afweging.push('Breedte onbekend — aanname 6 m, verifiëren bij waterschap (legger)');
    }
    crossings.push(besluitNaarCrossing('water', water.naam, besluit, punt, Math.round(breedte)));
  }

  // Wegen: transversale doorsnijding van een andere weg dan de gevolgde corridor
  for (const weg of ctx.roadCenterlines) {
    if (weg.centerline.length < 2) continue;
    if (volgWegNaam && weg.naam === volgWegNaam) continue;
    const punt = vindKruisingspunt(line, weg.centerline, 45, 0.15);
    if (!punt) continue;
    const key = `weg:${weg.naam}`;
    if (gezien.has(key)) continue;
    gezien.add(key);
    const besluit = beoordeelWegkruising(weg.type, weg.naam, ctx.discipline);
    crossings.push(besluitNaarCrossing('weg', weg.naam, besluit, punt));
  }

  // Belemmeringen: spoor (ProRail) en wegen uit de belemmeringenlaag
  for (const bel of ctx.belemmeringen) {
    if (bel.coordinates.length < 2) continue;
    if (bel.categorie === 'spoor') {
      const punt = vindKruisingspunt(line, bel.coordinates, 30, 0.05);
      if (!punt) continue;
      const key = `spoor:${bel.naam ?? bel.id}`;
      if (gezien.has(key)) continue;
      gezien.add(key);
      const besluit = beoordeelSpoorkruising(ctx.discipline);
      crossings.push(besluitNaarCrossing('spoor', bel.naam ?? bel.id, besluit, punt));
    } else if (bel.categorie === 'weg') {
      const punt = vindKruisingspunt(line, bel.coordinates, 45, 0.15);
      if (!punt) continue;
      const naam = bel.naam ?? bel.id;
      const key = `weg:${naam}`;
      if (gezien.has(key) || (volgWegNaam && naam === volgWegNaam)) continue;
      gezien.add(key);
      const besluit = beoordeelWegkruising('gemeenteweg', naam, ctx.discipline);
      crossings.push(besluitNaarCrossing('weg', naam, besluit, punt));
    }
  }

  return crossings;
}

/** Tel route-punten nabij bomen (kritieke zone en wortelzone). */
function toetsBoomAfstand(
  line: [number, number][],
  bomen: RoutingContext['bomen']
): { kritiek: number; wortelzone: number } {
  let kritiek = 0;
  let wortelzone = 0;
  if (!bomen?.length) return { kritiek, wortelzone };

  const geteld = new Set<number>();
  for (const [x, y] of line) {
    for (let b = 0; b < bomen.length; b++) {
      if (geteld.has(b)) continue;
      const d = Math.hypot(bomen[b].x - x, bomen[b].y - y);
      if (d <= BOOM_KRITIEK_M) {
        kritiek++;
        geteld.add(b);
      } else if (d <= BOOM_WORTELZONE_M) {
        wortelzone++;
        geteld.add(b);
      }
    }
  }
  return { kritiek, wortelzone };
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
  const { gemeente } = getGebiedProfiel(ctx.projectId);
  const avoi = getAvoiForGemeente(gemeente);
  const ontwerp = ontwerpEisVoorDiscipline(avoi, ctx.discipline);

  const opmerkingen: string[] = [];
  const afwijkingen: string[] = [];
  let score = 85;
  let zakelijkRechtVereist = false;

  // Voorkeursligging: AVOI-offset naast de weg (berm). Lukt dat niet door
  // bebouwing, dan op de hartlijn van het wegprofiel — gemotiveerde afwijking.
  let offsetLine = offsetPointAlongLine(centerline, ctx.offsetM);
  if (routeCrossesBuildings(offsetLine, ctx.pandPolygonen)) {
    offsetLine = centerline;
    afwijkingen.push(
      `AVOI-bermligging (${zoneLabel(ontwerp.zone)}, offset ${ctx.offsetM} m) plaatselijk niet haalbaar — ` +
        'ligging op hartlijn wegprofiel; reden: bebouwing direct langs de weg'
    );
  } else {
    opmerkingen.push(`Ligging conform AVOI: ${zoneLabel(ontwerp.zone)} naast de weg`);
  }

  const lengteM = Math.round(traceLengthM(offsetLine.map(([x, y]) => [x, y, ctx.diepteNap])));
  const crossings = detectCrossings(offsetLine, ctx, roadNaam);
  const legtechniek = kiesLegtechniek(crossings, ctx, fallback);

  if (fallback) {
    score -= 25;
    opmerkingen.push('Geen wegennet gevonden — directe verbinding gebruikt');
    afwijkingen.push('Wegvolgende ligging niet mogelijk: geen wegennet in dit gebied — directe lijn toegepast');
  } else {
    opmerkingen.push(`Tracé volgt ${roadNaam}`);
  }

  opmerkingen.push(`AVOI ${gemeente}: ${zoneLabel(ontwerp.zone)} (${ontwerp.leglocatieHint})`);

  // Risicozones uit de datalagen: doorkruising = gemotiveerde afwijking + maatregel
  const zoneLabels: Record<string, string> = {
    bodem: 'bodemverontreiniging',
    natura2000: 'Natura 2000-gebied',
    archeologie: 'archeologische verwachtingszone',
    nge: 'NGE-verdacht gebied',
    flora_fauna: 'flora- en faunagebied',
  };
  const doorkruist = new Set<string>();
  for (const zone of ctx.risicoZones) {
    if (zone.polygon.length < 4 || doorkruist.has(`${zone.type}:${zone.naam}`)) continue;
    let raakt = false;
    for (const [x, y] of offsetLine) {
      if (pointInPolygon(x, y, zone.polygon)) {
        raakt = true;
        break;
      }
    }
    if (!raakt) continue;
    doorkruist.add(`${zone.type}:${zone.naam}`);
    score -= zone.ernst === 'hoog' ? 12 : zone.ernst === 'middel' ? 7 : 3;
    afwijkingen.push(
      `Doorkruist ${zoneLabels[zone.type] ?? zone.type} "${zone.naam}" (risico ${zone.ernst}) — ` +
        `geen omleiding binnen de corridor zonder grotere bezwaren; maatregel: ${zone.maatregel}`
    );
  }

  // Dekkingseis: AVOI/netbeheerder kan strenger zijn dan de projectinput
  if (ontwerp.minDekkingM > ctx.vereisteDekking) {
    opmerkingen.push(
      `Let op: AVOI ${gemeente} vereist min. ${ontwerp.minDekkingM} m dekking (project: ${ctx.vereisteDekking} m)`
    );
    score -= 5;
  }

  // Geleerde voorkeur: ligt het tracé grotendeels langs een referentieontwerp?
  if (ctx.referentieTraces.length > 0 && offsetLine.length > 1) {
    let nabij = 0;
    for (const [x, y] of offsetLine) {
      for (const ref of ctx.referentieTraces) {
        let min = Infinity;
        for (let i = 1; i < ref.length; i++) {
          min = Math.min(min, afstandTotSegment(x, y, ref[i - 1][0], ref[i - 1][1], ref[i][0], ref[i][1]));
          if (min < 20) break;
        }
        if (min < 20) {
          nabij++;
          break;
        }
      }
    }
    if (nabij / offsetLine.length > 0.5) {
      opmerkingen.push('Tracé volgt geüpload referentieontwerp (geleerde voorkeurscorridor)');
      score += 5;
    }
  }

  // Boomafstand (bomenverordening gemeente / eisen netbeheerder)
  const boomToets = toetsBoomAfstand(offsetLine, ctx.bomen);
  if (boomToets.kritiek > 0) {
    score -= 15;
    opmerkingen.push(
      `${boomToets.kritiek} boom/bomen binnen ${BOOM_KRITIEK_M} m van het tracé — verleggen of groeiplaatsonderzoek vereist (bomenverordening)`
    );
    afwijkingen.push(
      `Minimale boomafstand (${BOOM_KRITIEK_M} m) plaatselijk niet haalbaar bij ${boomToets.kritiek} boom/bomen — ` +
        'geen alternatieve ligging zonder grotere bezwaren; maatregel: groeiplaatsonderzoek + handmatig graven'
    );
  } else if (boomToets.wortelzone > 0) {
    score -= 5;
    opmerkingen.push(
      `${boomToets.wortelzone} boom/bomen in wortelzone (<${BOOM_WORTELZONE_M} m) — handmatig graven met boombescherming (Handboek Bomen/CROW 500)`
    );
  }

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
    afwijkingen.push(
      'Ligging deels over privaat terrein — geen openbare corridor beschikbaar; ' +
        'maatregel: zakelijk recht (opstalrecht) overeenkomen met eigenaar'
    );
  }

  if (crossings.length) {
    opmerkingen.push(
      `${crossings.length} kruising(en): ${crossings
        .map((k) => `${k.naam} — ${k.methodeLabel ?? k.legtechniek.replace(/_/g, ' ')}`)
        .join(', ')}`
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
    afwijkingen: [...new Set(afwijkingen)],
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

/** Dichtstbijzijnde punt op een polyline t.o.v. (px,py). */
function projecteerPuntOpLijn(
  line: [number, number][],
  px: number,
  py: number
): { i: number; pt: [number, number]; d: number } {
  let best: { i: number; pt: [number, number]; d: number } = { i: 1, pt: line[0], d: Infinity };
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1];
    const [x2, y2] = line[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l = dx * dx + dy * dy;
    const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l));
    const qx = x1 + t * dx;
    const qy = y1 + t * dy;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best.d) best = { i, pt: [qx, qy], d };
  }
  return best;
}

function dedupeOpeenvolgend(line: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of line) {
    const last = out[out.length - 1];
    if (!last || dist(last, p) > 0.05) out.push(p);
  }
  return out;
}

/**
 * Hecht het werkelijke waypoint aan het tracé-uiteinde zodat het tracé begint/
 * eindigt waar de gebruiker klikte (i.p.v. op de gesnapte wegknoop, die tot
 * tientallen meters kan afwijken en zelfs een terugloop veroorzaakt). De
 * "terugloop" vóór/na het dichtstbijzijnde routepunt wordt getrimd. Alleen
 * uitgevoerd als de verbindende stub bebouwingsvrij is.
 */
function lijnRaaktPand(line: [number, number][], panden: [number, number][][]): boolean {
  for (let i = 1; i < line.length; i++) {
    if (segmentRaaktPand(line[i - 1], line[i], panden)) return true;
  }
  return false;
}

function hechtWaypointAanUiteinde(
  line: [number, number][],
  wp: [number, number],
  panden: [number, number][][],
  kant: 'start' | 'eind'
): [number, number][] {
  if (line.length < 2) return line;
  const uiteinde = kant === 'start' ? line[0] : line[line.length - 1];
  if (dist(uiteinde, wp) < 1) return line; // al op het waypoint
  const proj = projecteerPuntOpLijn(line, wp[0], wp[1]);

  // Verbindingsstub van het waypoint naar het dichtstbijzijnde routepunt; loopt
  // hij door bebouwing, dan eromheen leiden. Lukt dat niet bebouwingsvrij, dan
  // de gesnapte ligging behouden (liever overshoot dan door een pand).
  const stub =
    kant === 'start'
      ? omleidPanden([wp, proj.pt], panden)
      : omleidPanden([proj.pt, wp], panden);
  if (lijnRaaktPand(stub, panden)) return line;

  const out: [number, number][] =
    kant === 'start'
      ? [...stub, ...line.slice(proj.i)]
      : [...line.slice(0, proj.i), ...stub];
  return dedupeOpeenvolgend(out);
}

/** Hecht start/eind-waypoints aan de eerste/laatste lijn van een 3D-tracé. */
function hechtUiteindenAan(
  traceLines: [number, number, number][][],
  rawStart: [number, number] | undefined,
  rawEnd: [number, number] | undefined,
  ctx: RoutingContext
): [number, number, number][][] {
  if (traceLines.length === 0) return traceLines;
  const result = traceLines.map((l) => l.slice());
  const naar3d = (l2d: [number, number][]): [number, number, number][] =>
    l2d.map(([x, y]) => [x, y, ctx.diepteNap]);

  if (rawStart) {
    const eerste = result[0].map(([x, y]) => [x, y] as [number, number]);
    result[0] = naar3d(hechtWaypointAanUiteinde(eerste, rawStart, ctx.pandPolygonen, 'start'));
  }
  if (rawEnd) {
    const idx = result.length - 1;
    const laatste = result[idx].map(([x, y]) => [x, y] as [number, number]);
    result[idx] = naar3d(hechtWaypointAanUiteinde(laatste, rawEnd, ctx.pandPolygonen, 'eind'));
  }
  return result;
}

function buildSingleRoute(
  graph: RoadGraph,
  ctx: RoutingContext,
  input: TraceRoutingInput,
  spec: (typeof ALTERNATIVE_PROFILES)[number],
  edgePenalty: Map<string, number>,
  rawStart?: [number, number],
  rawEnd?: [number, number]
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

  // Tracé laten beginnen/eindigen op het werkelijke waypoint (geen gesnapte
  // wegknoop-overshoot of terugloop) — mits de aansluitstub bebouwingsvrij is.
  const verbondenLines = hechtUiteindenAan(traceLines, rawStart, rawEnd, ctx);
  traceLines.length = 0;
  traceLines.push(...verbondenLines);

  // Eindgeometrie-hervalidatie: de daadwerkelijk opgeslagen lijnen (na gladde
  // route, offset én densificatie) mogen nooit door bebouwing lopen. De strikte
  // bouwer faalt liever dan stilzwijgend te kruisen — de best-effort bouwer vangt
  // deze gevallen op met expliciete markering.
  for (const line of traceLines) {
    if (routeCrossesBuildings(line.map(([x, y]) => [x, y]), ctx.pandPolygonen)) {
      return null;
    }
  }

  const coordinates = traceLines.flat();
  const totaleLengteM = Math.round(traceLengthM(coordinates, traceLines));
  const score =
    segmenten.length > 0
      ? Math.round(segmenten.reduce((s, seg) => s + seg.score, 0) / segmenten.length)
      : 0;

  addPathPenalties(edgePenalty, allEdgeKeys, 5);

  // Bij onzekere panddekking is een schone route niet hard te garanderen
  if (ctx.panddekkingOnzeker) waarschuwingen.push(PANDDEKKING_WAARSCHUWING);

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
    panddekkingOnzeker: ctx.panddekkingOnzeker,
    zroOverzicht: computeZroOverzicht(traceLines, ctx),
  };
}

// ----------------------------------------------------------------------------
// Best-effort routering: alleen wanneer er géén bebouwingsvrije wegroute bestaat.
// Levert wél een tracé maar markeert expliciet de delen door bebouwing/privaat
// als "handmatig oplossen" — niet stil falen, niet stil kruisen.
// ----------------------------------------------------------------------------

/** Marge die rond bebouwing wordt aangehouden bij een lokale omleiding. */
const OMLEIDING_MARGE_M = 1.5;

const MARKER_PRIORITEIT: Record<SegmentMarker, number> = {
  door_bebouwing: 2,
  door_privaat: 1,
  ok: 0,
};

function ergsteMarker(segments: MarkedSegment[]): SegmentMarker {
  let worst: SegmentMarker = 'ok';
  for (const s of segments) {
    if (MARKER_PRIORITEIT[s.marker] > MARKER_PRIORITEIT[worst]) worst = s.marker;
  }
  return worst;
}

function markerLabel(marker: SegmentMarker): string {
  if (marker === 'door_bebouwing') return 'loopt door bebouwing';
  if (marker === 'door_privaat') return 'loopt door particulier perceel';
  return 'vrije ligging';
}

/** Classificeer één subsegment: bebouwing > particulier perceel > vrij. */
function classificeerSub(
  a: [number, number],
  b: [number, number],
  ctx: RoutingContext
): { marker: SegmentMarker; toelichting?: string } {
  for (const pand of ctx.pandPolygonen) {
    if (segmentIntersectsPolygon(a[0], a[1], b[0], b[1], pand)) {
      return { marker: 'door_bebouwing', toelichting: 'bebouwing' };
    }
  }
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  for (const perceel of ctx.percelen) {
    if (!perceel.publiek && pointInPolygon(mx, my, perceel.polygon)) {
      return { marker: 'door_privaat', toelichting: perceel.perceelnummer };
    }
  }
  return { marker: 'ok' };
}

/**
 * Deel de (gedensificeerde) geometrie op in aaneengesloten runs met dezelfde
 * markering. Elke run wordt een {@link MarkedSegment} met 3D-coördinaten.
 */
function markGeometry(
  line2d: [number, number][],
  ctx: RoutingContext,
  diepteNap: number
): MarkedSegment[] {
  const pts = densifyLine(line2d);
  if (pts.length < 2) return [];
  const subMarkers: { marker: SegmentMarker; toelichting?: string }[] = [];
  for (let i = 1; i < pts.length; i++) {
    subMarkers.push(classificeerSub(pts[i - 1], pts[i], ctx));
  }

  const buildRun = (segStart: number, segEnd: number): MarkedSegment => {
    const coords = pts.slice(segStart, segEnd + 1);
    let lengteM = 0;
    for (let i = 1; i < coords.length; i++) lengteM += dist(coords[i - 1], coords[i]);
    const toelichting = subMarkers
      .slice(segStart, segEnd)
      .map((m) => m.toelichting)
      .find(Boolean);
    return {
      marker: subMarkers[segStart].marker,
      coordinates: coords.map(([x, y]) => [x, y, diepteNap] as [number, number, number]),
      lengteM: Math.round(lengteM),
      toelichting,
    };
  };

  const runs: MarkedSegment[] = [];
  let runStart = 0;
  for (let i = 1; i < subMarkers.length; i++) {
    if (subMarkers[i].marker !== subMarkers[runStart].marker) {
      runs.push(buildRun(runStart, i));
      runStart = i;
    }
  }
  runs.push(buildRun(runStart, subMarkers.length));
  return runs;
}

function segmentRaaktPand(
  a: [number, number],
  b: [number, number],
  pandPolygonen: [number, number][][]
): boolean {
  for (const pand of pandPolygonen) {
    if (segmentIntersectsPolygon(a[0], a[1], b[0], b[1], pand)) return true;
  }
  return false;
}

function polygonCentroid(poly: [number, number][]): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  return [sx / poly.length, sy / poly.length];
}

/** Hoekpunt naar buiten verschoven (weg van het zwaartepunt) met een veiligheidsmarge. */
function gebufferdeHoek(
  hoek: [number, number],
  centroid: [number, number],
  marge: number
): [number, number] {
  const dx = hoek[0] - centroid[0];
  const dy = hoek[1] - centroid[1];
  const len = Math.hypot(dx, dy) || 1;
  return [hoek[0] + (dx / len) * marge, hoek[1] + (dy / len) * marge];
}

function pandBboxArr(p: [number, number][]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of p) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** Panden waarvan de bbox binnen `marge` van het segment-bbox ligt. */
function pandenNabijSegment(
  a: [number, number],
  b: [number, number],
  panden: [number, number][][],
  marge = 40
): [number, number][][] {
  const sMinX = Math.min(a[0], b[0]) - marge;
  const sMaxX = Math.max(a[0], b[0]) + marge;
  const sMinY = Math.min(a[1], b[1]) - marge;
  const sMaxY = Math.max(a[1], b[1]) + marge;
  const out: [number, number][][] = [];
  for (const p of panden) {
    const [minX, minY, maxX, maxY] = pandBboxArr(p);
    if (maxX < sMinX || minX > sMaxX || maxY < sMinY || minY > sMaxY) continue;
    out.push(p);
  }
  return out;
}

/** Naar buiten gebufferde rand van een pand (sluitend dubbelpunt verwijderd). */
function gebufferdeRand(pand: [number, number][], marge: number): [number, number][] {
  const ring = pand.slice();
  if (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring.pop();
  }
  const c = polygonCentroid(ring);
  return ring.map((v) => gebufferdeHoek(v, c, marge));
}

/**
 * Omleiding rond één pand: loopt langs de gebufferde rand (beide richtingen,
 * elk startpunt) en kiest de kortste route a→rand→b die geen enkel nabij pand
 * raakt. Geeft de tussenpunten terug (zonder a/b) of null als er geen
 * bebouwingsvrije omweg bestaat.
 */
function detourRondPand(
  a: [number, number],
  b: [number, number],
  ring: [number, number][],
  nabijePanden: [number, number][][]
): [number, number][] | null {
  const n = ring.length;
  if (n < 3) return null;
  const vrij = (p1: [number, number], p2: [number, number]) =>
    !segmentRaaktPand(p1, p2, nabijePanden);

  let beste: { punten: [number, number][]; len: number } | null = null;
  for (const dir of [1, -1]) {
    for (let i = 0; i < n; i++) {
      if (!vrij(a, ring[i])) continue;
      const seq: [number, number][] = [];
      for (let k = 0; k < n; k++) {
        const idx = (((i + dir * k) % n) + n) % n;
        const v = ring[idx];
        if (seq.length && !vrij(seq[seq.length - 1], v)) break;
        seq.push(v);
        if (vrij(v, b)) {
          let len = dist(a, seq[0]);
          for (let s = 1; s < seq.length; s++) len += dist(seq[s - 1], seq[s]);
          len += dist(seq[seq.length - 1], b);
          if (!beste || len < beste.len) beste = { punten: seq.slice(), len };
          break; // kortste uitgang voor deze ingang/richting
        }
      }
    }
  }
  return beste?.punten ?? null;
}

/**
 * Leidt een lijn lokaal om blokkerende panden heen (langs de pandrand). Per
 * kruisend segment wordt het eerste blokkerende pand omzeild; lukt dat niet
 * bebouwingsvrij, dan blijft het segment staan (en wordt later gemarkeerd).
 */
function omleidPanden(
  line2d: [number, number][],
  pandPolygonen: [number, number][][]
): [number, number][] {
  if (line2d.length < 2 || pandPolygonen.length === 0) return line2d;
  const out: [number, number][] = [line2d[0]];

  for (let i = 1; i < line2d.length; i++) {
    const a = out[out.length - 1];
    const b = line2d[i];
    if (!segmentRaaktPand(a, b, pandPolygonen)) {
      out.push(b);
      continue;
    }

    const nabije = pandenNabijSegment(a, b, pandPolygonen);
    const blok = nabije.find((p) => segmentIntersectsPolygon(a[0], a[1], b[0], b[1], p));
    if (!blok) {
      out.push(b);
      continue;
    }

    const ring = gebufferdeRand(blok, OMLEIDING_MARGE_M);
    const detour = detourRondPand(a, b, ring, nabije);
    if (detour) out.push(...detour);
    out.push(b);
  }

  return out;
}

function routeBestEffortSegment(
  graph: RoadGraph,
  ctx: RoutingContext,
  from: TraceWaypoint,
  to: TraceWaypoint,
  astarOptions: AStarOptions
): { centerline: [number, number][]; roadNaam: string; fallback: boolean } {
  const snapDist = snapDistanceForWaypoints(from, to);
  const startNode = resolveWaypointNode(graph, from.x, from.y, snapDist);
  const goalNode = resolveWaypointNode(graph, to.x, to.y, snapDist);
  if (startNode !== null && goalNode !== null) {
    const path = aStar(graph, startNode, goalNode, ctx, astarOptions);
    if (path && path.length >= 2) {
      const built = buildRouteFromPath(graph, path, false, ctx);
      if (built.centerline.length >= 2) {
        return { centerline: built.centerline, roadNaam: built.roadNaam, fallback: false };
      }
    }
  }
  // Geen wegverbinding: directe lijn als laatste redmiddel (wordt gemarkeerd)
  return {
    centerline: [
      [from.x, from.y],
      [to.x, to.y],
    ],
    roadNaam: 'Directe lijn',
    fallback: true,
  };
}

/**
 * Best-effort tracé: leunt op de bestaande router maar staat bebouwing toe met
 * een enorme straf, omzeilt panden lokaal waar mogelijk en markeert de rest.
 */
function buildBestEffortRoute(
  graph: RoadGraph,
  ctx: RoutingContext,
  input: TraceRoutingInput,
  rawStart?: [number, number],
  rawEnd?: [number, number]
): TraceRouteAlternative | null {
  const { waypoints } = input;
  const astarOptions: AStarOptions = { profile: 'avoid_private', allowPandTraversal: true };

  const traceLines: [number, number, number][][] = [];
  const segmenten: RouteSegmentAnalysis[] = [];
  const markedSegments: MarkedSegment[] = [];
  let wegBereikt = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const { centerline, roadNaam, fallback } = routeBestEffortSegment(
      graph,
      ctx,
      waypoints[i],
      waypoints[i + 1],
      astarOptions
    );
    if (centerline.length < 2) continue;
    if (!fallback) wegBereikt++;

    const omgeleid = omleidPanden(centerline, ctx.pandPolygonen);
    const marked = markGeometry(omgeleid, ctx, ctx.diepteNap);
    markedSegments.push(...marked);

    const line3d = densifyLine(omgeleid).map(
      ([x, y]) => [x, y, ctx.diepteNap] as [number, number, number]
    );
    if (line3d.length >= 2) traceLines.push(line3d);

    const segment = analyseSegment(omgeleid, roadNaam, ctx, i + 1, fallback);
    const worst = ergsteMarker(marked);
    segment.marker = worst;
    segment.handmatigOplossen = worst !== 'ok';
    segmenten.push(segment);
  }

  // Geen enkel segment bereikte het wegennet (waypoints te ver van wegen):
  // dat is een invoerprobleem, geen bebouwingsblokkade — laat de aanroeper
  // een nette "geen route"-melding tonen i.p.v. een kale rechte lijn.
  if (wegBereikt === 0) return null;
  if (!traceLines.some((line) => line.length >= 2)) return null;

  // Tracé op het werkelijke waypoint laten beginnen/eindigen (geen overshoot)
  const verbonden = hechtUiteindenAan(traceLines, rawStart, rawEnd, ctx);
  traceLines.length = 0;
  traceLines.push(...verbonden);

  const coordinates = traceLines.flat();
  const totaleLengteM = Math.round(traceLengthM(coordinates, traceLines));
  const score =
    segmenten.length > 0
      ? Math.round(segmenten.reduce((s, seg) => s + seg.score, 0) / segmenten.length)
      : 0;

  const probleemRuns = markedSegments.filter((m) => m.marker !== 'ok');
  const waarschuwingen: string[] = [
    'Geen volledig bebouwingsvrije route langs wegen gevonden — best-effort tracé; ' +
      'de gemarkeerde segmenten hieronder moeten handmatig worden opgelost',
  ];
  for (const run of probleemRuns) {
    waarschuwingen.push(
      `Handmatig oplossen: ${markerLabel(run.marker)}` +
        `${run.toelichting && run.marker === 'door_privaat' ? ` (${run.toelichting})` : ''} — ${run.lengteM} m`
    );
  }
  if (ctx.panddekkingOnzeker) waarschuwingen.push(PANDDEKKING_WAARSCHUWING);

  return {
    id: 'best-effort',
    label: 'Best-effort (handmatig oplossen)',
    beschrijving:
      'Geen schone wegroute mogelijk — delen door bebouwing/privaat zijn gemarkeerd',
    traceLines,
    coordinates,
    segmenten,
    totaleLengteM,
    score,
    waarschuwingen,
    blokkades: [],
    panddekkingOnzeker: ctx.panddekkingOnzeker,
    markedSegments,
    heeftHandmatigOpTeLossen: probleemRuns.length > 0,
    zroOverzicht: computeZroOverzicht(traceLines, ctx),
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

  // Werkelijke (ongesnapte) uiteinden zodat het tracé begint/eindigt waar de
  // gebruiker klikte i.p.v. op een gesnapte wegknoop tientallen meters verderop.
  const rawStart: [number, number] = [rawWaypoints[0].x, rawWaypoints[0].y];
  const rawEnd: [number, number] = [
    rawWaypoints[rawWaypoints.length - 1].x,
    rawWaypoints[rawWaypoints.length - 1].y,
  ];

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
    const route = buildSingleRoute(graph, ctx, inputWithSnapped, spec, edgePenalty, rawStart, rawEnd);
    if (!route) continue;
    if (alternatieven.some((existing) => routesAreSimilar(existing, route))) continue;
    alternatieven.push(route);
  }

  // Geen schone wegroute? Niet stil falen: lever een best-effort tracé met
  // expliciet gemarkeerde delen door bebouwing/privaat (handmatig oplossen).
  if (alternatieven.length === 0) {
    const bestEffort = buildBestEffortRoute(graph, ctx, inputWithSnapped, rawStart, rawEnd);
    if (bestEffort) {
      alternatieven.push(bestEffort);
    } else {
      return emptyRoutingResult({
        waarschuwingen: ['Geen route langs wegen gevonden tussen de waypoints'],
        blokkades: ['Geen verbinding in wegennet'],
        normReferenties: ctx.normReferenties,
        panddekkingOnzeker: ctx.panddekkingOnzeker,
      });
    }
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
  if (primary.heeftHandmatigOpTeLossen)
    samenvatting.push('LET OP: best-effort tracé — segmenten door bebouwing/privaat handmatig oplossen');
  if (ctx.panddekkingOnzeker) samenvatting.push(PANDDEKKING_WAARSCHUWING);
  const zroAantal = primary.zroOverzicht?.percelen.length ?? 0;
  if (zroAantal > 0)
    samenvatting.push(
      `ZRO-overzicht: ${zroAantal} particulier perceel/percelen doorkruist (${primary.zroOverzicht?.totaalPrivaatM ?? 0} m)`
    );

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
    panddekkingOnzeker: ctx.panddekkingOnzeker,
    markedSegments: primary.markedSegments,
    heeftHandmatigOpTeLossen: primary.heeftHandmatigOpTeLossen,
    zroOverzicht: primary.zroOverzicht,
  };
}

function normReferenties(input: TraceRoutingInput): string[] {
  return buildRoutingContext(input).normReferenties;
}

export { buildRoutingContext };
