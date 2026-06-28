'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TraceMap, type MapLayerData, type MapNet, type MapTrace } from '@/components/trace-map-dynamic';
import type { CadOpties, TekenStatus } from '@/components/trace-map';
import { offsetPolyline, trimPolyline, extendPolyline } from '@/lib/map/teken-gereedschap';
import type { Bemating } from '@/lib/map/bemating';
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
  breakLine,
  findNearestSegmentInsert,
  findNearestVertex,
  getTraceLines,
  insertVertexAfter,
  joinLines,
  reverseLine,
  type TraceLine,
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
  markedSegments?: {
    marker: 'ok' | 'door_bebouwing' | 'door_privaat';
    coordinates: [number, number, number][];
  }[];
  /** Particuliere percelen met zakelijk recht (ZRO) — gemarkeerd op de tekening */
  zroPercelen?: {
    perceelnummer: string;
    polygon: [number, number][];
    eigenaar: string;
    status: string;
    lengteM: number;
    oppervlakteM2?: number;
  }[];
  /** Netontwerp-assets op de kaart (stations/moffen/mantelbuizen) */
  netontwerpAssets?: { punten: GeoJSON.Feature[]; lijnen: GeoJSON.Feature[] };
  /** Bodem-vooronderzoek WBB-signalen (4326 GeoJSON) als laag op de kaart. */
  bodemSignalen?: GeoJSON.FeatureCollection;
  /** Plaatsmodus: kaartklik plaatst een asset (RD-coördinaten) i.p.v. tracé-bewerking */
  onAssetPlaats?: (x: number, y: number) => void;
  onAssetClick?: (assetId: string) => void;
  onAssetVerplaats?: (assetId: string, x: number, y: number) => void;
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

function updateSelectedTraceBematingen(
  traces: MapTrace[],
  selectedTraceId: string,
  updater: (b: Bemating[]) => Bemating[]
): MapTrace[] {
  return traces.map((t) =>
    t.id === selectedTraceId ? { ...t, bematingen: updater(t.bematingen ?? []) } : t
  );
}

/** Alle lijnen op de kaart als snij-/grenslijnen (andere tracés + bestaand net). */
function verzamelLijnen(
  traces: MapTrace[],
  bestaandNet: MapNet[],
  excludeTraceId: string,
  excludeLineIdx: number
): TraceLine[] {
  const uit: TraceLine[] = [];
  for (const t of traces) {
    const lijnen = getTraceLines(t);
    lijnen.forEach((l, i) => {
      if (t.id === excludeTraceId && i === excludeLineIdx) return;
      if (l.length >= 2) uit.push(l.map(([x, y, z]) => [x, y, z ?? -0.65] as [number, number, number]));
    });
  }
  for (const net of bestaandNet) {
    if (net.coordinates.length >= 2) {
      uit.push(net.coordinates.map(([x, y, z]) => [x, y, z ?? -0.65] as [number, number, number]));
    }
  }
  return uit;
}

