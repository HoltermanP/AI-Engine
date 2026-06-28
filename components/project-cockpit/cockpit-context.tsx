'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { MapNet, MapTrace } from '@/components/trace-map';
import type { DemoTrace } from '@/demo/traces';
import type { DrawMode } from '@/components/map-display-controls';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { TraceWaypoint } from '@/lib/services/trace-routing';
import { saveManualTraceAction } from '@/lib/actions/trace-routing';
import { normalizeTraceCoordinates } from '@/lib/trace-edit';
import { traceGeometryFingerprint } from '@/lib/services/trace-toets';

/**
 * Per-stap kaart-configuratie die het actieve zijpaneel publiceert.
 * De gedeelde props (traces/bestaandNet/selectedTraceId/conflicten) worden NIET
 * hier gezet — die levert de cockpit altijd zelf, zodat de kaart gemount blijft.
 */
export interface CockpitMapConfig {
  editable?: boolean;
  defaultDrawMode?: DrawMode;
  autoWaypoints?: TraceWaypoint[];
  onAutoWaypointsChange?: (w: TraceWaypoint[]) => void;
  onLayerDataChange?: (data: import('@/components/trace-map').MapLayerData) => void;
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
  netontwerpAssets?: { punten: GeoJSON.Feature[]; lijnen: GeoJSON.Feature[] };
  onAssetPlaats?: (x: number, y: number) => void;
  onAssetClick?: (assetId: string) => void;
  onAssetVerplaats?: (assetId: string, x: number, y: number) => void;
  bodemSignalen?: GeoJSON.FeatureCollection;
}

const DEFAULT_MAP_CONFIG: CockpitMapConfig = { editable: false, defaultDrawMode: 'none' };

export type TraceToetsStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

interface CockpitContextValue {
  projectId: string;
  /** Rijke tracé-metadata (discipline, nettype, dekking) per tracé. */
  allTraces: DemoTrace[];
  // Gedeelde, stap-overstijgende state
  traces: MapTrace[];
  setTraces: (updater: MapTrace[] | ((prev: MapTrace[]) => MapTrace[])) => void;
  selectedTraceId: string | undefined;
  setSelectedTraceId: (id: string | undefined) => void;
  bestaandNet: MapNet[];
  collected: CollectedTraceData | null;
  setCollected: (c: CollectedTraceData | null) => void;
  conflicten: DetectedConflict[];
  setConflicten: (c: DetectedConflict[]) => void;
  selectedConflictId: string | null;
  setSelectedConflictId: (id: string | null) => void;
  toetsStatus: TraceToetsStatus;
  setToetsStatus: (s: TraceToetsStatus) => void;
  autosaveMelding: string | null;
  /** Schrijf een openstaande wijziging direct weg (bij een vervolgactie/stapwissel). */
  flushPendingSaves: () => Promise<void>;
  // Per-stap kaart-config (gepubliceerd via useCockpitMap)
  mapConfig: CockpitMapConfig;
  setMapConfig: (config: CockpitMapConfig) => void;
}

const CockpitContext = createContext<CockpitContextValue | null>(null);

export interface CockpitProviderProps {
  projectId: string;
  allTraces: DemoTrace[];
  initialTraces: MapTrace[];
  initialSelectedTraceId?: string;
  bestaandNet: MapNet[];
  initialCollected?: CollectedTraceData | null;
  initialConflicten?: DetectedConflict[];
  children: ReactNode;
}

