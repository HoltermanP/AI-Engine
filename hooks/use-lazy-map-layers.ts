'use client';

import { useCallback, useRef, useState } from 'react';
import type { MapLayerData } from '@/components/trace-map';
import type { MapLayerFetchResult } from '@/lib/services/fetch-map-layer-types';
import type { ConnectorMode } from '@/lib/connectors/types';
import type { BboxQuery } from '@/lib/connectors/types';
import {
  bboxCacheKey,
  type MapViewport,
  viewportToRdBbox,
} from '@/lib/map/viewport-bbox';
import { isFetchableMapLayer, LAYER_DATA_FIELD } from '@/lib/map/fetchable-layers';

interface UseLazyMapLayersOptions {
  traceId?: string;
}

function mergeLayerSlice(
  prev: MapLayerData,
  partial: Partial<MapLayerData>
): MapLayerData {
  return {
    coordinateSystem: 'EPSG:28992',
    ...prev,
    ...partial,
  };
}

export function useLazyMapLayers(options: UseLazyMapLayersOptions = {}) {
  const { traceId } = options;
  const [layerData, setLayerData] = useState<MapLayerData>({
    coordinateSystem: 'EPSG:28992',
  });
  const [loadingLayers, setLoadingLayers] = useState<string[]>([]);
  const [sources, setSources] = useState<Record<string, ConnectorMode>>({});
  const viewportRef = useRef<BboxQuery | null>(null);
  const visibleLayersRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dataSource: ConnectorMode = Object.values(sources).includes('live')
    ? 'live'
    : 'demo';

  const fetchLayer = useCallback(
    async (layerId: string, bbox: BboxQuery) => {
      if (!isFetchableMapLayer(layerId)) return;

      const requestKey = bboxCacheKey(bbox);
      const cacheKey = `${layerId}:${requestKey}`;
      if (inflightRef.current.has(cacheKey)) return;

      inflightRef.current.add(cacheKey);
      // React kan bij sommige UI-flows (bijv. controlled Switch mounts/updates) deze functie
      // aanroepen tijdens de renderfase. De state-update deferred'en voorkomt:
      // "Cannot update a component while rendering a different component".
      queueMicrotask(() => {
        setLoadingLayers((prev) =>
          prev.includes(layerId) ? prev : [...prev, layerId]
        );
      });

      try {
        const res = await fetch('/api/map-layers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layerId, bbox, traceId }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const result = (await res.json()) as MapLayerFetchResult;

        // Negeer verouderde responses na pan/zoom
        const current = viewportRef.current;
        if (!current || bboxCacheKey(current) !== requestKey) return;

        setLayerData((prev) => mergeLayerSlice(prev, result.partial));
        setSources((prev) => ({ ...prev, ...result.sources }));
      } catch (err) {
        console.error(`[lazy-layer] ${layerId} ophalen mislukt:`, err);
      } finally {
        inflightRef.current.delete(cacheKey);
        setLoadingLayers((prev) => prev.filter((id) => id !== layerId));
      }
    },
    [traceId]
  );

  const refreshVisibleLayers = useCallback(
    (bbox: BboxQuery) => {
      for (const layerId of visibleLayersRef.current) {
        void fetchLayer(layerId, bbox);
      }
    },
    [fetchLayer]
  );

  const onViewportChange = useCallback(
    (viewport: MapViewport) => {
      const bbox = viewportToRdBbox(viewport);
      viewportRef.current = bbox;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        refreshVisibleLayers(bbox);
      }, 400);
    },
    [refreshVisibleLayers]
  );

  const onLayerToggle = useCallback(
    (layerId: string, visible: boolean) => {
      if (visible) {
        visibleLayersRef.current.add(layerId);
        if (viewportRef.current && isFetchableMapLayer(layerId)) {
          void fetchLayer(layerId, viewportRef.current);
        }
      } else {
        visibleLayersRef.current.delete(layerId);
        if (isFetchableMapLayer(layerId)) {
          const field = LAYER_DATA_FIELD[layerId];
          setLayerData((prev) => ({ ...prev, [field]: undefined }));
        }
      }
    },
    [fetchLayer]
  );

  return {
    layerData,
    loadingLayers,
    sources,
    dataSource,
    onViewportChange,
    onLayerToggle,
  };
}
