/**
 * Bodemloket WBB-locaties — ArcGIS REST vector-adapter (Wet bodembescherming).
 *
 * Dunne adapter: alle URL's, laag-id's en query-parameters staan hier
 * gecentraliseerd, zodat een toekomstige padwijziging één bestand raakt.
 *
 * LIVE GEVERIFIEERD (2026-06-27):
 *   - Spec-pad www.gdngeoservices.nl/.../blk/lks_blk_rd → 404 (verdwenen).
 *   - Werkend pad: gis.gdngeoservices.nl/standalone/.../blk_gdn/lks_blk_rd_v1 (ArcGIS 11.5).
 *   - Laag 0 = WBB_locaties (esriGeometryPolygon, 246.848 features, maxRecordCount 2000,
 *     supportsPagination=true). Géén aparte puntlaag — WBB is hier polygon-only.
 *   - Paginering via resultOffset/resultRecordCount; orderByFields nodig voor stabiele pagina's.
 *   - f=geojson + outSR=4326 levert lon/lat; outSR=28992 levert RD voor PostGIS-opslag.
 */

import type { BboxQuery } from '../types';

/** Gecentraliseerde Bodemloket-configuratie — wijzig hier bij een padverschuiving. */
export const WBB_ARCGIS = {
  mapServer:
    'https://gis.gdngeoservices.nl/standalone/rest/services/blk_gdn/lks_blk_rd_v1/MapServer',
  /** Laag 0 = WBB_locaties (vlakken met bekende/potentiële verontreiniging). */
  locatiesLayerId: 0,
  /** Server-cap per request (ArcGIS maxRecordCount). */
  pageSize: 2000,
  /** Velden die we nodig hebben voor signalering (beperkt de payload). */
  outFields: [
    'LOCATIECODE_BEVOEGD_GEZAG',
    'WBB_DOSSIER_DBK',
    'TYPE_CD',
    'STATUSVER',
    'STATUS_OORD',
    'VERVOLG_WBB',
  ],
} as const;

/** Harde timeout per request — een hangende geodienst mag nooit blokkeren. */
const WBB_TIMEOUT_MS = 20_000;

/** Veiligheidsplafond op totaal aantal opgehaalde features per gebied. */
const DEFAULT_MAX_FEATURES = 10_000;

export type WbbOutputCrs = 'EPSG:28992' | 'EPSG:4326';

/** Genormaliseerde WBB-locatie, losgekoppeld van de ruwe ArcGIS-velden. */
export interface WbbLocatie {
  /** Locatiecode bevoegd gezag — sleutel voor terugzoeken in het bodemarchief. */
  locatiecode: string;
  /** Dossiernummer (DBK), indien aanwezig. */
  dossier: string | null;
  /** Samengevatte status (vervolgtraject Wbb of statusoordeel). */
  status: string;
  /** Ruwe statusvelden voor naslag. */
  vervolgWbb: string | null;
  statusOordeel: string | null;
  /** Vaste bronaanduiding. */
  bron: 'bodemloket-wbb';
}

/** Genormaliseerd resultaat: GeoJSON in de gevraagde CRS + afgeleide locatie-attributen. */
export interface WbbResult {
  /** GeoJSON-features in de gevraagde CRS (4326 voor kaart, 28992 voor opslag). */
  featureCollection: GeoJSON.FeatureCollection;
  /** Genormaliseerde attributen, in dezelfde volgorde als features. */
  locaties: WbbLocatie[];
  /** Aantal opgehaalde features. */
  aantal: number;
  /** Of het plafond (maxFeatures) is geraakt — dan is het gebied mogelijk afgekapt. */
  afgekapt: boolean;
}

function buildQueryUrl(
  bbox: BboxQuery,
  outCrs: WbbOutputCrs,
  offset: number,
  pageSize: number,
  returnGeometry: boolean
): string {
  const base = WBB_ARCGIS.mapServer.replace(/\/$/, '');
  const url = new URL(`${base}/${WBB_ARCGIS.locatiesLayerId}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('geometry', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '28992');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('outFields', WBB_ARCGIS.outFields.join(','));
  url.searchParams.set('returnGeometry', returnGeometry ? 'true' : 'false');
  // Stabiele volgorde is noodzakelijk voor betrouwbare offset-paginering.
  url.searchParams.set('orderByFields', 'LOCATIECODE_BEVOEGD_GEZAG');
  url.searchParams.set('resultOffset', String(offset));
  url.searchParams.set('resultRecordCount', String(pageSize));
  url.searchParams.set('outSR', outCrs === 'EPSG:4326' ? '4326' : '28992');
  url.searchParams.set('f', 'geojson');
  return url.toString();
}

async function fetchPage(urlStr: string): Promise<GeoJSON.Feature[]> {
  const res = await fetch(urlStr, {
    headers: { Accept: 'application/geo+json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(WBB_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Bodemloket WBB: ${res.status} ${res.statusText}`);
  }
  const fc = (await res.json()) as GeoJSON.FeatureCollection;
  return fc.features ?? [];
}

function normalizeFeature(feature: GeoJSON.Feature): WbbLocatie {
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    v === null || v === undefined || v === '' ? null : String(v);
  const vervolg = str(p.VERVOLG_WBB);
  const oordeel = str(p.STATUS_OORD ?? p.STATUSVER);
  return {
    locatiecode: str(p.LOCATIECODE_BEVOEGD_GEZAG) ?? 'onbekend',
    dossier: str(p.WBB_DOSSIER_DBK),
    status: vervolg ?? oordeel ?? 'status onbekend',
    vervolgWbb: vervolg,
    statusOordeel: oordeel,
    bron: 'bodemloket-wbb',
  };
}

/**
 * Haalt alle WBB-locaties binnen een bbox (RD/28992) op, gepagineerd via resultOffset.
 *
 * @param bbox        Zoekgebied in RD New (EPSG:28992).
 * @param outCrs      Output-CRS: 28992 voor PostGIS-opslag, 4326 voor de kaart.
 * @param maxFeatures Plafond op totaal aantal features (afkap-bescherming).
 */
export async function fetchWbbLocaties(
  bbox: BboxQuery,
  outCrs: WbbOutputCrs = 'EPSG:28992',
  maxFeatures = DEFAULT_MAX_FEATURES
): Promise<WbbResult> {
  const pageSize = WBB_ARCGIS.pageSize;
  const features: GeoJSON.Feature[] = [];
  let offset = 0;
  let afgekapt = false;

  // Pagineer tot een pagina kleiner is dan pageSize (laatste pagina) of het plafond raakt.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await fetchPage(buildQueryUrl(bbox, outCrs, offset, pageSize, true));
    features.push(...batch);

    if (batch.length < pageSize) break;
    if (features.length >= maxFeatures) {
      afgekapt = true;
      break;
    }
    offset += pageSize;
  }

  const capped = afgekapt ? features.slice(0, maxFeatures) : features;
  const locaties = capped.map(normalizeFeature);

  return {
    featureCollection: { type: 'FeatureCollection', features: capped },
    locaties,
    aantal: capped.length,
    afgekapt,
  };
}

/** Snelle telling zonder geometrie — handig voor capaciteits-/health-checks. */
export async function countWbbLocaties(bbox: BboxQuery): Promise<number> {
  const base = WBB_ARCGIS.mapServer.replace(/\/$/, '');
  const url = new URL(`${base}/${WBB_ARCGIS.locatiesLayerId}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('geometry', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '28992');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
  url.searchParams.set('returnCountOnly', 'true');
  url.searchParams.set('f', 'json');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(WBB_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Bodemloket WBB count: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { count?: number };
  return data.count ?? 0;
}
