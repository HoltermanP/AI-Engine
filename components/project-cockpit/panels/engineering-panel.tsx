'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { ConflictList } from '@/components/conflict-list';
import { TraceEngineeringPanel } from '@/components/trace-engineering-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { collectTraceDataAction, toetsTraceAction } from '@/lib/actions/trace';
import { normalizeTraceCoordinates } from '@/lib/trace-edit';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';

const ENGINEERING_FASEN: { id: 'fase3' | 'fase4' | 'output'; label: string }[] = [
  { id: 'fase3', label: 'Engineering' },
  { id: 'fase4', label: 'Tekeningen' },
  { id: 'output', label: 'Output' },
];

/**
 * Zijpaneel "Engineering & toetsing" — combineert de tracé-toets (conflicten op
 * de gedeelde kaart) met de engineering-fasen (berekeningen, tekeningen, output).
 */
export function EngineeringPanel({ anthropicConfigured = false }: { anthropicConfigured?: boolean }) {
  const {
    projectId,
    allTraces,
    traces,
    selectedTraceId,
    collected,
    setCollected,
    conflicten,
    setConflicten,
    selectedConflictId,
    setSelectedConflictId,
    toetsStatus,
    setToetsStatus,
  } = useCockpit();

  const trace = useMemo(
    () => allTraces.find((t) => t.id === selectedTraceId) ?? allTraces[0],
    [allTraces, selectedTraceId]
  );

  const [isPending, startTransition] = useTransition();
  const [toetsStep, setToetsStep] = useState<'snel' | 'collect' | 'analyse' | null>(null);
  const [toetsError, setToetsError] = useState<string | null>(null);
  const [engineeringFase, setEngineeringFase] = useState<'fase3' | 'fase4' | 'output'>('fase3');

  useCockpitMap(useMemo(() => ({ editable: false, defaultDrawMode: 'none' as const }), []));

  function finishToets(result: DetectedConflict[]) {
    const hasBlokkerend = result.some((c) => c.ernst === 'blokkerend');
    setConflicten(result);
    setToetsStatus(hasBlokkerend ? 'blokkerend' : 'gereed');
    setToetsStep(null);
  }

  function handleToets() {
    if (!trace) return;
    setToetsStatus('bezig');
    setToetsError(null);
    startTransition(async () => {
      try {
        const active = traces.find((t) => t.id === trace.id);
        const coords = active ? normalizeTraceCoordinates(active.coordinates) : undefined;
        if (!coords?.length) {
          throw new Error('Geen tracégeometrie. Teken/sla eerst een tracé op in stap "Tracé tekenen".');
        }
        if (collected) {
          setToetsStep('snel');
          const quick = await toetsTraceAction(trace.id, collected, coords);
          setConflicten(quick);
        }
        setToetsStep('collect');
        const collectResult = await collectTraceDataAction(trace.id);
        setCollected(collectResult.data);

        setToetsStep('analyse');
        const result = await toetsTraceAction(trace.id, collectResult.data, coords);
        finishToets(result);
      } catch (err) {
        console.error('[handleToets]', err);
        setToetsStep(null);
        setToetsError(err instanceof Error ? err.message : 'Data ophalen of toetsen mislukt');
        setToetsStatus('open');
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

  if (!trace) {
    return <p className="p-4 text-sm text-muted-foreground">Geen tracé geselecteerd.</p>;
  }

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Tracé toetsen</p>
        <p className="text-[11px] text-muted-foreground">
          Haalt KLIC, AHN en bodemrisico op voor dit tracé en toont conflicten op de kaart.
        </p>
        <Button
          size="sm"
          className="w-full bg-[#2D6FE8] text-white hover:bg-[#2563d4]"
          onClick={handleToets}
          disabled={isPending}
        >
          {(isPending || toetsStep) && toetsStatus === 'bezig' ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <ShieldCheck className="mr-1 h-3 w-3" />
          )}
          {toetsStatus === 'gereed' || toetsStatus === 'blokkerend' ? 'Opnieuw toetsen' : 'Toets tracé'}
        </Button>
        {toetsStepLabel && <p className="text-[10px] text-muted-foreground">{toetsStepLabel}</p>}
        {toetsError && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-[10px] text-red-700">{toetsError}</p>
        )}
      </div>

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
            onSelectConflict={(conflict) => setSelectedConflictId(conflict?.id ?? null)}
          />
        </div>
      )}

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-sm">Engineering</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <div className="mb-2 flex gap-1">
            {ENGINEERING_FASEN.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setEngineeringFase(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  engineeringFase === f.id
                    ? 'bg-[#2D6FE8] text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <TraceEngineeringPanel
            projectId={projectId}
            traceId={trace.id}
            traceCode={trace.code}
            trace={trace}
            phase={engineeringFase}
            collected={collected}
            conflicten={conflicten}
            dataStatus={collected ? 'gereed' : 'open'}
            toetsStatus={toetsStatus}
            anthropicConfigured={anthropicConfigured}
          />
        </CardContent>
      </Card>
    </div>
  );
}
