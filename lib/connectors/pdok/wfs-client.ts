import type { BboxQuery } from '../types';

const WFS_BASE = 'https://service.pdok.nl';

export function bboxParam(bbox: BboxQuery): string {
  return `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY},urn:ogc:def:crs:EPSG::28992`;
}

export async function fetchPdokWfs(
  path: string,
  typeNames: string,
  bbox: BboxQuery,
  count = 100
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(`${WFS_BASE}${path}`);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeNames', typeNames);
  url.searchParams.set('bbox', bboxParam(bbox));
  url.searchParams.set('count', String(count));
  url.searchParams.set('outputFormat', 'application/json');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`PDOK WFS ${path}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}

export type PdokWfsOutputCrs = 'EPSG:28992' | 'EPSG:4326';

/** Haal WFS-features op met paging (PDOK max ~1000 per request). */
export async function fetchPdokWfsPaged(
  path: string,
  typeNames: string,
  bbox: BboxQuery,
  maxFeatures = 500,
  pageSize = 1000,
  outputCrs: PdokWfsOutputCrs = 'EPSG:28992'
): Promise<GeoJSON.FeatureCollection> {
  const allFeatures: GeoJSON.Feature[] = [];
  let startIndex = 0;
  const pageLimit = Math.min(pageSize, 1000);

  while (allFeatures.length < maxFeatures) {
    const url = new URL(`${WFS_BASE}${path}`);
    url.searchParams.set('service', 'WFS');
    url.searchParams.set('version', '2.0.0');
    url.searchParams.set('request', 'GetFeature');
    url.searchParams.set('typeNames', typeNames);
    url.searchParams.set('bbox', bboxParam(bbox));
    url.searchParams.set(
      'srsName',
      outputCrs === 'EPSG:4326'
        ? 'urn:ogc:def:crs:EPSG::4326'
        : 'urn:ogc:def:crs:EPSG::28992'
    );
    url.searchParams.set(
      'count',
      String(Math.min(pageLimit, maxFeatures - allFeatures.length))
    );
    url.searchParams.set('startIndex', String(startIndex));
    url.searchParams.set('outputFormat', 'application/json');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`PDOK WFS ${path}: ${res.status} ${res.statusText}`);
    }

    const page = (await res.json()) as GeoJSON.FeatureCollection;
    const batch = page.features ?? [];
    if (batch.length === 0) break;

    allFeatures.push(...batch);
    if (batch.length < pageLimit) break;
    startIndex += batch.length;
  }

  return { type: 'FeatureCollection', features: allFeatures };
}

export async function fetchAhnElevation(x: number, y: number): Promise<number | null> {
  const url = new URL('https://service.pdok.nl/rws/ahn/wcs/v1_0');
  url.searchParams.set('SERVICE', 'WCS');
  url.searchParams.set('VERSION', '1.0.0');
  url.searchParams.set('REQUEST', 'GetCoverage');
  url.searchParams.set('COVERAGE', 'dtm_05m');
  url.searchParams.set('CRS', 'EPSG:28992');
  url.searchParams.set('BBOX', `${x},${y},${x + 0.5},${y + 0.5}`);
  url.searchParams.set('WIDTH', '1');
  url.searchParams.set('HEIGHT', '1');
  url.searchParams.set('FORMAT', 'image/tiff');

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength < 8) return null;

  const view = new DataView(buffer);
  const magic = view.getUint16(0, false);
  if (magic !== 0x4949 && magic !== 0x4d4d) return null;

  for (let offset = 8; offset < buffer.byteLength - 4; offset += 4) {
    const val = view.getFloat32(offset, true);
    if (val > -50 && val < 1000 && !Number.isNaN(val)) return Math.round(val * 100) / 100;
  }
  return null;
}

/** Bekende PDOK WFS-paden (bijgewerkt 2025/2026). */
export const PDOK_WFS_PATHS = {
  brkKadastraleKaart: '/kadaster/kadastralekaart/wfs/v5_0',
  nwbWegen: '/rws/nationaal-wegenbestand-wegen/wfs/v1_0',
  natura2000: '/rvo/beschermde-gebieden/natura2000/wfs/v2_0',
} as const;
