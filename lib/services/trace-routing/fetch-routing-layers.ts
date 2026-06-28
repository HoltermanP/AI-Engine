import type { MapLayerData } from '@/components/trace-map';
import type { BgtFeature } from '@/lib/connectors/pdok/bgt';
import { fetchPdokWfsPaged, PDOK_WFS_PATHS } from '@/lib/connectors/pdok/wfs-client';
import { fetchAllPdokOgcFeatures } from '@/lib/connectors/pdok/ogc-client';
import type { BboxQuery } from '@/lib/connectors/types';
import { watergangenFromBgt } from '@/lib/services/layer-derivation';
import type { TraceWaypoint } from './types';

const ROUTING_PADDING_MIN_M = 400;
const ROUTING_PADDING_MAX_M = 900;
const NWB_ROUTING_MAX = 6000;

/** Corridor-tegels: per tegel ophalen zodat lange tracés niet tegen feature-caps lopen */
const TILE_STAP_M = 1100;
const TILE_PAD_M = 500;
const MAX_TILES = 10;
const PAND_PER_TILE = 2000;
const WEGDEEL_PER_TILE = 1500;
const WATERDEEL_PER_TILE = 400;

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
  const fc = await fetchPdokWfsPaged(
    PDOK_WFS_PATHS.nwbWegen,
    'wegvakken',
    bbox,
    NWB_ROUTING_MAX,
    1000
  );
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

/**
 * Tegels langs de waypoint-corridor. Eén grote bbox raakt bij lange tracés de
 * feature-caps van PDOK-paginatie — dan ontbreken panden en wegdelen en kan de
 * route door bebouwing lopen. Per tegel blijft de dichtheid behapbaar.
 */
