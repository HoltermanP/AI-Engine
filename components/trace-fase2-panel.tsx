'use client';

import { useState, useTransition } from 'react';
import { MapWorkspace } from '@/components/map-workspace';
import { ConflictList } from '@/components/conflict-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { MapNet, MapTrace } from '@/components/trace-map';
import { collectTraceDataAction, toetsTraceAction } from '@/lib/actions/trace';
import { normalizeTraceCoordinates } from '@/lib/trace-edit';
import { Loader2, ShieldCheck } from 'lucide-react';

type StapStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

interface TraceFase2PanelProps {
  traceId: string;
  traces: MapTrace[];
  onTracesChange: (traces: MapTrace[]) => void;
  bestaandNet: MapNet[];
  collected: CollectedTraceData | null;
  conflicten: DetectedConflict[];
  selectedTraceId: string;
  selectedConflictId: string | null;
  toetsStatus: StapStatus;
  onCollected: (data: CollectedTraceData) => void;
  onToetsStart: () => void;
  onConflicten: (conflicten: DetectedConflict[], status: StapStatus) => void;
  onSelectConflict: (id: string | null) => void;
}

export function TraceFase2Panel({
  traceId,
  traces,
  onTracesChange,
  bestaandNet,
  collected,
  conflicten,
  selectedTraceId,
  selectedConflictId,
  toetsStatus,
  onCollected,
  onToetsStart,
  onConflicten,
  onSelectConflict,
}: TraceFase2PanelProps) {
  const [isPending, startTransition] = useTransition();
  const [toetsStep, setToetsStep] = useState<'snel' | 'collect' | 'analyse' | null>(null);
  const [toetsError, setToetsError] = useState<string | null>(null);

  function finishToets(result: DetectedConflict[]) {
    const hasBlokkerend = result.some((c) => c.ernst === 'blokkerend');
    onConflicten(result, hasBlokkerend ? 'blokkerend' : 'gereed');
    setToetsStep(null);
  }

  function handleToets() {
    onToetsStart();
    setToetsError(null);
    startTransition(async () => {
      try {
        const activeTrace = traces.find((t) => t.id === traceId);
        const coords = activeTrace
          ? normalizeTraceCoordinates(activeTrace.coordinates)
          : undefined;

        if (!coords?.length) {
          throw new Error(
            'Geen tracégeometrie gevonden. Sla eerst een tracé op in fase 1 (automatisch of handmatig).'
          );
        }

        if (collected) {
          setToetsStep('snel');
          const quick = await toetsTraceAction(traceId, collected, coords);
          onConflicten(quick, 'bezig');
        }

        setToetsStep('collect');
        const collectResult = await collectTraceDataAction(traceId);
        onCollected(collectResult.data);

        setToetsStep('analyse');
        const result = await toetsTraceAction(traceId, collectResult.data, coords);
        finishToets(result);
      } catch (err) {
        console.error('[handleToets]', err);
        setToetsStep(null);
        setToetsError(
          err instanceof Error ? err.message : 'Data ophalen of toetsen mislukt'
        );
        onConflicten(conflicten, 'open');
      }
    });
  }

  const toetsStepLabel =
    toetsStep === 'snel'
      ? 'Snelle toets op cache…'
      : toetsStep === 'collect'
        ? 'Databronnen ophalen (30–60 s)…'
        : toetsStep === 'analyse'
          ? 'Conflicten analyseren…'
          : null;

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      <div className="w-full shrink-0 overflow-auto border-b border-border bg-card p-4 lg:w-80 lg:border-b-0 lg:border-r">
        <div className="mb-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Datalagen</p>
          <p className="text-[11px] text-muted-foreground">
            Zet lagen aan in het paneel links op de kaart. Data wordt automatisch
            opgehaald voor het zichtbare gebied (heel Nederland).
          </p>
        </div>

        <div className="mb-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Risico&apos;s & toetsing</p>
          <p className="text-[11px] text-muted-foreground">
            Tracé-toets haalt trace-specifieke data op (KLIC, AHN, bodemrisico) en
            toont conflicten op de kaart — inclusief doorschreden of nabijgelegen
            risicogebieden.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleToets}
            disabled={isPending}
          >
            {(isPending || toetsStep) && toetsStatus === 'bezig' ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1 h-3 w-3" />
            )}
            {toetsStatus === 'gereed' || toetsStatus === 'blokkerend'
              ? 'Opnieuw toetsen'
              : 'Toets tracé'}
          </Button>
          {(toetsStatus === 'gereed' || toetsStatus === 'blokkerend') && (
            <Badge
              variant="outline"
              className={
                toetsStatus === 'gereed'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700'
                  : 'border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-800'
              }
            >
              Getoetst
            </Badge>
          )}
          {toetsStepLabel && (
            <p className="text-[10px] text-muted-foreground">{toetsStepLabel}</p>
          )}
          {toetsError && (
            <p className="rounded border border-red-300 bg-red-50 p-2 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {toetsError}
            </p>
          )}
          {toetsStatus === 'open' && conflicten.length > 0 && (
            <p className="text-[10px] text-amber-700">
              Tracé gewijzigd — voer opnieuw een toets uit.
            </p>
          )}
          {toetsStatus === 'gereed' && (
            <p className="text-[10px] text-green-700">Tracé-toets voltooid — geen blokkades.</p>
          )}
          {toetsStatus === 'blokkerend' && (
            <p className="text-[10px] text-amber-700">
              Tracé-toets voltooid — blokkades gevonden (volgende stappen zijn beschikbaar).
            </p>
          )}
        </div>

        {collected && (
          <Card className="mb-3">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm">Tracé-data (toets)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1 p-3 pt-1">
              {Object.entries(collected.sources).map(([id, source]) => (
                <div key={id} className="flex items-center gap-1 rounded bg-muted px-2 py-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground">{id}</span>
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    {source}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {conflicten.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              Conflicten
              <Badge variant="outline" className="border-[#FF4D1C]/50 text-[#FF4D1C]">
                {conflicten.filter((c) => c.ernst === 'blokkerend').length} blokkerend
              </Badge>
            </h3>
            <ConflictList
              conflicten={conflicten}
              selectedConflictId={selectedConflictId}
              onSelectConflict={(conflict) => onSelectConflict(conflict?.id ?? null)}
            />
          </div>
        )}
      </div>

      <div className="min-h-[400px] flex-1">
        <MapWorkspace
          traces={traces}
          onTracesChange={onTracesChange}
          bestaandNet={bestaandNet}
          conflicten={conflicten}
          traceId={traceId}
          lazyLayers
          selectedTraceId={selectedTraceId}
          selectedConflictId={selectedConflictId}
          height="100%"
          editable
        />
      </div>
    </div>
  );
}
