'use client';

import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutoTracePanel } from '@/components/auto-trace-panel';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import { applyTraceLines, demoTraceToMapTrace, normalizeTraceCoordinates } from '@/lib/trace-edit';
import { planAutomaticTraceAction, saveAutoTraceAction, saveManualTraceAction } from '@/lib/actions/trace-routing';
import {
  type TraceRoutingResult,
  type TraceWaypoint,
} from '@/lib/services/trace-routing';
import type { DemoTrace } from '@/demo/traces';
import type { MapLayerData } from '@/components/trace-map';
import { getTraceLines } from '@/lib/trace-edit';

interface TraceFase1PanelProps {
  trace: DemoTrace;
  anthropicConfigured?: boolean;
}

/**
 * Zijpaneel "Tracé tekenen" — bevat de auto-tracé-tools en ontwerpgegevens.
 * De kaart zelf is de gedeelde cockpit-kaart; dit paneel publiceert alleen de
 * tekenconfig (editable + auto-modus + route-alternatieven) en leest/schrijft
 * de gedeelde tracé-state via de cockpit-context.
 */
export function TraceFase1Panel({ trace, anthropicConfigured = false }: TraceFase1PanelProps) {
  const { traces, setTraces, bestaandNet } = useCockpit();
  const [autoWaypoints, setAutoWaypoints] = useState<TraceWaypoint[]>([]);
  const [routingResult, setRoutingResult] = useState<TraceRoutingResult | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [layerDataSnapshot, setLayerDataSnapshot] = useState<MapLayerData | undefined>();

  const activeTrace = traces.find((t) => t.id === trace.id) ?? traces[0];
  const coords = activeTrace?.coordinates ?? trace.coordinates;
  const start = coords[0];
  const end = coords[coords.length - 1];

  const applyAlternativeToMap = useCallback(
    (result: TraceRoutingResult, alternativeId: string) => {
      const alt = result.alternatieven?.find((a) => a.id === alternativeId);
      if (!alt?.traceLines.some((line) => line.length >= 2)) return;
      setTraces((prev) =>
        prev.map((t) => (t.id === trace.id ? applyTraceLines(t, alt.traceLines) : t))
      );
    },
    [setTraces, trace.id]
  );

  const handlePlanTrace = useCallback(async () => {
    if (autoWaypoints.length < 2) {
      setPlanError('Plaats minimaal 2 waypoints op de kaart (modus Auto-tracé moet actief zijn).');
      return;
    }
    setIsPlanning(true);
    setSaveMessage(null);
    setPlanError(null);
    try {
      const result = await planAutomaticTraceAction({
        waypoints: autoWaypoints,
        discipline: trace.discipline,
        projectId: trace.projectId,
        vereisteDekking: trace.vereisteDekking,
        netType: trace.netType,
        layerData: layerDataSnapshot,
        bestaandNet: bestaandNet.map((n) => ({
          id: n.id,
          thema: n.thema,
          beheerder: n.beheerder,
          coordinates: n.coordinates,
          vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
        })),
        useAi: true,
      });

      setRoutingResult(result);
      const primaryId = result.geselecteerdeAlternativeId ?? result.alternatieven?.[0]?.id ?? null;
      setSelectedAlternativeId(primaryId);

      if (!result.alternatieven?.length) {
        const msg =
          result.waarschuwingen.join(' ') ||
          result.blokkades.join(' ') ||
          'Geen route gevonden. Plaats waypoints dichter bij wegen in het demo-gebied.';
        setPlanError(msg);
        return;
      }

      if (primaryId) applyAlternativeToMap(result, primaryId);
    } catch (err) {
      console.error('[handlePlanTrace]', err);
      setPlanError(err instanceof Error ? err.message : 'Tracéberekening mislukt');
    } finally {
      setIsPlanning(false);
    }
  }, [autoWaypoints, trace, layerDataSnapshot, bestaandNet, applyAlternativeToMap]);

  const handleSelectAlternative = useCallback(
    (id: string) => {
      if (!routingResult) return;
      setSelectedAlternativeId(id);
      applyAlternativeToMap(routingResult, id);
      setSaveMessage(null);
    },
    [routingResult, applyAlternativeToMap]
  );

  const handleSaveTrace = useCallback(async () => {
    if (!routingResult || !selectedAlternativeId) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const outcome = await saveAutoTraceAction(trace.id, routingResult, selectedAlternativeId);
      if (outcome.ok) {
        setSaveMessage('Tracé opgeslagen met berekende segmenten.');
        setTraces((prev) =>
          prev.map((t) => (t.id === trace.id ? demoTraceToMapTrace(outcome.trace) : t))
        );
      } else {
        setSaveMessage(`Fout: ${outcome.error}`);
      }
    } catch (err) {
      console.error('[handleSaveTrace]', err);
      setSaveMessage(`Fout: ${err instanceof Error ? err.message : 'Opslaan mislukt'}`);
    } finally {
      setIsSaving(false);
    }
  }, [routingResult, selectedAlternativeId, trace.id, setTraces]);

  const handleSaveManualTrace = useCallback(async () => {
    const active = traces.find((t) => t.id === trace.id);
    if (!active) return;
    const lines = getTraceLines(active);
    const coords = normalizeTraceCoordinates(active.coordinates);
    const normalizedLines = lines.map((line) => normalizeTraceCoordinates(line));
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const outcome = await saveManualTraceAction(trace.id, coords, normalizedLines, trace.wegnaam);
      if (outcome.ok) {
        setSaveMessage('Tracé opgeslagen.');
        setTraces((prev) =>
          prev.map((t) => (t.id === trace.id ? demoTraceToMapTrace(outcome.trace) : t))
        );
      } else {
        setSaveMessage(`Fout: ${outcome.error}`);
      }
    } catch (err) {
      console.error('[handleSaveManualTrace]', err);
      setSaveMessage(`Fout: ${err instanceof Error ? err.message : 'Opslaan mislukt'}`);
    } finally {
      setIsSaving(false);
    }
  }, [traces, trace.id, trace.wegnaam, setTraces]);

  const routeAlternatives = useMemo(() => {
    if (!routingResult?.alternatieven?.length) return [];
    return routingResult.alternatieven.map((alt) => ({
      id: alt.id,
      label: alt.label,
      traceLines: alt.traceLines,
      selected: alt.id === selectedAlternativeId,
    }));
  }, [routingResult, selectedAlternativeId]);

  // Gemarkeerde delen (door bebouwing/privaat) van het geselecteerde alternatief
  const markedSegments = useMemo(() => {
    const alt = routingResult?.alternatieven?.find((a) => a.id === selectedAlternativeId);
    return (alt?.markedSegments ?? []).map((m) => ({
      marker: m.marker,
      coordinates: m.coordinates,
    }));
  }, [routingResult, selectedAlternativeId]);

  // Publiceer de tekenconfig naar de gedeelde cockpit-kaart.
  const mapConfig = useMemo(
    () => ({
      editable: true,
      defaultDrawMode: 'auto' as const,
      autoWaypoints,
      onAutoWaypointsChange: setAutoWaypoints,
      onLayerDataChange: setLayerDataSnapshot,
      routeAlternatives,
      markedSegments,
    }),
    [autoWaypoints, routeAlternatives, markedSegments]
  );
  useCockpitMap(mapConfig);

  const activeSegments =
    routingResult?.alternatieven?.find((a) => a.id === selectedAlternativeId)?.segmenten ??
    routingResult?.segmenten ??
    [];

  const heeftGeometrie = (coords?.length ?? 0) >= 2;

  return (
    <div className="space-y-3 p-3">
      {!heeftGeometrie && (
        <div className="rounded-md border border-[#2D6FE8]/30 bg-[#2D6FE8]/5 p-2.5 text-[11px] text-[#1e40af]">
          <span className="font-medium">Volgende actie:</span> plaats waypoints op de kaart
          (modus <span className="font-mono">Auto-tracé</span>) en klik “Bereken tracé”, of teken
          het tracé handmatig met de tekentools.
        </div>
      )}
      <AutoTracePanel
        waypoints={autoWaypoints}
        onClearWaypoints={() => {
          setAutoWaypoints([]);
          setRoutingResult(null);
          setSelectedAlternativeId(null);
          setSaveMessage(null);
        }}
        onRemoveWaypoint={(index) => {
          setAutoWaypoints((prev) => prev.filter((_, i) => i !== index));
          setRoutingResult(null);
          setSelectedAlternativeId(null);
          setSaveMessage(null);
        }}
        onPlanTrace={handlePlanTrace}
        isPlanning={isPlanning}
        result={routingResult}
        selectedAlternativeId={selectedAlternativeId}
        onSelectAlternative={handleSelectAlternative}
        onSaveTrace={handleSaveTrace}
        onSaveManualTrace={handleSaveManualTrace}
        isSaving={isSaving}
        saveMessage={saveMessage}
        planError={planError}
        anthropicConfigured={anthropicConfigured}
      />

      <details className="group rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <span className="inline-block transition-transform group-open:rotate-90">›</span>{' '}
          Ontwerpgegevens · {DISCIPLINE_LABELS[trace.discipline]} ·{' '}
          {traceLengthM(activeTrace?.coordinates ?? trace.coordinates, activeTrace?.traceLines ?? trace.traceLines)}{' '}
          m
        </summary>
        <div className="space-y-1.5 border-t border-border/60 p-3 font-mono text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Code</span>
            <span className="text-foreground">{trace.code}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Nettype</span>
            <span className="text-foreground">{trace.netType}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Dekking</span>
            <span className="text-foreground">{trace.vereisteDekking} m</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Weg / corridor</span>
            <span className="text-foreground">{trace.wegnaam}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Leglocatie</span>
            <span className="text-foreground">{trace.leglocatie}</span>
          </div>
          {start && end && (
            <div className="pt-1 text-[10px] text-muted-foreground">
              <p>RD start: {start[0].toFixed(1)}, {start[1].toFixed(1)}</p>
              <p>RD eind: {end[0].toFixed(1)}, {end[1].toFixed(1)}</p>
            </div>
          )}
        </div>
      </details>

      {activeSegments.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">
              Opgeslagen segmenten ({activeSegments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1">
            {activeSegments.map((seg) => (
              <div key={seg.volgorde} className="rounded border border-border px-2 py-1.5 text-[10px]">
                <p className="font-medium text-foreground">{seg.wegnaam}</p>
                <p className="font-mono text-muted-foreground">
                  {seg.legtechniek.replace(/_/g, ' ')} · {seg.lengteM} m · {seg.leglocatie.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
