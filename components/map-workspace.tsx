'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TraceMap, type MapLayerData, type MapNet, type MapTrace } from '@/components/trace-map-dynamic';
import { MapLayerPanel } from '@/components/map-layer-panel';
import { MapDisplayControls, type DrawMode } from '@/components/map-display-controls';
import type { ConnectorMode } from '@/lib/connectors/types';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { TraceWaypoint } from '@/lib/services/trace-routing';
import { wgs84ToRd } from '@/lib/geo';
import { useLazyMapLayers } from '@/hooks/use-lazy-map-layers';
import { LAYER_DATA_FIELD } from '@/lib/map/fetchable-layers';
import {
  appendVertex,
  applyTraceLines,
  findNearestSegmentInsert,
  findNearestVertex,
  getTraceLines,
  insertVertexAfter,
  type TraceLines,
} from '@/lib/trace-edit';

interface MapWorkspaceProps {
  traces: MapTrace[];
  onTracesChange?: (traces: MapTrace[]) => void;
  bestaandNet?: MapNet[];
  conflicten?: DetectedConflict[];
  layerData?: MapLayerData;
  lazyLayers?: boolean;
  traceId?: string;
  selectedTraceId?: string;
  selectedConflictId?: string | null;
  dataSource?: ConnectorMode;
  height?: string;
  editable?: boolean;
  /** Standaard tekenmodus bij openen (fase 1 auto-tracé: 'auto') */
  defaultDrawMode?: DrawMode;
  autoWaypoints?: TraceWaypoint[];
  onAutoWaypointsChange?: (waypoints: TraceWaypoint[]) => void;
  onLayerDataChange?: (data: MapLayerData) => void;
  routeAlternatives?: {
    id: string;
    label: string;
    traceLines: [number, number, number][][];
    selected: boolean;
  }[];
}

function emptyTraceLine(): TraceLines {
  return [[]];
}

/** Live opgehaalde lagen hebben voorrang boven verzamelde trace-data in dezelfde viewport. */
function mergeLazyLayerData(
  lazy: MapLayerData,
  external?: MapLayerData
): MapLayerData {
  if (!external) return lazy;
  const merged: MapLayerData = { ...external, ...lazy };
  for (const field of Object.values(LAYER_DATA_FIELD)) {
    const lazySlice = lazy[field];
    if (Array.isArray(lazySlice) && lazySlice.length > 0) {
      (merged as Record<string, unknown>)[field] = lazySlice;
    }
  }
  return merged;
}

function layerDataSignature(data: MapLayerData | undefined): string {
  if (!data) return '';
  return Object.values(LAYER_DATA_FIELD)
    .map((field) => {
      const slice = data[field as keyof MapLayerData];
      return `${field}:${Array.isArray(slice) ? slice.length : 0}`;
    })
    .join('|');
}

function updateSelectedTraceLines(
  traces: MapTrace[],
  selectedTraceId: string,
  lines: TraceLines
): MapTrace[] {
  return traces.map((t) =>
    t.id === selectedTraceId ? applyTraceLines(t, lines) : t
  );
}