function corridorTiles(waypoints: TraceWaypoint[]): BboxQuery[] {
  const punten: { x: number; y: number }[] = [];
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    const lengte = Math.hypot(b.x - a.x, b.y - a.y);
    const stappen = Math.max(1, Math.ceil(lengte / TILE_STAP_M));
    for (let s = 0; s <= stappen; s++) {
      const t = s / stappen;
      punten.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }

  // Dedupe punten die in dezelfde tegel vallen
  const tiles: BboxQuery[] = [];
  const seen = new Set<string>();
  for (const p of punten) {
    const key = `${Math.round(p.x / TILE_STAP_M)}:${Math.round(p.y / TILE_STAP_M)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tiles.push({
      minX: p.x - (TILE_STAP_M / 2 + TILE_PAD_M),
      minY: p.y - (TILE_STAP_M / 2 + TILE_PAD_M),
      maxX: p.x + (TILE_STAP_M / 2 + TILE_PAD_M),
      maxY: p.y + (TILE_STAP_M / 2 + TILE_PAD_M),
    });
  }

  if (tiles.length > MAX_TILES) {
    // Lange corridor: tegels uitdunnen maar begin en eind behouden
    const stap = (tiles.length - 1) / (MAX_TILES - 1);
    const dunner: BboxQuery[] = [];
    for (let i = 0; i < MAX_TILES; i++) {
      dunner.push(tiles[Math.round(i * stap)]);
    }
    return dunner;
  }
  return tiles;
}

function bgtFeatureKey(f: GeoJSON.Feature): string {
  const id = (f.properties?.['lokaal_id'] as string) ?? (f.id as string | undefined);
  if (id) return id;
  return JSON.stringify(f.geometry).slice(0, 120);
}

function splitTile(t: BboxQuery): BboxQuery[] {
  const mx = (t.minX + t.maxX) / 2;
  const my = (t.minY + t.maxY) / 2;
  return [
    { minX: t.minX, minY: t.minY, maxX: mx, maxY: my },
    { minX: mx, minY: t.minY, maxX: t.maxX, maxY: my },
    { minX: t.minX, minY: my, maxX: mx, maxY: t.maxY },
    { minX: mx, minY: my, maxX: t.maxX, maxY: t.maxY },
  ];
}

/** Resultaat van een getegelde BGT-fetch met verzadigingssignaal. */
interface TiledResult {
  features: GeoJSON.Feature[];
  /** True als de PDOK-cap geraakt is op het diepste splitsniveau — data is afgekapt. */
  saturated: boolean;
}

/**
 * Eén tegel ophalen met verzadigingsdetectie: raakt het resultaat de cap,
 * dan is de data afgekapt (panden ontbreken!) en splitsen we de tegel in
 * kwadranten. Maximaal twee niveaus diep (16× de basiscapaciteit). Blijft de
 * cap óók op het diepste niveau geraakt, dan markeren we `saturated` zodat de
 * router weet dat de bebouwingstoets onvolledig kan zijn.
 */
async function fetchCollectionTile(
  collection: string,
  tile: BboxQuery,
  perTile: number,
  depth = 0
): Promise<TiledResult> {
  const features = await fetchAllPdokOgcFeatures(
    '/lv/bgt/ogc/v1',
    collection,
    tile,
    Math.min(perTile, 1000),
    perTile
  ).catch(() => [] as GeoJSON.Feature[]);

  const capGeraakt = features.length >= perTile;
  if (capGeraakt && depth < 2) {
    const sub = await Promise.all(
      splitTile(tile).map((t) => fetchCollectionTile(collection, t, perTile, depth + 1))
    );
    return {
      features: sub.flatMap((s) => s.features),
      saturated: sub.some((s) => s.saturated),
    };
  }
  // Op het diepste niveau nog steeds de cap raken = afgekapt
  return { features, saturated: capGeraakt && depth >= 2 };
}

async function fetchBgtTiled(
  collection: string,
  tiles: BboxQuery[],
  perTile: number
): Promise<TiledResult> {
  const resultaten = await Promise.all(
    tiles.map((tile) => fetchCollectionTile(collection, tile, perTile))
  );
  const seen = new Set<string>();
  const features: GeoJSON.Feature[] = [];
  for (const r of resultaten) {
    for (const f of r.features) {
      const key = bgtFeatureKey(f);
      if (seen.has(key)) continue;
      seen.add(key);
      features.push(f);
    }
  }
  return { features, saturated: resultaten.some((r) => r.saturated) };
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
  // Loodsen/overkappingen blokkeren net als panden
  overigbouwwerk: 'pand',
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

async function fetchLiveBgtForRouting(
  tiles: BboxQuery[]
): Promise<{ features: BgtFeature[]; panddekkingOnzeker: boolean }> {
  const [weg, water, pand, overigBouwwerk] = await Promise.all([
    fetchBgtTiled('wegdeel', tiles, WEGDEEL_PER_TILE),
    fetchBgtTiled('waterdeel', tiles, WATERDEEL_PER_TILE),
    fetchBgtTiled('pand', tiles, PAND_PER_TILE),
    // Loodsen, overkappingen e.d. — op de BRT-kaart óók bebouwing, dus blokkeren
    fetchBgtTiled('overigbouwwerk', tiles, 600),
  ]);

  const features = [
    ...weg.features.map((f) => mapBgtRoutingFeature(f, 'weg')),
    ...water.features.map((f) => mapBgtRoutingFeature(f, 'water')),
    ...pand.features.map((f) => mapBgtRoutingFeature(f, 'pand')),
    ...overigBouwwerk.features.map((f) => mapBgtRoutingFeature(f, 'pand')),
  ];
  const wegCount = features.filter((f) => f.type === 'weg').length;
  if (wegCount === 0) throw new Error('Geen BGT wegdelen in bbox');
  // Alleen panden zijn relevant voor de bebouwingstoets
  return { features, panddekkingOnzeker: pand.saturated || overigBouwwerk.saturated };
}

async function fetchBgtForRouting(
  bbox: BboxQuery,
  tiles: BboxQuery[]
): Promise<{ features: BgtFeature[]; panddekkingOnzeker: boolean }> {
  // Pand-polygonen zijn essentieel voor blokkade — altijd live PDOK proberen
  try {
    return await fetchLiveBgtForRouting(tiles);
  } catch {
    // fallback demo
  }
  const { pdokBgtConnector } = await import('@/lib/connectors/pdok/bgt');
  const result = await pdokBgtConnector.fetch(bbox);
  // Demo-fallback: geen live panddekking — markeer als onzeker zodat de
  // bebouwingsgarantie niet stilzwijgend op demo-data leunt
  return { features: result.features, panddekkingOnzeker: true };
}

const PERCELEN_PER_TILE = 800;

/**
 * BRK-percelen langs de corridor: nodig voor de publiek/privaat-afweging
 * (zakelijk recht). Zonder live percelen viel de router terug op demo-data.
 */
async function fetchPercelenForRouting(
  tiles: BboxQuery[]
): Promise<NonNullable<MapLayerData['percelen']>> {
  const resultaten = await Promise.all(
    tiles.map((tile) =>
      fetchPdokWfsPaged(
        PDOK_WFS_PATHS.brkKadastraleKaart,
        'Perceel',
        tile,
        PERCELEN_PER_TILE,
        PERCELEN_PER_TILE
      ).catch(() => ({ type: 'FeatureCollection', features: [] }) as GeoJSON.FeatureCollection)
    )
  );

  const seen = new Set<string>();
  const percelen: NonNullable<MapLayerData['percelen']> = [];
  for (const fc of resultaten) {
    for (const f of fc.features ?? []) {
      if (f.geometry?.type !== 'Polygon' && f.geometry?.type !== 'MultiPolygon') continue;
      const props = (f.properties ?? {}) as Record<string, unknown>;
      const gemeente = (props['kadastraleGemeenteWaarde'] as string) ?? '';
      const sectie = (props['sectie'] as string) ?? '';
      const nummer = String(props['perceelnummer'] ?? '');
      const id = `${gemeente}-${sectie}-${nummer}` || String(f.id ?? '');
      if (!nummer || seen.has(id)) continue;
      seen.add(id);

      const ring =
        f.geometry.type === 'Polygon'
          ? (f.geometry.coordinates[0] as [number, number][])
          : (f.geometry.coordinates[0]?.[0] as [number, number][] | undefined);
      if (!ring || ring.length < 4) continue;

      percelen.push({
        id,
        perceelnummer: `${sectie} ${nummer}`,
        polygon: ring.map(([x, y]) => [x, y] as [number, number]),
      });
    }
  }
  return percelen;
}

/** Natura 2000 + vervuilde grond: risicozones voor de afweging (best effort). */
async function fetchRisicoLagenForRouting(bbox: BboxQuery): Promise<{
  natura2000: NonNullable<MapLayerData['natura2000']>;
  vervuildeGrond: NonNullable<MapLayerData['vervuildeGrond']>;
}> {
  const [natura, bodem] = await Promise.all([
    import('@/lib/connectors/pdok/natura2000')
      .then((m) => m.pdokNatura2000Connector.fetch(bbox))
      .then((r) => r.gebieden)
      .catch(() => []),
    import('@/lib/connectors/bro/vervuilde-grond')
      .then((m) => m.broVervuildeGrondConnector.fetch(bbox))
      .then((r) => r.locaties)
      .catch(() => []),
  ]);
  return { natura2000: natura, vervuildeGrond: bodem };
}

async function fetchBomenForRouting(
  tiles: BboxQuery[],
  bbox: BboxQuery
): Promise<{ id: string; x: number; y: number }[]> {
  // Boomafstand is een ontwerpcriterium (groeiplaats/bomenverordening) — altijd live proberen
  try {
    const punten = (await fetchBgtTiled('vegetatieobject_punt', tiles, 1500)).features;
    const bomen = punten
      .filter((f) => f.geometry?.type === 'Point')
      .map((f) => {
        const [x, y] = (f.geometry as GeoJSON.Point).coordinates;
        return { id: bgtFeatureKey(f), x, y };
      });
    if (bomen.length > 0) return bomen;
  } catch {
    // fallback connector (kan demo zijn)
  }
  try {
    const { pdokBomenConnector } = await import('@/lib/connectors/pdok/bomen');
    const result = await pdokBomenConnector.fetch(bbox);
    return result.bomen;
  } catch {
    return [];
  }
}

/**
 * Alleen bebouwing (pand + overig bouwwerk) langs een lijn ophalen — voor de
 * pand-guard bij het opslaan van handmatig bewerkte tracés.
 */
export async function fetchBebouwingVoorLijn(
  lijn: { x: number; y: number }[]
): Promise<[number, number][][]> {
  if (lijn.length < 2) return [];
  const tiles = corridorTiles(lijn);
  const [pand, overig] = await Promise.all([
    fetchBgtTiled('pand', tiles, PAND_PER_TILE),
    fetchBgtTiled('overigbouwwerk', tiles, 600),
  ]);
  const polygonen: [number, number][][] = [];
  for (const f of [...pand.features, ...overig.features]) {
    if (f.geometry?.type === 'Polygon') {
      polygonen.push(f.geometry.coordinates[0] as [number, number][]);
    } else if (f.geometry?.type === 'MultiPolygon') {
      for (const poly of f.geometry.coordinates) {
        polygonen.push(poly[0] as [number, number][]);
      }
    }
  }
  return polygonen.filter((p) => p.length >= 4);
}

/** Haal NWB + BGT op voor het waypoint-gebied (server-side, onafhankelijk van kaartlagen-toggle). */
export async function fetchRoutingLayerData(
  waypoints: TraceWaypoint[]
): Promise<MapLayerData> {
  if (waypoints.length < 2) {
    return { coordinateSystem: 'EPSG:28992' };
  }

  const bbox = waypointsBbox(waypoints, ROUTING_PADDING_MIN_M);
  const tiles = corridorTiles(waypoints);

  const [nwb, bgt, bomen, percelen, risico] = await Promise.all([
    fetchNwbForRouting(bbox),
    fetchBgtForRouting(bbox, tiles),
    fetchBomenForRouting(tiles, bbox),
    fetchPercelenForRouting(tiles),
    fetchRisicoLagenForRouting(bbox),
  ]);

  const bgtFeatures = bgt.features;
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
    bomen,
    percelen,
    natura2000: risico.natura2000,
    vervuildeGrond: risico.vervuildeGrond,
    pandDekkingOnzeker: bgt.panddekkingOnzeker,
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
    percelen: (fetched.percelen?.length ?? 0) >= (client.percelen?.length ?? 0)
      ? fetched.percelen
      : client.percelen,
    belemmeringen: client.belemmeringen,
    bomen: (fetched.bomen?.length ? fetched.bomen : client.bomen) ?? [],
    // Onzeker zodra een van beide bronnen onzeker is — de garantie mag niet
    // stilzwijgend wegvallen omdat de client toevallig wat panden meestuurde
    pandDekkingOnzeker: Boolean(fetched.pandDekkingOnzeker || client.pandDekkingOnzeker),
  };
}
