import type { BboxQuery } from '../types';
import { fetchWithTimeout } from './fetch-timeout';

function rdBboxParam(bbox: BboxQuery): string {
  return `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY},urn:ogc:def:crs:EPSG::28992`;
}

const RD_CRS = 'http://www.opengis.net/def/crs/EPSG/0/28992';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

export async function fetchExternalWfs(
  baseUrl: string,
  typeNames: string,
  bbox: BboxQuery,
  maxFeatures = 200
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(baseUrl);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeNames', typeNames);
  url.searchParams.set('bbox', rdBboxParam(bbox));
  url.searchParams.set('srsName', 'urn:ogc:def:crs:EPSG::28992');
  url.searchParams.set('count', String(maxFeatures));
  url.searchParams.set('outputFormat', 'application/json');

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`WFS ${typeNames}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}

export async function fetchExternalOgcFeatures(
  baseUrl: string,
  collection: string,
  bbox: BboxQuery,
  limit = 200
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/collections/${collection}/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('bbox-crs', RD_CRS);
  url.searchParams.set('crs', RD_CRS);
  url.searchParams.set('limit', String(limit));

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/geo+json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`OGC ${collection}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}

/** OGC met CRS84-output (lon/lat) — sommige endpoints ondersteunen alleen dit. */
export async function fetchExternalOgcFeaturesCrs84(
  baseUrl: string,
  collection: string,
  bbox: BboxQuery,
  limit = 200
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/collections/${collection}/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('bbox-crs', RD_CRS);
  url.searchParams.set('crs', CRS84);
  url.searchParams.set('limit', String(limit));

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/geo+json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`OGC ${collection}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}

/** ArcGIS MapServer query — betrouwbaarder dan WFS bij veel gemeentelijke portals. */
export async function fetchArcGisMapServerLayer(
  mapServerUrl: string,
  layerId: number,
  bbox: BboxQuery,
  maxFeatures = 200
): Promise<GeoJSON.FeatureCollection> {
  const base = mapServerUrl.replace(/\/$/, '');
  const url = new URL(`${base}/${layerId}/query`);
  url.searchParams.set('where', '1=1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('resultRecordCount', String(maxFeatures));
  url.searchParams.set('f', 'geojson');
  url.searchParams.set(
    'geometry',
    `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`
  );
  url.searchParams.set('geometryType', 'esriGeometryEnvelope');
  url.searchParams.set('inSR', '28992');
  url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');

  const res = await fetchWithTimeout(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`ArcGIS layer ${layerId}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}