export function MapWorkspace({
  traces: tracesProp,
  onTracesChange,
  bestaandNet = [],
  conflicten = [],
  layerData: externalLayerData,
  lazyLayers = true,
  traceId,
  selectedTraceId,
  selectedConflictId = null,
  dataSource: externalDataSource = 'demo',
  height = '100%',
  editable = true,
  defaultDrawMode = 'none',
  autoWaypoints: controlledWaypoints,
  onAutoWaypointsChange,
  onLayerDataChange,
  routeAlternatives = [],
}: MapWorkspaceProps) {
  const lazy = useLazyMapLayers({ traceId });
  const layerData = useMemo(
    () =>
      lazyLayers
        ? mergeLazyLayerData(lazy.layerData, externalLayerData)
        : externalLayerData,
    [lazyLayers, lazy.layerData, externalLayerData]
  );
  const dataSource = lazyLayers ? lazy.dataSource : externalDataSource;
  const isControlled = onTracesChange !== undefined;
  const [internalTraces, setInternalTraces] = useState(tracesProp);
  const traces = isControlled ? tracesProp : internalTraces;
  const selectedTraceIdRef = useRef(selectedTraceId);
  const tracesPropRef = useRef(tracesProp);
  tracesPropRef.current = tracesProp;

  const isWaypointsControlled = onAutoWaypointsChange !== undefined;
  const [internalWaypoints, setInternalWaypoints] = useState<TraceWaypoint[]>([]);
  const autoWaypoints = isWaypointsControlled ? (controlledWaypoints ?? []) : internalWaypoints;

  const setAutoWaypoints = useCallback(
    (updater: TraceWaypoint[] | ((prev: TraceWaypoint[]) => TraceWaypoint[])) => {
      const next =
        typeof updater === 'function'
          ? updater(isWaypointsControlled ? (controlledWaypoints ?? []) : internalWaypoints)
          : updater;
      if (isWaypointsControlled) {
        onAutoWaypointsChange?.(next);
      } else {
        setInternalWaypoints(next);
      }
    },
    [controlledWaypoints, internalWaypoints, isWaypointsControlled, onAutoWaypointsChange]
  );

  const setTraces = useCallback(
    (updater: MapTrace[] | ((prev: MapTrace[]) => MapTrace[])) => {
      if (isControlled) {
        const next =
          typeof updater === 'function'
            ? updater(tracesPropRef.current)
            : updater;
        onTracesChange(next);
        return;
      }
      setInternalTraces(updater);
    },
    [isControlled, onTracesChange]
  );

  const [traceLineWidth, setTraceLineWidth] = useState(4);
  const [multiLineMode, setMultiLineMode] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>(defaultDrawMode);

  const onLayerDataChangeRef = useRef(onLayerDataChange);
  onLayerDataChangeRef.current = onLayerDataChange;
  const lastLayerNotifyRef = useRef('');

  useEffect(() => {
    if (!layerData) return;
    const sig = layerDataSignature(layerData);
    if (sig === lastLayerNotifyRef.current) return;
    lastLayerNotifyRef.current = sig;
    onLayerDataChangeRef.current?.(layerData);
  }, [layerData]);

  useEffect(() => {
    if (!isControlled) {
      setInternalTraces(tracesProp);
    }
  }, [isControlled, tracesProp]);

  useEffect(() => {
    if (selectedTraceIdRef.current === selectedTraceId) return;
    const previousId = selectedTraceIdRef.current;
    selectedTraceIdRef.current = selectedTraceId;
    setTraces(tracesPropRef.current);
    setDrawMode(previousId === undefined ? defaultDrawMode : 'none');
  }, [selectedTraceId, setTraces, defaultDrawMode]);

  const [layerPanelProps, setLayerPanelProps] = useState<Parameters<typeof MapLayerPanel>[0] | null>(null);

  const handleLayerControlReady = useCallback((props: Parameters<typeof MapLayerPanel>[0]) => {
    setLayerPanelProps(props);
  }, []);

  const handleDrawModeChange = useCallback(
    (mode: DrawMode) => {
      if (mode === 'draw' && drawMode !== 'draw' && selectedTraceId) {
        setTraces((prev) =>
          updateSelectedTraceLines(prev, selectedTraceId, emptyTraceLine())
        );
      }
      if (mode === 'auto' && drawMode !== 'auto') {
        setAutoWaypoints([]);
      }
      setDrawMode(mode);
    },
    [drawMode, selectedTraceId, setTraces, setAutoWaypoints]
  );

  const handleTraceLinesChange = useCallback(
    (lines: TraceLines) => {
      if (!selectedTraceId) return;
      setTraces((prev) => updateSelectedTraceLines(prev, selectedTraceId, lines));
    },
    [selectedTraceId, setTraces]
  );

  const handleTraceEdit = useCallback(
    (lng: number, lat: number) => {
      const [x, y] = wgs84ToRd(lng, lat);

      if (drawMode === 'auto') {
        setAutoWaypoints((prev) => [...prev, { x, y }]);
        return;
      }

      if (!selectedTraceId || drawMode === 'none') return;

      setTraces((prev) => {
        const trace = prev.find((t) => t.id === selectedTraceId);
        if (!trace) return prev;

        const lines = getTraceLines(trace);
        const defaultZ = lines.flat().at(-1)?.[2] ?? -0.65;

        if (drawMode === 'draw') {
          return updateSelectedTraceLines(
            prev,
            selectedTraceId,
            appendVertex(lines, x, y, defaultZ)
          );
        }

        if (drawMode === 'edit') {
          const existing = findNearestVertex(lines, x, y);
          if (existing) {
            return prev;
          }

          const segment = findNearestSegmentInsert(lines, x, y);
          if (segment) {
            const z =
              lines[segment.lineIdx][segment.insertAfterIdx]?.[2] ?? defaultZ;
            return updateSelectedTraceLines(
              prev,
              selectedTraceId,
              insertVertexAfter(lines, segment.lineIdx, segment.insertAfterIdx, x, y, z)
            );
          }

          return updateSelectedTraceLines(
            prev,
            selectedTraceId,
            appendVertex(lines, x, y, defaultZ)
          );
        }

        return prev;
      });
    },
    [selectedTraceId, drawMode, setTraces, setAutoWaypoints]
  );

  const handleClearDraw = useCallback(() => {
    if (drawMode === 'auto') {
      setAutoWaypoints([]);
      return;
    }
    if (!selectedTraceId) return;
    setTraces((prev) =>
      updateSelectedTraceLines(prev, selectedTraceId, emptyTraceLine())
    );
  }, [drawMode, selectedTraceId, setTraces, setAutoWaypoints]);

  const handleRestoreDemo = useCallback(() => {
    setTraces(tracesProp);
    setDrawMode('none');
    setAutoWaypoints([]);
  }, [setTraces, tracesProp, setAutoWaypoints]);

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      <div className="w-full shrink-0 overflow-auto border-b border-border bg-card p-3 lg:w-52 lg:border-b-0 lg:border-r xl:w-56">
        {layerPanelProps && <MapLayerPanel {...layerPanelProps} />}
        <MapDisplayControls
          traceLineWidth={traceLineWidth}
          onTraceLineWidthChange={setTraceLineWidth}
          multiLineMode={multiLineMode}
          onMultiLineModeChange={setMultiLineMode}
          drawMode={drawMode}
          onDrawModeChange={handleDrawModeChange}
          onClearDraw={handleClearDraw}
          onRestoreDemo={handleRestoreDemo}
          editable={editable}
        />
      </div>
      <div className="min-h-[400px] flex-1">
        <TraceMap
          traces={traces}
          bestaandNet={bestaandNet}
          conflicten={conflicten}
          layerData={layerData}
          lazyLayers={lazyLayers}
          loadingLayers={lazy.loadingLayers}
          selectedTraceId={selectedTraceId}
          selectedConflictId={selectedConflictId}
          dataSource={dataSource}
          height={height}
          showLayerPanel={false}
          onLayerControlReady={handleLayerControlReady}
          onViewportChange={lazyLayers ? lazy.onViewportChange : undefined}
          onLayerToggle={lazyLayers ? lazy.onLayerToggle : undefined}
          traceLineWidth={traceLineWidth}
          multiLineMode={multiLineMode}
          drawMode={drawMode}
          autoWaypoints={autoWaypoints}
          routeAlternatives={routeAlternatives}
          onMapClick={handleTraceEdit}
          onTraceLinesChange={handleTraceLinesChange}
        />
      </div>
    </div>
  );
}
