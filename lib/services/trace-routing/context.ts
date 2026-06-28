import type { Discipline } from '@/lib/db/types';
import { pointInPolygon } from '@/lib/geo';
import { getAvoiForGemeente, type GemeenteAvoi } from '@/demo/avoi';
import { getGebiedProfiel } from '@/demo/reports/context';
import { DEMO_WEGEN } from '@/demo/roads';
import { DEMO_BELEMMERINGEN } from '@/demo/pdok';
import { DEMO_PERCELEN } from '@/demo/pdok';
import type { MapLayerData } from '@/components/trace-map';
import type { RisicoZone, RoutingContext, TraceRoutingInput, TraceWaypoint } from './types';
import { centerlineFromPolygon } from '@/lib/services/layer-derivation';
import { getDemoReferentieTraces } from '@/lib/db/demo-store';

const PUBLIEKE_PERCEEL_PREFIXEN = ['G-', 'NOP-G-', 'GEM-', 'WAT-'];

function polygonFromGeometry(geom: GeoJSON.Geometry): [number, number][] | null {
  if (geom.type === 'Polygon') {
    return geom.coordinates[0].map(([x, y]) => [x, y] as [number, number]);
  }
  if (geom.type === 'MultiPolygon' && geom.coordinates[0]?.[0]) {
    return geom.coordinates[0][0].map(([x, y]) => [x, y] as [number, number]);
  }
  return null;
}

function lineFromCoords(coords: [number, number][]): [number, number][] {
  return coords.filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
}

/** NWB-wegbeheerdersoort (R/P/G/W) naar herkenbaar wegtype voor kosten en kruisingstechniek */
function nwbWegtype(raw: string | undefined): string {
  switch ((raw ?? '').trim().toUpperCase()) {
    case 'R':
      return 'rijksweg';
    case 'P':
      return 'provincialeweg';
    case 'W':
      return 'waterschapsweg';
    case 'G':
      return 'gemeenteweg';
    default:
      return raw || 'weg';
  }
}

function isPubliekPerceel(perceelnummer: string): boolean {
  const upper = perceelnummer.toUpperCase();
  return PUBLIEKE_PERCEEL_PREFIXEN.some((p) => upper.includes(p)) || upper.includes('-G-');
}

export function normReferentiesVoorDiscipline(discipline: Discipline): string[] {
  switch (discipline) {
    case 'elektra_ls':
      return ['NEN 7171', 'NEN 1010', 'Liander Aansluitrichtlijn LS'];
    case 'elektra_ms':
      return ['NEN 7171', 'NEN-EN 50522', 'Liander MS-legvoorschriften'];
    case 'gas_ld':
      return ['NEN 7240', 'Gasunie richtlijn LD', 'Netbeheerder gas LD'];
    case 'gas_hd':
      return ['NEN 7240', 'Gasunie transportrichtlijn', 'GTS legvoorschriften'];
    case 'water':
      return ['NEN-EN 805', 'Vitens legvoorschriften', 'Evides legnormen'];
    case 'stations':
      return ['NEN 7171', 'Liander stationseisen'];
    default:
      return ['NEN 7171'];
  }
}

export function ontwerpEisVoorDiscipline(avoi: GemeenteAvoi, discipline: Discipline) {
  const eis = avoi.ontwerp[discipline];
  if (eis) return eis;
  const slot = avoi.ordening.find((o) => o.discipline === discipline);
  if (slot) {
    return {
      offsetM: slot.offsetM,
      minDekkingM: slot.minDekkingM,
      zone: slot.zone,
      leglocatieHint: slot.label,
    };
  }
  return {
    offsetM: -1.5,
    minDekkingM: 0.6,
    zone: 'berm_zuid' as const,
    leglocatieHint: 'Berm zuid',
  };
}

export function defaultDiepteNap(discipline: Discipline): number {
  switch (discipline) {
    case 'elektra_ls':
      return -0.65;
    case 'elektra_ms':
      return -1.0;
    case 'gas_ld':
      return -0.8;
    case 'gas_hd':
      return -1.2;
    case 'water':
      return -1.0;
    default:
      return -0.65;
  }
}

function lineIntersectsBbox(
  line: [number, number][],
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  margin = 100
): boolean {
  return line.some(
    ([x, y]) =>
      x >= bbox.minX - margin &&
      x <= bbox.maxX + margin &&
      y >= bbox.minY - margin &&
      y <= bbox.maxY + margin
  );
}

