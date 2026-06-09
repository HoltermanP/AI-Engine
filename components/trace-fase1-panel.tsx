'use client';

import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapWorkspace } from '@/components/map-workspace';
import { AutoTracePanel } from '@/components/auto-trace-panel';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import { traceLengthM } from '@/lib/geo';
import { applyTraceLines, demoTraceToMapTrace, normalizeTraceCoordinates } from '@/lib/trace-edit';
import { planAutomaticTraceAction, saveAutoTraceAction, saveManualTraceAction } from '@/lib/actions/trace-routing';
import {
  type TraceRoutingResult,
  type TraceWaypoint,
} from '@/lib/services/trace-routing';
import type { DemoTrace } from '@/demo/traces';
import type { MapNet, MapTrace } from '@/components/trace-map';
import type { MapLayerData } from '@/components/trace-map';
import { getTraceLines } from '@/lib/trace-edit';

interface TraceFase1PanelProps {
  trace: DemoTrace;
  mapTraces: MapTrace[];
  onMapTracesChange: (traces: MapTrace[]) => void;
  bestaandNet: MapNet[];
  anthropicConfigured?: boolean;
}

export function TraceFase1Panel({
  trace,
  mapTraces,
  onMapTracesChange,
  bestaandNet,
  anthropicConfigured = false,
}: TraceFase1PanelProps) {
  const [autoWaypoints, setAutoWaypoints] = useState<TraceWaypoint[]>([]);
  const [routingResult, setRoutingResult] = useState<TraceRoutingResult | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [layerDataSnapshot, setLayerDataSnapshot] = useState<MapLayerData | undefined>();

  const activeTrace = mapTraces.find((t) => t.id === trace.id) ?? mapTraces[0];
  const coords = activeTrace?.coordinates ?? trace.coordinates;
  const start = coords[0];
  const end = coords[coords.length - 1];

  const applyAlternativeToMap = useCallback(
    (result: TraceRoutingResult, alternativeId: string) => {
      const alt = result.alternatieven?.find((a) => a.id === alternativeId);
      if (!alt?.traceLines.some((line) => line.length >= 2)) return;
      onMapTracesChange(
        mapTraces.map((t) =>
          t.id === trace.id ? applyTraceLines(t, alt.traceLines) : t
        )
      );
    },
    [mapTraces, onMapTracesChange, trace.id]
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
        onMapTracesChange(
          mapTraces.map((t) =>
            t.id === trace.id ? demoTraceToMapTrace(outcome.trace) : t
          )
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
  }, [routingResult, selectedAlternativeId, trace.id, mapTraces, onMapTracesChange]);

  const handleSaveManualTrace = useCallback(async () => {
    const active = mapTraces.find((t) => t.id === trace.id);
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
        onMapTracesChange(
          mapTraces.map((t) =>
            t.id === trace.id ? demoTraceToMapTrace(outcome.trace) : t
          )
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
  }, [mapTraces, trace.id, trace.wegnaam, onMapTracesChange]);

  const routeAlternatives = useMemo(() => {
    if (!routingResult?.alternatieven?.length) return [];
    return routingResult.alternatieven.map((alt) => ({
      id: alt.id,
      label: alt.label,
      traceLines: alt.traceLines,
      selected: alt.id === selectedAlternativeId,
    }));
  }, [routingResult, selectedAlternativeId]);

  const activeSegments =
    routingResult?.alternatieven?.find((a) => a.id === selectedAlternativeId)?.segmenten ??
    routingResult?.segmenten ??
    [];

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      <div className="w-full shrink-0 overflow-auto border-b border-border bg-card p-4 lg:w-80 lg:border-b-0 lg:border-r">
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

        <Card className="mb-3 mt-3">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Tracéontwerp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1 font-mono text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Code</span>
              <span className="text-foreground">{trace.code}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Discipline</span>
              <span className="text-foreground">{DISCIPLINE_LABELS[trace.discipline]}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Nettype</span>
              <span className="text-foreground">{trace.netType}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Lengte</span>
              <span className="text-foreground">
                {traceLengthM(activeTrace?.coordinates ?? trace.coordinates, activeTrace?.traceLines ?? trace.traceLines)} m
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Dekking</span>
              <span className="text-foreground">{trace.vereisteDekking} m</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-3">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Locatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-1 text-xs">
            <div>
              <p className="text-muted-foreground">Weg / corridor</p>
              <p className="text-foreground">{trace.wegnaam}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Leglocatie</p>
              <p className="text-foreground">{trace.leglocatie}</p>
            </div>
            {start && end && (
              <div className="font-mono text-[10px] text-muted-foreground">
                <p>RD start: {start[0].toFixed(1)}, {start[1].toFixed(1)}</p>
                <p>RD eind: {end[0].toFixed(1)}, {end[1].toFixed(1)}</p>
              </div>
            )}
          </CardContent>
        </Card>

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

      <div className="min-h-[400px] flex-1">
        <MapWorkspace
          traces={mapTraces}
          onTracesChange={onMapTracesChange}
          bestaandNet={bestaandNet}
          traceId={trace.id}
          lazyLayers
          selectedTraceId={trace.id}
          height="100%"
          editable
          defaultDrawMode="auto"
          autoWaypoints={autoWaypoints}
          onAutoWaypointsChange={setAutoWaypoints}
          onLayerDataChange={setLayerDataSnapshot}
          routeAlternatives={routeAlternatives}
        />
      </div>
    </div>
  );
}