export function CockpitProvider({
  projectId,
  allTraces,
  initialTraces,
  initialSelectedTraceId,
  bestaandNet,
  initialCollected = null,
  initialConflicten = [],
  children,
}: CockpitProviderProps) {
  const [traces, setTracesState] = useState<MapTrace[]>(initialTraces);
  const tracesRef = useRef<MapTrace[]>(initialTraces);
  const [selectedTraceId, setSelectedTraceId] = useState<string | undefined>(
    initialSelectedTraceId ?? initialTraces[0]?.id
  );
  const [collected, setCollected] = useState<CollectedTraceData | null>(initialCollected);
  const [conflicten, setConflicten] = useState<DetectedConflict[]>(initialConflicten);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [toetsStatus, setToetsStatus] = useState<TraceToetsStatus>(
    initialConflicten.length > 0 ? 'gereed' : 'open'
  );
  const [autosaveMelding, setAutosaveMelding] = useState<string | null>(null);
  const [mapConfig, setMapConfig] = useState<CockpitMapConfig>(DEFAULT_MAP_CONFIG);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nog niet weggeschreven save (laatste wijziging) — direct flushbaar bij een
  // vervolgactie (stapwissel) zodat er nooit iets verloren gaat.
  const pendingSaveRef = useRef<null | (() => Promise<void>)>(null);
  const selectedRef = useRef(selectedTraceId);
  selectedRef.current = selectedTraceId;

  const voerTraceSaveUit = useCallback(async (id: string, active: MapTrace) => {
    const lines = (active.traceLines ?? [active.coordinates]).filter((l) => l.length >= 2);
    const result = await saveManualTraceAction(
      id,
      normalizeTraceCoordinates(active.coordinates),
      lines.map((l) => normalizeTraceCoordinates(l))
    );
    setAutosaveMelding(
      result.ok ? 'Tracéwijziging opgeslagen' : `Opslaan mislukt: ${result.error}`
    );
    setTimeout(() => setAutosaveMelding(null), 4000);
  }, []);

  /**
   * Schrijf een eventueel openstaande wijziging direct weg (annuleert de
   * debounce). Aan te roepen bij elke vervolgactie, zoals een stapwissel —
   * "altijd opslaan bij een volgende actie".
   */
  const flushPendingSaves = useCallback(async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    const fn = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (fn) await fn();
  }, []);

  /**
   * Gedeelde tracé-mutatie met debounce-autosave: zodra de geometrie van het
   * geselecteerde tracé wijzigt, slaan we hem op. Eén bron van waarheid voor
   * álle stappen (tekenen, netontwerp), zodat een wijziging overal zichtbaar is.
   */
  const setTraces = useCallback(
    (updater: MapTrace[] | ((prev: MapTrace[]) => MapTrace[])) => {
      const prev = tracesRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      tracesRef.current = next;
      setTracesState(next);

      const id = selectedRef.current;
      if (!id) return;
      const prevActive = prev.find((t) => t.id === id);
      const nextActive = next.find((t) => t.id === id);
      if (!prevActive || !nextActive) return;
      if (
        traceGeometryFingerprint(prevActive.coordinates) ===
        traceGeometryFingerprint(nextActive.coordinates)
      ) {
        return;
      }

      // Toets verloopt bij geometriewijziging; conflicten leeg tot her-toets.
      setConflicten([]);
      setToetsStatus('open');

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      setAutosaveMelding('Wijziging wordt opgeslagen…');
      // Bewaar de save zodat een vervolgactie hem desnoods direct kan flushen
      pendingSaveRef.current = () => voerTraceSaveUit(id, nextActive);
      autosaveTimer.current = setTimeout(() => {
        const fn = pendingSaveRef.current;
        pendingSaveRef.current = null;
        autosaveTimer.current = null;
        void fn?.();
      }, 1200);
    },
    [voerTraceSaveUit]
  );

  useEffect(
    () => () => {
      // Bij unmount nog snel een openstaande wijziging wegschrijven
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      const fn = pendingSaveRef.current;
      pendingSaveRef.current = null;
      void fn?.();
    },
    []
  );

  const value = useMemo<CockpitContextValue>(
    () => ({
      projectId,
      allTraces,
      traces,
      setTraces,
      selectedTraceId,
      setSelectedTraceId,
      bestaandNet,
      collected,
      setCollected,
      conflicten,
      setConflicten,
      selectedConflictId,
      setSelectedConflictId,
      toetsStatus,
      setToetsStatus,
      autosaveMelding,
      flushPendingSaves,
      mapConfig,
      setMapConfig,
    }),
    [
      projectId,
      allTraces,
      traces,
      setTraces,
      selectedTraceId,
      bestaandNet,
      collected,
      conflicten,
      selectedConflictId,
      toetsStatus,
      autosaveMelding,
      flushPendingSaves,
      mapConfig,
    ]
  );

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

export function useCockpit(): CockpitContextValue {
  const ctx = useContext(CockpitContext);
  if (!ctx) throw new Error('useCockpit moet binnen <CockpitProvider> gebruikt worden');
  return ctx;
}

/**
 * Publiceert de kaart-config van de actieve stap naar de gedeelde kaart.
 * Bij unmount valt de config terug op read-only, zodat een stapwissel de
 * vorige tekentools/lagen netjes opruimt zonder de kaart te herladen.
 */
export function useCockpitMap(config: CockpitMapConfig): void {
  const { setMapConfig } = useCockpit();
  useEffect(() => {
    setMapConfig(config);
    return () => setMapConfig(DEFAULT_MAP_CONFIG);
  }, [config, setMapConfig]);
}
