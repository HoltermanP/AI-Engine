'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ActionContextBanner } from '@/components/action-context-banner';
import { TracePhaseNav, TracePhaseNextButton } from '@/components/trace-phase-nav';
import { TraceFase1Panel } from '@/components/trace-fase1-panel';
import { TraceFase2Panel } from '@/components/trace-fase2-panel';
import { TraceEngineeringPanel } from '@/components/trace-engineering-panel';
import { SourceBadge } from '@/components/source-badge';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { PersistedTraceToets } from '@/lib/services/trace-toets';
import {
  isPersistedToetsValidForGeometry,
  traceGeometryFingerprint,
} from '@/lib/services/trace-toets';
import type { PhaseStatus, TracePhase } from '@/lib/process/phases';
import { toetsTraceAction } from '@/lib/actions/trace';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';
import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import type { ProjectAction } from '@/demo/project-actions';
import type { MapTrace } from '@/components/trace-map';
import { demoTraceToMapTrace, normalizeTraceCoordinates } from '@/lib/trace-edit';
import { saveManualTraceAction } from '@/lib/actions/trace-routing';

interface TraceWorkspaceProps {
  projectId: string;
  trace: DemoTrace;
  allTraces: DemoTrace[];
  initialBestaandNet: DemoBestaandNet[];
  linkedAction?: ProjectAction | null;
  initialPhase?: TracePhase | null;
  initialCollected?: CollectedTraceData | null;
  initialToets?: PersistedTraceToets | null;
  anthropicConfigured?: boolean;
}

type StapStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