/** Index van de lijn die het dichtst bij (x,y) ligt; -1 als er geen lijn is. */
function naasteLijnIdx(lines: TraceLines, x: number, y: number): number {
  const seg = findNearestSegmentInsert(lines, x, y, Number.MAX_SAFE_INTEGER);
  return seg?.lineIdx ?? -1;
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
  markedSegments = [],
  zroPercelen = [],
  netontwerpAssets,
  bodemSignalen,
  onAssetPlaats,
  onAssetClick,
  onAssetVerplaats,
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

  /** CAD-opties (OSNAP/ORTHO), meetfunctie en tekenstatusbalk */
  const [cadOpties, setCadOpties] = useState<CadOpties>({ osnap: true, ortho: false });
  const [meetPunten, setMeetPunten] = useState<{ x: number; y: number }[]>([]);
  const [tekenStatus, setTekenStatus] = useState<TekenStatus | null>(null);
  /** Lopende bematingsplaatsing: verzamelde punten + oplopend nummer voor de id. */
  const [bematingPunten, setBematingPunten] = useState<[number, number][]>([]);
  const bematingNrRef = useRef(0);

  /** Undo-/redo-stapels (Ctrl+Z / Ctrl+Shift+Z): snapshots van het geselecteerde tracé. */
  const undoStackRef = useRef<TraceLines[]>([]);
  const redoStackRef = useRef<TraceLines[]>([]);
  const pushUndo = useCallback(
    (huidigeTraces: MapTrace[]) => {
      if (!selectedTraceId) return;
      const trace = huidigeTraces.find((t) => t.id === selectedTraceId);
      if (!trace) return;
      undoStackRef.current.push(getTraceLines(trace));
      redoStackRef.current = [];
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    },
    [selectedTraceId],
  );

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
      setTraces((prev) => {
        pushUndo(prev);
        return updateSelectedTraceLines(prev, selectedTraceId, lines);
      });
    },
    [selectedTraceId, setTraces, pushUndo]
  );

  // Sneltoetsen: Ctrl/Cmd+Z = laatste tekenstap terug, Esc = modus verlaten
  useEffect(() => {
    if (!editable) return;
    const onKey = (e: KeyboardEvent) => {
      const doel = e.target as HTMLElement | null;
      if (doel && ['INPUT', 'TEXTAREA', 'SELECT'].includes(doel.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
        // Redo (Ctrl/Cmd+Shift+Z)
        const volgende = redoStackRef.current.pop();
        if (volgende && selectedTraceId) {
          e.preventDefault();
          setTraces((prev) => {
            const trace = prev.find((t) => t.id === selectedTraceId);
            if (trace) undoStackRef.current.push(getTraceLines(trace));
            return updateSelectedTraceLines(prev, selectedTraceId, volgende);
          });
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        const vorige = undoStackRef.current.pop();
        if (vorige && selectedTraceId) {
          e.preventDefault();
          setTraces((prev) => {
            const trace = prev.find((t) => t.id === selectedTraceId);
            if (trace) redoStackRef.current.push(getTraceLines(trace));
            return updateSelectedTraceLines(prev, selectedTraceId, vorige);
          });
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCadOpties((o) => ({ ...o, osnap: !o.osnap }));
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCadOpties((o) => ({ ...o, ortho: !o.ortho }));
      } else if (e.key === 'Escape') {
        if (drawMode === 'meten' || meetPunten.length) setMeetPunten([]);
        if (bematingPunten.length) setBematingPunten([]);
        if (drawMode !== 'none') setDrawMode('none');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editable, selectedTraceId, drawMode, meetPunten.length, bematingPunten.length, setTraces]);

  const handleTraceEdit = useCallback(
    (lng: number, lat: number, modifiers?: { alt: boolean }) => {
      const [x, y] = wgs84ToRd(lng, lat);

      if (drawMode === 'meten') {
        setMeetPunten((prev) => [...prev, { x, y }]);
        return;
      }

      if (onAssetPlaats) {
        onAssetPlaats(x, y);
        return;
      }

      if (drawMode === 'auto') {
        setAutoWaypoints((prev) => [...prev, { x, y }]);
        return;
      }

      if (!selectedTraceId || drawMode === 'none') return;

      // Bemating plaatsen: punten verzamelen (snap op hoekpunten) tot compleet
      if (drawMode === 'dim-lineair' || drawMode === 'dim-hoek') {
        const trace = traces.find((t) => t.id === selectedTraceId);
        const lines = trace ? getTraceLines(trace) : [];
        const snap = findNearestVertex(lines, x, y, 12);
        const punt: [number, number] = snap
          ? [lines[snap.lineIdx][snap.vertexIdx][0], lines[snap.lineIdx][snap.vertexIdx][1]]
          : [x, y];
        const nodig = drawMode === 'dim-lineair' ? 2 : 3;
        const verzameld = [...bematingPunten, punt];
        if (verzameld.length >= nodig) {
          const id = `dim-${++bematingNrRef.current}`;
          const bemating: Bemating =
            drawMode === 'dim-lineair'
              ? { id, type: 'lineair', punten: verzameld.slice(0, 2), offsetM: 4 }
              : { id, type: 'hoek', punten: verzameld.slice(0, 3) };
          setBematingPunten([]);
          setTraces((prev) => updateSelectedTraceBematingen(prev, selectedTraceId, (b) => [...b, bemating]));
        } else {
          setBematingPunten(verzameld);
        }
        return;
      }

      setTraces((prev) => {
        const trace = prev.find((t) => t.id === selectedTraceId);
        if (!trace) return prev;

        const lines = getTraceLines(trace);
        const defaultZ = lines.flat().at(-1)?.[2] ?? -0.65;

        // CAD-bewerken: trim / extend / break / join / reverse
        if (drawMode === 'reverse') {
          const idx = naasteLijnIdx(lines, x, y);
          if (idx < 0) return prev;
          pushUndo(prev);
          return updateSelectedTraceLines(prev, selectedTraceId, reverseLine(lines, idx));
        }
        if (drawMode === 'break') {
          const idx = naasteLijnIdx(lines, x, y);
          if (idx < 0) return prev;
          const gebroken = breakLine(lines, idx, x, y);
          if (gebroken === lines) return prev;
          pushUndo(prev);
          return updateSelectedTraceLines(prev, selectedTraceId, gebroken);
        }
        if (drawMode === 'join') {
          if (lines.length < 2) return prev;
          // Twee lijnen met het dichtstbijzijnde uiteinde bij de klik
          const opAfstand = lines
            .map((l, i) => ({
              i,
              d: Math.min(
                Math.hypot(l[0][0] - x, l[0][1] - y),
                Math.hypot(l[l.length - 1][0] - x, l[l.length - 1][1] - y)
              ),
            }))
            .sort((a, b) => a.d - b.d);
          const [a, b] = opAfstand;
          if (!a || !b) return prev;
          const samen = joinLines(lines, a.i, b.i, 50);
          if (samen.length === lines.length) return prev;
          pushUndo(prev);
          return updateSelectedTraceLines(prev, selectedTraceId, samen);
        }
        if (drawMode === 'trim') {
          const idx = naasteLijnIdx(lines, x, y);
          if (idx < 0) return prev;
          const snijlijnen = verzamelLijnen(prev, bestaandNet, selectedTraceId, idx);
          const res = trimPolyline(lines[idx], snijlijnen, x, y);
          if (!res || res.length === 0) return prev;
          pushUndo(prev);
          const next = lines.map((l) => l.map((c) => [...c] as [number, number, number]));
          next.splice(idx, 1, ...res);
          return updateSelectedTraceLines(prev, selectedTraceId, next);
        }
        if (drawMode === 'extend') {
          const idx = naasteLijnIdx(lines, x, y);
          if (idx < 0) return prev;
          const grenslijnen = verzamelLijnen(prev, bestaandNet, selectedTraceId, idx);
          const res = extendPolyline(lines[idx], grenslijnen, x, y);
          if (!res) return prev;
          pushUndo(prev);
          const next = lines.map((l) => l.map((c) => [...c] as [number, number, number]));
          next[idx] = res;
          return updateSelectedTraceLines(prev, selectedTraceId, next);
        }

        pushUndo(prev);

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
            // Alt+klik = punt verwijderen (CAD-conventie)
            if (modifiers?.alt && lines[existing.lineIdx].length > 2) {
              const zonder = lines.map((line, li) =>
                li === existing.lineIdx ? line.filter((_, vi) => vi !== existing.vertexIdx) : line,
              );
              return updateSelectedTraceLines(prev, selectedTraceId, zonder);
            }
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
    [
      selectedTraceId,
      drawMode,
      setTraces,
      setAutoWaypoints,
      pushUndo,
      traces,
      bestaandNet,
      bematingPunten,
    ]
  );

  /** Parallel kopiëren: offset van de eerste lijn als extra lijn in het tracé. */
  const handleOffset = useCallback(
    (afstandM: number) => {
      if (!selectedTraceId) return;
      setTraces((prev) => {
        const trace = prev.find((t) => t.id === selectedTraceId);
        if (!trace) return prev;
        const lines = getTraceLines(trace).filter((l) => l.length >= 2);
        if (lines.length === 0) return prev;
        pushUndo(prev);
        const parallel = offsetPolyline(lines[lines.length - 1], afstandM);
        return updateSelectedTraceLines(prev, selectedTraceId, [...lines, parallel]);
      });
    },
    [selectedTraceId, setTraces, pushUndo],
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
      <div className="max-h-[40dvh] w-full shrink-0 overflow-auto border-b border-border bg-card p-3 lg:max-h-none lg:w-52 lg:border-b-0 lg:border-r xl:w-56">
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
          cadOpties={cadOpties}
          onCadOptiesChange={setCadOpties}
          onOffset={editable && selectedTraceId ? handleOffset : undefined}
        />
      </div>
      <div className="relative min-h-[280px] min-w-0 flex-1 lg:min-h-0">
        {(drawMode !== 'none' || tekenStatus) && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center gap-3 bg-slate-900/85 px-3 py-1 font-mono text-[10px] text-slate-200">
            <span>
              {tekenStatus
                ? `X ${tekenStatus.rdX.toFixed(1)}  Y ${tekenStatus.rdY.toFixed(1)}`
                : 'RD —'}
            </span>
            {tekenStatus?.lengteM !== undefined && (
              <span className="text-sky-300">
                L {tekenStatus.lengteM.toFixed(1)} m ∠{tekenStatus.hoekDeg?.toFixed(0)}°
              </span>
            )}
            {tekenStatus?.maatBuffer && (
              <span className="text-amber-300">maat: {tekenStatus.maatBuffer} m ⏎</span>
            )}
            {tekenStatus?.snapType && (
              <span className="text-emerald-300">SNAP {tekenStatus.snapType}</span>
            )}
            <span className="ml-auto flex gap-2">
              <span className={cadOpties.osnap ? 'text-emerald-300' : 'opacity-40'}>OSNAP</span>
              <span className={cadOpties.ortho ? 'text-emerald-300' : 'opacity-40'}>ORTHO</span>
              <span className="opacity-60">{drawMode.toUpperCase()}</span>
            </span>
          </div>
        )}
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
          markedSegments={markedSegments}
          zroPercelen={zroPercelen}
          onMapClick={handleTraceEdit}
          onTraceLinesChange={handleTraceLinesChange}
          cadOpties={cadOpties}
          onTekenStatus={setTekenStatus}
          meetPunten={meetPunten}
          bematingen={traces.find((t) => t.id === selectedTraceId)?.bematingen}
          bematingPunten={bematingPunten}
          netontwerpAssets={netontwerpAssets}
          bodemSignalen={bodemSignalen}
          plaatsModusActief={Boolean(onAssetPlaats)}
          onAssetClick={onAssetClick}
          onAssetVerplaats={onAssetVerplaats}
        />
      </div>
    </div>
  );
}
