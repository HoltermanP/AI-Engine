import type { MapLayerData } from '@/components/trace-map';
import type { BgtFeature } from '@/lib/connectors/pdok/bgt';
import { fetchPdokWfs, PDOK_WFS_PATHS } from '@/lib/connectors/pdok/wfs-client';
import { fetchPdokOgcFeatures, fetchAllPdokOgcFeatures } from '@/lib/connectors/pdok/ogc-client';
import type { BboxQuery } from '@/lib/connectors/types';
import { watergangenFromBgt } from '@/lib/services/layer-derivation';
import type { TraceWaypoint } from './types';

const ROUTING_PADDING_MIN_M = 400;
const ROUTING_PADDING_MAX_M = 900;
const BGT_ROUTING_MAX = 2000;
const NWB_ROUTING_LIMIT = 300;

function lineCoords(geom: GeoJSON.Geometry): [number, number][] {
  if (geom.type === 'LineString') {
    return geom.coordinates.map(([x, y]) => [x, y] as [number, number]);
  }
  if (geom.type === 'MultiLineString') {
    return geom.coordinates[0]?.map(([x, y]) => [x, y] as [number, number]) ?? [];
  }
  return [];
}

async function fetchLiveNwbForRouting(bbox: BboxQuery) {
  const fc = await fetchPdokWfs(PDOK_WFS_PATHS.nwbWegen, 'wegvakken', bbox, NWB_ROUTING_LIMIT);
  const wegvakken = fc.features
    .filter((f) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
    .map((f) => ({
      naam: (f.properties?.['sttNaam'] as string) ?? (f.properties?.['stt_naam'] as string) ?? 'Onbekend',
      type: (f.properties?.['wegbehsrt'] as string) ?? (f.properties?.['wegtype'] as string) ?? 'weg',
      coordinates: lineCoords(f.geometry!),
    }))
    .filter((w) => w.coordinates.length >= 2);
  if (wegvakken.length === 0) throw new Error('Geen NWB wegvakken in bbox');
  return { wegvakken, _source: 'live' as const };
}

async function fetchNwbForRouting(bbox: BboxQuery) {
  // Routing vereist actueel wegennet — probeer altijd live PDOK, ook in demo-modus
  try {
    return await fetchLiveNwbForRouting(bbox);
  } catch {
    // fallback demo
  }
  const { pdokNwbConnector } = await import('@/lib/connectors/pdok/nwb');
  return pdokNwbConnector.fetch(bbox);
}

function waypointsBbox(waypoints: TraceWaypoint[], padding: number): BboxQuery {
  const xs = waypoints.map((w) => w.x);
  const ys = waypoints.map((w) => w.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const pad = Math.max(ROUTING_PADDING_MIN_M, Math.min(ROUTING_PADDING_MAX_M, padding + span * 0.15));
  return {
    minX: Math.min(...xs) - pad,
    minY: Math.min(...ys) - pad,
    maxX: Math.max(...xs) + pad,
    maxY: Math.max(...ys) + pad,
  };
}

const BGT_TYPE_MAP: Record<string, string> = {
  wegdeel: 'weg',
  waterdeel: 'water',
  pand: 'pand',
};

function mapBgtRoutingFeature(f: GeoJSON.Feature, defaultType: string): BgtFeature {
  const functie = (f.properties?.['functie'] as string) ?? '';
  const voorkomen = (f.properties?.['fysiek_voorkomen'] as string) ?? '';
  const label = [functie, voorkomen].filter(Boolean).join(' · ') || 'BGT-object';
  const collection = (f.properties?.['bgt_type'] as string) ?? defaultType;
  const type = BGT_TYPE_MAP[collection] ?? collection;
  return {
    type,
    label,
    geometry: f.geometry!,
  };
}

async function fetchLiveBgtForRouting(bbox: BboxQuery): Promise<BgtFeature[]> {
  const [weg, water, pand] = await Promise.all([
    fetchAllPdokOgcFeatures('/lv/bgt/ogc/v1', 'wegdeel', bbox, 500, BGT_ROUTING_MAX),
    fetchAllPdokOgcFeatures('/lv/bgt/ogc/v1', 'waterdeel', bbox, 200, 400),
    fetchAllPdokOgcFeatures('/lv/bgt/ogc/v1', 'pand', bbox, 300, 800),
  ]);

  const features = [
    ...weg.map((f) => mapBgtRoutingFeature(f, 'weg')),
    ...water.map((f) => mapBgtRoutingFeature(f, 'water')),
    ...pand.map((f) => mapBgtRoutingFeature(f, 'pand')),
  ];
  const wegCount = features.filter((f) => f.type === 'weg').length;
  if (wegCount === 0) throw new Error('Geen BGT wegdelen in bbox');
  return features;
}

async function fetchBgtForRouting(bbox: BboxQuery): Promise<BgtFeature[]> {
  // Pand-polygonen zijn essentieel voor blokkade — altijd live PDOK proberen
  try {
    return await fetchLiveBgtForRouting(bbox);
  } catch {
    // fallback demo
  }
  const { pdokBgtConnector } = await import('@/lib/connectors/pdok/bgt');
  const result = await pdokBgtConnector.fetch(bbox);
  return result.features;
}

/** Haal NWB + BGT op voor het waypoint-gebied (server-side, onafhankelijk van kaartlagen-toggle). */
export async function fetchRoutingLayerData(
  waypoints: TraceWaypoint[]
): Promise<MapLayerData> {
  if (waypoints.length < 2) {
    return { coordinateSystem: 'EPSG:28992' };
  }

  const bbox = waypointsBbox(waypoints, ROUTING_PADDING_MIN_M);

  const [nwb, bgtFeatures] = await Promise.all([
    fetchNwbForRouting(bbox),
    fetchBgtForRouting(bbox),
  ]);

  const hasLiveBgt = bgtFeatures.some((f) => f.type === 'pand');
  const bgtSource = hasLiveBgt ? ('live' as const) : ('demo' as const);
  const watergangen = watergangenFromBgt(bbox, bgtFeatures, bgtSource);

  return {
    coordinateSystem: 'EPSG:28992',
    nwb: nwb.wegvakken.map((w) => ({
      naam: w.naam,
      type: w.type,
      coordinates: w.coordinates,
      _source: nwb._source,
    })),
    bgt: bgtFeatures,
    watergangen,
  };
}

export function mergeRoutingLayerData(
  client?: MapLayerData,
  fetched?: MapLayerData
): MapLayerData {
  if (!fetched && !client) return { coordinateSystem: 'EPSG:28992' };
  if (!fetched) return client ?? { coordinateSystem: 'EPSG:28992' };
  if (!client) return fetched;

  const preferNwb =
    (fetched.nwb?.length ?? 0) >= (client.nwb?.length ?? 0) ? fetched.nwb : client.nwb;
  const bgtKeys = new Set<string>();
  const dedupeBgt = (features: BgtFeature[]) =>
    features.filter((f) => {
      const key = `${f.type}-${f.label}-${JSON.stringify(f.geometry).slice(0, 80)}`;
      if (bgtKeys.has(key)) return false;
      bgtKeys.add(key);
      return true;
    });

  const fetchedBgt = fetched.bgt ?? [];
  const clientBgt = client.bgt ?? [];
  const fetchedPand = fetchedBgt.filter((f) => f.type === 'pand').length;
  const clientPand = clientBgt.filter((f) => f.type === 'pand').length;
  const bgt =
    clientPand > fetchedPand
      ? dedupeBgt([...clientBgt, ...fetchedBgt])
      : dedupeBgt([...fetchedBgt, ...clientBgt]);

  return {
    coordinateSystem: 'EPSG:28992',
    nwb: preferNwb,
    bgt,
    watergangen: (fetched.watergangen?.length ? fetched.watergangen : client.watergangen) ?? [],
    percelen: client.percelen,
    belemmeringen: client.belemmeringen,
  };
}