function waypointsSearchBbox(waypoints: TraceWaypoint[], padding = 400) {
  const xs = waypoints.map((w) => w.x);
  const ys = waypoints.map((w) => w.y);
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  };
}

export function buildRoutingContext(input: TraceRoutingInput): RoutingContext {
  const { projectId, discipline, vereisteDekking, layerData, bestaandNet, waypoints } = input;
  const searchBbox = waypoints.length >= 2 ? waypointsSearchBbox(waypoints) : null;
  const { gemeente } = getGebiedProfiel(projectId);
  const avoi = getAvoiForGemeente(gemeente);
  const ontwerp = ontwerpEisVoorDiscipline(avoi, discipline);

  const roadCenterlines: RoutingContext['roadCenterlines'] = [];
  const seenRoads = new Set<string>();

  for (const weg of layerData?.nwb ?? []) {
    const centerline = lineFromCoords(weg.coordinates);
    if (centerline.length < 2) continue;
    const key = `nwb-${weg.naam}-${centerline[0][0]}-${centerline[0][1]}`;
    if (seenRoads.has(key)) continue;
    seenRoads.add(key);
    roadCenterlines.push({
      id: key,
      naam: weg.naam,
      type: nwbWegtype(weg.type),
      centerline,
    });
  }

  for (const feature of layerData?.bgt ?? []) {
    if (feature.type !== 'weg') continue;
    const poly = polygonFromGeometry(feature.geometry);
    if (!poly) continue;
    const centerline = centerlineFromPolygon(poly);
    if (centerline.length < 2) continue;
    if (searchBbox && !lineIntersectsBbox(centerline, searchBbox)) continue;
    const key = `bgt-${feature.label}-${centerline[0][0]}-${centerline[0][1]}`;
    if (seenRoads.has(key)) continue;
    seenRoads.add(key);
    roadCenterlines.push({
      id: key,
      naam: feature.label || 'Wegdeel',
      type: 'gemeenteweg',
      centerline,
    });
  }

  for (const weg of DEMO_WEGEN) {
    if (searchBbox && !lineIntersectsBbox(weg.centerline, searchBbox)) continue;
    if (seenRoads.has(weg.id)) continue;
    seenRoads.add(weg.id);
    roadCenterlines.push({
      id: weg.id,
      naam: weg.naam,
      type: weg.type,
      centerline: weg.centerline,
    });
  }

  const pandPolygonen: [number, number][][] = [];
  const begroeidPolygonen: [number, number][][] = [];

  for (const feature of layerData?.bgt ?? []) {
    const poly = polygonFromGeometry(feature.geometry);
    if (!poly) continue;
    if (feature.type === 'pand') {
      // GEEN searchBbox-filter: de bebouwingsregel is hard en mag geen pand
      // missen. Een route die buiten de smalle waypoint-bbox uitwijkt verloor
      // anders zijn bescherming. Panden zijn al corridor-begrensd door de fetch.
      pandPolygonen.push(poly);
    } else if (
      feature.type.includes('begroeid') ||
      feature.label.toLowerCase().includes('boom') ||
      feature.label.toLowerCase().includes('bos')
    ) {
      begroeidPolygonen.push(poly);
    }
  }

  // Publiek/privaat-proxy voor live BRK-percelen: eigenaarschap is geen open
  // data, maar een perceel waar een wegcenterline doorheen loopt is vrijwel
  // altijd openbare ruimte (gemeente/provincie/waterschap). Wegpunten in een
  // grid zodat de toets per perceel alleen nabije punten raakt.
  const wegpuntGrid = new Map<string, [number, number][]>();
  const WEGPUNT_CEL = 100;
  for (const road of roadCenterlines) {
    for (const [x, y] of road.centerline) {
      const key = `${Math.floor(x / WEGPUNT_CEL)}:${Math.floor(y / WEGPUNT_CEL)}`;
      const cell = wegpuntGrid.get(key) ?? [];
      cell.push([x, y]);
      wegpuntGrid.set(key, cell);
    }
  }

  function bevatWeg(polygon: [number, number][]): boolean {
    if (polygon.length < 3) return false;
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
    for (let cx = Math.floor(minX / WEGPUNT_CEL); cx <= Math.floor(maxX / WEGPUNT_CEL); cx++) {
      for (let cy = Math.floor(minY / WEGPUNT_CEL); cy <= Math.floor(maxY / WEGPUNT_CEL); cy++) {
        for (const [x, y] of wegpuntGrid.get(`${cx}:${cy}`) ?? []) {
          if (x >= minX && x <= maxX && y >= minY && y <= maxY && pointInPolygon(x, y, polygon)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  const percelenFromLayer = (layerData?.percelen ?? []).map((p) => ({
    id: p.id,
    perceelnummer: p.perceelnummer,
    polygon: p.polygon,
    publiek: isPubliekPerceel(p.perceelnummer) || bevatWeg(p.polygon),
  }));

  const percelen =
    percelenFromLayer.length > 0
      ? percelenFromLayer
      : DEMO_PERCELEN.map((p) => ({
          id: p.id,
          perceelnummer: p.perceelnummer,
          polygon: p.polygon,
          publiek: isPubliekPerceel(p.perceelnummer),
        }));

  const watergangen = (layerData?.watergangen ?? []).map((w) => ({
    naam: w.naam,
    coordinates: lineFromCoords(w.coordinates),
    breedteM: w.breedteM,
  }));

  const bomen = (layerData?.bomen ?? [])
    .filter(
      (b) =>
        Number.isFinite(b.x) &&
        Number.isFinite(b.y) &&
        (!searchBbox ||
          (b.x >= searchBbox.minX - 25 &&
            b.x <= searchBbox.maxX + 25 &&
            b.y >= searchBbox.minY - 25 &&
            b.y <= searchBbox.maxY + 25))
    )
    .map((b) => ({ x: b.x, y: b.y }));

  // Risicozones uit de datalagen: vermijden waar mogelijk, anders gemotiveerd afwijken
  const risicoZones: RisicoZone[] = [];

  for (const gebied of layerData?.natura2000 ?? []) {
    if (gebied.polygon.length < 4) continue;
    risicoZones.push({
      type: 'natura2000',
      naam: gebied.naam,
      polygon: gebied.polygon,
      ernst: 'hoog',
      maatregel: 'Wnb-toets en AERIUS-berekening; werken buiten broedseizoen (flora & fauna)',
    });
  }

  function vlekRond(x: number, y: number, straalM: number): [number, number][] {
    const ring: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const hoek = (i / 16) * 2 * Math.PI;
      ring.push([x + Math.cos(hoek) * straalM, y + Math.sin(hoek) * straalM]);
    }
    return ring;
  }

  for (const loc of layerData?.vervuildeGrond ?? []) {
    const polygon =
      loc.polygon && loc.polygon.length >= 4
        ? loc.polygon
        : loc.x !== undefined && loc.y !== undefined
          ? vlekRond(loc.x, loc.y, 30)
          : null;
    if (!polygon) continue;
    const klasse = (loc.risicoklasse ?? '').toLowerCase();
    const ernst: RisicoZone['ernst'] =
      klasse.includes('hoog') ? 'hoog' : klasse.includes('laag') ? 'laag' : 'middel';
    risicoZones.push({
      type: 'bodem',
      naam: loc.naam || 'Verontreinigingslocatie',
      polygon,
      ernst,
      maatregel: 'Verkennend bodemonderzoek (NEN 5740); veiligheidsklasse CROW 400',
    });
  }

  const belemmeringenRaw = layerData?.belemmeringen ?? DEMO_BELEMMERINGEN;
  const belemmeringen = belemmeringenRaw
    .filter((b) => b.coordinates.length >= 2)
    .map((b) => ({
      id: b.id,
      categorie: b.categorie,
      naam: 'naam' in b ? (b as { naam?: string }).naam : undefined,
      coordinates: b.coordinates,
    }));

  return {
    discipline,
    projectId,
    gemeente,
    vereisteDekking,
    offsetM: ontwerp.offsetM,
    diepteNap: defaultDiepteNap(discipline),
    normReferenties: [
      ...normReferentiesVoorDiscipline(discipline),
      `AVOI ${gemeente} (${avoi.versie})`,
      'WIBON/KLIC · CROW 500 (zorgvuldig grondroeren)',
    ],
    roadCenterlines,
    pandPolygonen,
    begroeidPolygonen,
    percelen,
    watergangen,
    belemmeringen,
    bestaandNet,
    bomen,
    // Geleerde voorkeurscorridors uit geüploade referentieontwerpen (alleen nabij het zoekgebied)
    referentieTraces: getDemoReferentieTraces()
      .map((r) => r.coordinates)
      .filter((line) => !searchBbox || lineIntersectsBbox(line, searchBbox)),
    risicoZones,
    panddekkingOnzeker: Boolean(layerData?.pandDekkingOnzeker),
  };
}
