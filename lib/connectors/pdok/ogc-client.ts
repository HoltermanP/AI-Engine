import type { BboxQuery } from '../types';

const OGC_BASE = 'https://api.pdok.nl';

/** Harde timeout per request — een hangende geodienst mag de berekening nooit blokkeren. */
const PDOK_TIMEOUT_MS = 15_000;
const RD_CRS = 'http://www.opengis.net/def/crs/EPSG/0/28992';
const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';

export type PdokOgcOutputCrs = 'EPSG:28992' | 'CRS84';

export async function fetchPdokOgcFeatures(
  basePath: string,
  collection: string,
  bbox: BboxQuery,
  limit = 50,
  outputCrs: PdokOgcOutputCrs = 'EPSG:28992'
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(`${OGC_BASE}${basePath}/collections/${collection}/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('bbox-crs', RD_CRS);
  url.searchParams.set('crs', outputCrs === 'CRS84' ? CRS84 : RD_CRS);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/geo+json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(PDOK_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`PDOK OGC ${basePath}/${collection}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<GeoJSON.FeatureCollection>;
}

/** Haal alle features op via OGC-paginering (cursor/next-link). */
export async function fetchAllPdokOgcFeatures(
  basePath: string,
  collection: string,
  bbox: BboxQuery,
  pageSize = 500,
  maxFeatures = 2000,
  outputCrs: PdokOgcOutputCrs = 'EPSG:28992'
): Promise<GeoJSON.Feature[]> {
  const all: GeoJSON.Feature[] = [];

  let url: URL | null = new URL(`${OGC_BASE}${basePath}/collections/${collection}/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`);
  url.searchParams.set('bbox-crs', RD_CRS);
  url.searchParams.set('crs', outputCrs === 'CRS84' ? CRS84 : RD_CRS);
  url.searchParams.set('limit', String(pageSize));

  while (url && all.length < maxFeatures) {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/geo+json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(PDOK_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`PDOK OGC ${basePath}/${collection}: ${res.status} ${res.statusText}`);
    }

    const fc = (await res.json()) as GeoJSON.FeatureCollection & {
      links?: { rel: string; href: string }[];
    };
    const batch = fc.features ?? [];
    if (batch.length === 0) break;

    all.push(...batch);
    if (batch.length < pageSize) break;

    const nextLink = fc.links?.find((l) => l.rel === 'next')?.href;
    url = nextLink ? new URL(nextLink) : null;
  }

  return all.slice(0, maxFeatures);
}
