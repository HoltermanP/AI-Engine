import type { BboxQuery } from '../types';
import type { VervuildeGrondLocatie } from './types';
import { getEnabledVervuildeGrondExtraSourceIds } from '../config';
import {
  fetchArcGisMapServerLayer,
  fetchExternalOgcFeatures,
  fetchExternalWfs,
} from './fetch-external';
import { fetchExternalWfsGml } from './gml-wfs';
import { pointFromGeometry, polygonRingFromGeometry } from './geometry';
import {
  getSourceLayerDefaults,
  VERVUILDE_GROND_EXTRA_SOURCES,
  type VervuildeGrondSourceDefinition,
  type VervuildeGrondSourceLayer,
} from './registry';

const MAX_FEATURES_PER_LAYER = 200;

function bboxesIntersect(a: BboxQuery, b: BboxQuery): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

function intersectBbox(a: BboxQuery, b: BboxQuery): BboxQuery {
  return {
    minX: Math.max(a.minX, b.minX),
    minY: Math.max(a.minY, b.minY),
    maxX: Math.min(a.maxX, b.maxX),
    maxY: Math.min(a.maxY, b.maxY),
  };
}

function pickProperty(
  props: Record<string, unknown>,
  fields: string[]
): string {
  for (const field of fields) {
    const value = props[field];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function pickStatus(props: Record<string, unknown>, fields: string[]): string {
  const parts: string[] = [];
  for (const field of fields) {
    const value = props[field];
    if (value != null && String(value).trim()) {
      parts.push(`${field}:${String(value).trim()}`);
    }
  }
  return parts.join('; ');
}

function matchesGemeenteFilter(
  props: Record<string, unknown>,
  layer: VervuildeGrondSourceLayer
): boolean {
  if (!layer.gemeenteFilter) return true;
  const field = layer.gemeenteField ?? 'Gemeente';
  const value = props[field];
  if (value == null) return false;
  return String(value).trim().toLowerCase() === layer.gemeenteFilter.toLowerCase();
}

function featureToLocatie(
  feature: GeoJSON.Feature,
  layer: VervuildeGrondSourceLayer,
  source: VervuildeGrondSourceDefinition,
  index: number
): VervuildeGrondLocatie | null {
  if (!feature.geometry) return null;
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  if (!matchesGemeenteFilter(props, layer)) return null;

  const { nameFields, statusFields } = getSourceLayerDefaults(layer);
  const naam =
    pickProperty(props, nameFields) ||
    `${source.gemeente} ${layer.label.split('—').pop()?.trim() ?? layer.bron}`;
  const status = pickStatus(props, statusFields) || pickProperty(props, statusFields);
  const featureId =
    feature.id != null ? String(feature.id) : `${layer.bron}-${index}`;
  const id = `${layer.bron}:${featureId}`;

  const polygon = polygonRingFromGeometry(feature.geometry);
  if (polygon.length >= 4) {
    return { id, bron: layer.bron, naam, status, polygon };
  }

  const point = pointFromGeometry(feature.geometry);
  if (point) {
    return { id, bron: layer.bron, naam, status, x: point[0], y: point[1] };
  }

  const xCoord = props.XCOORD ?? props.xcoordinaat ?? props.X;
  const yCoord = props.YCOORD ?? props.ycoordinaat ?? props.Y;
  if (xCoord != null && yCoord != null) {
    const x = Number(xCoord);
    const y = Number(yCoord);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { id, bron: layer.bron, naam, status, x, y };
    }
  }

  return null;
}

function fetchCacheKey(
  source: VervuildeGrondSourceDefinition,
  layer: VervuildeGrondSourceLayer,
  bbox: BboxQuery
): string {
  const base = layer.wfsBaseUrl ?? source.baseUrl;
  return [
    source.provider,
    base,
    layer.typeNames ?? '',
    layer.collection ?? '',
    layer.layerId ?? '',
    bbox.minX,
    bbox.minY,
    bbox.maxX,
    bbox.maxY,
  ].join('|');
}

async function fetchFeatureCollection(
  source: VervuildeGrondSourceDefinition,
  layer: VervuildeGrondSourceLayer,
  bbox: BboxQuery,
  cache: Map<string, Promise<GeoJSON.FeatureCollection>>
): Promise<GeoJSON.FeatureCollection> {
  const key = fetchCacheKey(source, layer, bbox);
  let pending = cache.get(key);
  if (!pending) {
    pending = (async () => {
      if (source.provider === 'wfs') {
        if (!layer.typeNames) return { type: 'FeatureCollection', features: [] };
        const wfsUrl = layer.wfsBaseUrl ?? source.baseUrl;
        if (layer.wfsGml) {
          return fetchExternalWfsGml(
            wfsUrl,
            layer.typeNames,
            bbox,
            Math.min(MAX_FEATURES_PER_LAYER, 30)
          );
        }
        return fetchExternalWfs(wfsUrl, layer.typeNames, bbox, MAX_FEATURES_PER_LAYER);
      }
      if (source.provider === 'ogc') {
        if (!layer.collection) return { type: 'FeatureCollection', features: [] };
        return fetchExternalOgcFeatures(
          source.baseUrl,
          layer.collection,
          bbox,
          MAX_FEATURES_PER_LAYER
        );
      }
      if (layer.layerId === undefined) {
        return { type: 'FeatureCollection', features: [] };
      }
      return fetchArcGisMapServerLayer(
        source.baseUrl,
        layer.layerId,
        bbox,
        MAX_FEATURES_PER_LAYER
      );
    })();
    cache.set(key, pending);
  }
  return pending;
}

const LAYER_FETCH_TIMEOUT_MS = 12_000;

async function withLayerTimeout<T>(
  label: string,
  promise: Promise<T>
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label}: timeout na ${LAYER_FETCH_TIMEOUT_MS}ms`)),
        LAYER_FETCH_TIMEOUT_MS
      )
    ),
  ]);
}

async function fetchLayer(
  source: VervuildeGrondSourceDefinition,
  layer: VervuildeGrondSourceLayer,
  bbox: BboxQuery,
  cache: Map<string, Promise<GeoJSON.FeatureCollection>>
): Promise<VervuildeGrondLocatie[]> {
  const fc = await withLayerTimeout(
    `${source.id}/${layer.bron}`,
    fetchFeatureCollection(source, layer, bbox, cache)
  );
  return fc.features
    .map((f, i) => featureToLocatie(f, layer, source, i))
    .filter((l): l is VervuildeGrondLocatie => l !== null);
}

function isSourceEnabled(
  source: VervuildeGrondSourceDefinition,
  enabledIds: string[] | 'all'
): boolean {
  if (enabledIds === 'all') {
    return source.defaultEnabled !== false;
  }
  return enabledIds.includes(source.id);
}

function effectiveBbox(
  source: VervuildeGrondSourceDefinition,
  query: BboxQuery
): BboxQuery | null {
  if (source.coverageBbox && !bboxesIntersect(query, source.coverageBbox)) {
    return null;
  }
  if (source.coverageBbox) {
    return intersectBbox(query, source.coverageBbox);
  }
  return query;
}

export function getActiveExtraSourceDefinitions(): VervuildeGrondSourceDefinition[] {
  const enabledIds = getEnabledVervuildeGrondExtraSourceIds();
  if (enabledIds.length === 0) return [];
  const mode = enabledIds.includes('all') ? 'all' : enabledIds;
  return VERVUILDE_GROND_EXTRA_SOURCES.filter((s) =>
    isSourceEnabled(s, mode === 'all' ? 'all' : mode)
  );
}

export async function fetchGemeentelijkeVervuildeGrond(
  bbox: BboxQuery
): Promise<{ locaties: VervuildeGrondLocatie[]; bronnen: string[] }> {
  const sources = getActiveExtraSourceDefinitions();
  if (sources.length === 0) return { locaties: [], bronnen: [] };

  const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>();
  const tasks = sources.flatMap((source) => {
    const queryBbox = effectiveBbox(source, bbox);
    if (!queryBbox) return [];
    return source.layers.map(async (layer) => {
      try {
        const locaties = await fetchLayer(source, layer, queryBbox, cache);
        return { source, layer, locaties, error: null as string | null };
      } catch (e) {
        return {
          source,
          layer,
          locaties: [] as VervuildeGrondLocatie[],
          error: e instanceof Error ? e.message : 'onbekende fout',
        };
      }
    });
  });

  const results = await Promise.all(tasks);
  const locaties = results.flatMap((r) => r.locaties);
  const bronnen = new Set<string>();

  for (const source of sources) {
    if (!effectiveBbox(source, bbox)) continue;
    bronnen.add(`${source.label} (${source.baseUrl})`);
  }
  for (const r of results) {
    if (r.error) {
      bronnen.add(`${r.source.id}/${r.layer.bron}: fout — ${r.error}`);
    }
  }

  return { locaties, bronnen: [...bronnen] };
}

export async function testExtraSources(): Promise<string[]> {
  const sources = getActiveExtraSourceDefinitions();
  if (sources.length === 0) return ['Geen gemeentelijke bronnen actief'];

  const parts: string[] = [];
  const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>();
  for (const source of sources) {
    const bbox = source.testBbox ?? {
      minX: 100_000,
      minY: 400_000,
      maxX: 200_000,
      maxY: 500_000,
    };
    let count = 0;
    let firstError: string | null = null;
    for (const layer of source.layers) {
      try {
        const locs = await fetchLayer(source, layer, bbox, cache);
        count += locs.length;
      } catch (e) {
        firstError = e instanceof Error ? e.message : 'fout';
      }
    }
    if (firstError && count === 0) {
      parts.push(`${source.id}: niet bereikbaar (${firstError})`);
    } else {
      parts.push(`${source.id}: ${count} locaties in test-bbox`);
    }
  }
  return parts;
}