export function TraceWorkspace({
  projectId,
  trace,
  allTraces,
  initialBestaandNet,
  linkedAction: linkedActionProp,
  initialPhase,
  initialCollected,
  initialToets,
  anthropicConfigured = false,
}: TraceWorkspaceProps) {
  const searchParams = useSearchParams();
  const actieId = searchParams.get('actie');
  const linkedAction = linkedActionProp ?? null;
  const [showActionBanner, setShowActionBanner] = useState(
    Boolean(linkedAction && linkedAction.status !== 'afgerond')
  );

  const [activePhase, setActivePhase] = useState<TracePhase>(initialPhase ?? 'fase1');
  const mapTracesRef = useRef<MapTrace[]>([]);
  const [mapTraces, setMapTraces] = useState<MapTrace[]>(() => {
    const initial = allTraces.map(demoTraceToMapTrace);
    mapTracesRef.current = initial;
    return initial;
  });
  const [collected, setCollected] = useState<CollectedTraceData | null>(
    initialCollected ?? null
  );
  const [conflicten, setConflicten] = useState<DetectedConflict[]>(
    initialToets?.conflicten ?? []
  );
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [toetsStatus, setToetsStatus] = useState<StapStatus>(
    initialToets?.status ?? 'open'
  );
  const [engineeringStatuses, setEngineeringStatuses] = useState<Partial<Record<TracePhase, PhaseStatus>>>({});

  const mapNet = useMemo(
    () =>
      (collected?.bestaandNet ?? initialBestaandNet).map((n) => ({
        id: n.id,
        thema: n.thema,
        beheerder: n.beheerder,
        coordinates: n.coordinates,
        vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
      })),
    [collected?.bestaandNet, initialBestaandNet]
  );

  const phaseStatuses = useMemo((): Partial<Record<TracePhase, PhaseStatus>> => {
    const fase2: PhaseStatus =
      toetsStatus === 'gereed'
        ? 'gereed'
        : toetsStatus === 'blokkerend'
        ? 'blokkerend'
        : toetsStatus === 'bezig'
        ? 'bezig'
        : 'open';

    return {
      fase1: 'gereed',
      fase2,
      ...engineeringStatuses,
    };
  }, [toetsStatus, engineeringStatuses]);

  const handlePhaseStatusesChange = useCallback(
    (statuses: Partial<Record<TracePhase, PhaseStatus>>) => {
      setEngineeringStatuses((prev) => ({ ...prev, ...statuses }));
    },
    []
  );

  function handleCollected(data: CollectedTraceData) {
    setCollected(data);
  }

  function handleConflicten(result: DetectedConflict[], status: StapStatus) {
    setConflicten(result);
    setSelectedConflictId(null);
    setToetsStatus(status);
  }

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaveMelding, setAutosaveMelding] = useState<string | null>(null);

  const handleMapTracesChange = useCallback(
    (traces: MapTrace[]) => {
      const prevActive = mapTracesRef.current.find((t) => t.id === trace.id);
      const nextActive = traces.find((t) => t.id === trace.id);
      mapTracesRef.current = traces;
      setMapTraces(traces);

      if (prevActive && nextActive) {
        const prevFp = traceGeometryFingerprint(prevActive.coordinates);
        const nextFp = traceGeometryFingerprint(nextActive.coordinates);
        if (prevFp !== nextFp) {
          setToetsStatus('open');
          setConflicten([]);

          // Direct opslaan na vertex-bewerking (debounce zodat slepen niet per pixel opslaat)
          if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
          setAutosaveMelding('Wijziging wordt opgeslagen…');
          autosaveTimer.current = setTimeout(async () => {
            const lines = (nextActive.traceLines ?? [nextActive.coordinates]).filter(
              (l) => l.length >= 2
            );
            const result = await saveManualTraceAction(
              trace.id,
              normalizeTraceCoordinates(nextActive.coordinates),
              lines.map((l) => normalizeTraceCoordinates(l)),
              trace.wegnaam
            );
            setAutosaveMelding(
              result.ok ? 'Tracéwijziging opgeslagen' : `Opslaan mislukt: ${result.error}`
            );
            setTimeout(() => setAutosaveMelding(null), 4000);
          }, 1200);
        }
      }
    },
    [trace.id, trace.wegnaam]
  );

  const getActiveTraceCoordinates = useCallback((): [number, number, number][] => {
    const active = mapTraces.find((t) => t.id === trace.id);
    if (!active) return normalizeTraceCoordinates(trace.coordinates);
    return normalizeTraceCoordinates(active.coordinates);
  }, [mapTraces, trace.coordinates, trace.id]);

  const bootstrapTraceId = useRef<string | null>(null);

  useEffect(() => {
    if (initialPhase) setActivePhase(initialPhase);
  }, [initialPhase, trace.id]);

  useEffect(() => {
    setShowActionBanner(Boolean(linkedAction && linkedAction.status !== 'afgerond'));
  }, [linkedAction, trace.id]);

  useEffect(() => {
    bootstrapTraceId.current = null;
    const nextMapTraces = allTraces.map(demoTraceToMapTrace);
    mapTracesRef.current = nextMapTraces;
    setMapTraces(nextMapTraces);

    if (initialCollected?.traceId === trace.id) {
      setCollected(initialCollected);
      bootstrapTraceId.current = trace.id;
    } else {
      setCollected(null);
    }

    const coords = nextMapTraces.find((t) => t.id === trace.id)?.coordinates ?? trace.coordinates;
    if (isPersistedToetsValidForGeometry(initialToets, coords) && initialToets) {
      setConflicten(initialToets.conflicten);
      setToetsStatus(initialToets.status);
    } else {
      setConflicten([]);
      setToetsStatus('open');
    }
  }, [trace.id, allTraces, initialCollected, initialToets, trace.coordinates]);

  // Herstel: data aanwezig maar toets nooit afgerond — alleen in fase 2 (niet bij elke pageload)
  useEffect(() => {
    if (activePhase !== 'fase2') return;
    if (!collected || toetsStatus === 'gereed' || toetsStatus === 'blokkerend' || toetsStatus === 'bezig') {
      return;
    }

    let cancelled = false;
    setToetsStatus('bezig');

    const timeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('[trace-workspace] automatische toets timeout');
        setToetsStatus('open');
      }
    }, 90_000);

    toetsTraceAction(trace.id, collected, getActiveTraceCoordinates())
      .then((conflicts) => {
        if (cancelled) return;
        setConflicten(conflicts);
        setToetsStatus(
          conflicts.some((c) => c.ernst === 'blokkerend') ? 'blokkerend' : 'gereed'
        );
      })
      .catch(() => {
        if (!cancelled) setToetsStatus('open');
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activePhase, collected, toetsStatus, trace.id, getActiveTraceCoordinates]);

  const isEngineeringPhase =
    activePhase === 'fase3' || activePhase === 'fase4' || activePhase === 'output';
  const engineeringPhase = isEngineeringPhase ? activePhase : 'fase3';

  return (
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        <div className="workspace-header flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-[#2D6FE8]/10 hover:text-[#2D6FE8]"
          >
            <ChevronLeft className="h-3 w-3" />
            Project
          </Link>
          <div className="flex min-w-0 shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-border/60">
            <span
              className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
              style={{ backgroundColor: trace.kleur }}
            />
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-[#0D1428]">
              {trace.code}
            </h1>
            <SourceBadge source="live" />
          </div>
          <p className="hidden min-w-0 truncate text-sm text-muted-foreground sm:block">
            {trace.naam}
          </p>
          {autosaveMelding && (
            <span className="ml-auto shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
              {autosaveMelding}
            </span>
          )}
        </div>

        {linkedAction && showActionBanner && linkedAction.status !== 'afgerond' && (
          <ActionContextBanner action={linkedAction} onDismiss={() => setShowActionBanner(false)} />
        )}

        <TracePhaseNav
          activePhase={activePhase}
          onPhaseChange={setActivePhase}
          phaseStatuses={phaseStatuses}
        />

        <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
          {activePhase === 'fase1' && (
            <>
            <TraceFase1Panel
              trace={trace}
              mapTraces={mapTraces}
              onMapTracesChange={handleMapTracesChange}
              bestaandNet={mapNet}
              anthropicConfigured={anthropicConfigured}
            />
            <TracePhaseNextButton
              currentPhase={activePhase}
              onPhaseChange={setActivePhase}
              phaseStatuses={phaseStatuses}
            />
            </>
          )}

          {activePhase === 'fase2' && (
            <>
            <div className="min-h-0 flex-1 overflow-hidden">
            <TraceFase2Panel
              traceId={trace.id}
              traces={mapTraces}
              onTracesChange={handleMapTracesChange}
              bestaandNet={mapNet}
              collected={collected}
              conflicten={conflicten}
              selectedTraceId={trace.id}
              selectedConflictId={selectedConflictId}
              toetsStatus={toetsStatus}
              onCollected={handleCollected}
              onToetsStart={() => setToetsStatus('bezig')}
              onConflicten={handleConflicten}
              onSelectConflict={setSelectedConflictId}
            />
            </div>
            <TracePhaseNextButton
              currentPhase={activePhase}
              onPhaseChange={setActivePhase}
              phaseStatuses={phaseStatuses}
            />
            </>
          )}

          <div className={cn('min-h-0 flex-1 overflow-hidden flex flex-col', !isEngineeringPhase && 'hidden')}>
            <div className="min-h-0 flex-1 overflow-hidden">
            <TraceEngineeringPanel
              projectId={projectId}
              traceId={trace.id}
              traceCode={trace.code}
              trace={trace}
              phase={engineeringPhase}
              collected={collected}
              conflicten={conflicten}
              dataStatus={collected ? 'gereed' : 'open'}
              toetsStatus={toetsStatus}
              onPhaseStatusesChange={handlePhaseStatusesChange}
              linkedActionId={actieId ?? undefined}
              anthropicConfigured={anthropicConfigured}
            />
            </div>
            {isEngineeringPhase && (
              <TracePhaseNextButton
                currentPhase={activePhase}
                onPhaseChange={setActivePhase}
                phaseStatuses={phaseStatuses}
              />
            )}
          </div>
        </div>
      </div>
  );
}
