'use client';

import { useState, useTransition, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  OnderzoekReportDocument,
  OnderzoekReportLoading,
  OnderzoekReportPlaceholder,
  OnderzoekReportStreaming,
} from '@/components/onderzoek-report-document';
import { RapportAiAssistent } from '@/components/rapport-ai-assistent';
import {
  ENGINEERING_WORKFLOW,
  type ProcessStepId,
  type StepStatus,
  isProcessStepVoltooid,
  zijnVereisteStappenVoltooid,
} from '@/lib/process/workflow';
import type { OnderzoekCheckResult } from '@/lib/process/onderzoek-check';
import type { OnderzoekDocument, OnderzoekType } from '@/lib/research/types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { onderzoekCheckAction, saveOnderzoekAction } from '@/lib/actions/process';
import { streamRapportGeneratie } from '@/lib/research/stream-rapport-client';
import {
  runBerekeningenAction,
  generateTekeningenAction,
  generateAanvragenAction,
  generateVergunningChecklistAction,
  aiAnalyseAction,
} from '@/lib/actions/engineering';
import { CheckCircle2, Circle, Loader2, Play, AlertTriangle } from 'lucide-react';

const QUICKSCAN_MAP: Partial<Record<ProcessStepId, OnderzoekType>> = {
  quickscan_bodem: 'bodem_nen5725',
  quickscan_natura2000: 'natura2000',
  quickscan_archeologie: 'archeologie',
  quickscan_ecologie: 'ecologie_wnb',
  quickscan_nge: 'nge_ce',
  kl_inventarisatie: 'kl_inventarisatie',
};

const ONDERZOEK_STEPS = new Set(Object.keys(QUICKSCAN_MAP));

function mergeRapport(
  prev: OnderzoekDocument[],
  rapport: OnderzoekDocument
): OnderzoekDocument[] {
  return [...prev.filter((r) => r.type !== rapport.type), rapport];
}

interface ProcessStepsPanelProps {
  traceId: string;
  projectId: string;
  collected: CollectedTraceData | null;
  conflicten: DetectedConflict[];
  rapporten: OnderzoekDocument[];
  stepStatuses: Partial<Record<ProcessStepId, StepStatus>>;
  onStatusChange: (id: ProcessStepId, status: StepStatus) => void;
  onRapportenChange: Dispatch<SetStateAction<OnderzoekDocument[]>>;
  onOnderzoekCheck: (result: OnderzoekCheckResult) => void;
  linkedActionId?: string;
  onActionCompleted?: () => void;
  anthropicConfigured?: boolean;
  bulkGenerating?: boolean;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  gereed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  open: <Circle className="h-4 w-4 text-muted-foreground/50" />,
  bezig: <Loader2 className="h-4 w-4 animate-spin text-[#2D6FE8]" />,
  blokkerend: <AlertTriangle className="h-4 w-4 text-[#FF4D1C]" />,
  niet_nodig: <Circle className="h-4 w-4 text-muted-foreground/30" />,
};

export function ProcessStepsPanel({
  traceId,
  projectId,
  collected,
  conflicten,
  rapporten,
  stepStatuses,
  onStatusChange,
  onRapportenChange,
  onOnderzoekCheck,
  linkedActionId,
  onActionCompleted,
  anthropicConfigured = false,
  bulkGenerating = false,
}: ProcessStepsPanelProps) {
  const router = useRouter();
  const [onderzoekCheck, setOnderzoekCheck] = useState<OnderzoekCheckResult | null>(null);
  const [activeRapportType, setActiveRapportType] = useState<OnderzoekType | null>(null);
  const [savedTypes, setSavedTypes] = useState<Set<OnderzoekType>>(new Set());
  const [runningStep, setRunningStep] = useState<ProcessStepId | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [streamingRapport, setStreamingRapport] = useState<OnderzoekDocument | null>(null);
  const [streamCharCount, setStreamCharCount] = useState(0);

  const activeRapport =
    streamingRapport ??
    rapporten.find((r) => r.type === activeRapportType) ??
    rapporten[0] ??
    null;

  function upsertRapport(rapport: OnderzoekDocument) {
    onRapportenChange((prev) => mergeRapport(prev, rapport));
    setActiveRapportType(rapport.type);
  }

  function canStart(stepId: ProcessStepId): boolean {
    const step = ENGINEERING_WORKFLOW.find((s) => s.id === stepId);
    return zijnVereisteStappenVoltooid(step?.vereist, stepStatuses);
  }

  function blockedReason(stepId: ProcessStepId): string | null {
    const step = ENGINEERING_WORKFLOW.find((s) => s.id === stepId);
    if (!step?.vereist) return null;
    const missing = step.vereist.filter((req) => !isProcessStepVoltooid(req, stepStatuses[req]));
    if (missing.length === 0) return null;
    const labels = missing.map(
      (id) => ENGINEERING_WORKFLOW.find((s) => s.id === id)?.label ?? id
    );
    return labels.join(' · ');
  }

  function notifyActionCompleted() {
    onActionCompleted?.();
    router.refresh();
  }

  function handleSave() {
    if (!activeRapport) return;
    setIsSaving(true);
    startTransition(async () => {
      try {
        await saveOnderzoekAction(traceId, activeRapport, linkedActionId);
        setSavedTypes((prev) => new Set([...prev, activeRapport.type]));
        notifyActionCompleted();
      } finally {
        setIsSaving(false);
      }
    });
  }

  function handleRapportBewerkt(inhoud: string) {
    if (!activeRapport) return;
    const updated: OnderzoekDocument = { ...activeRapport, inhoud };
    onRapportenChange((prev) =>
      prev.map((r) => (r.type === updated.type ? updated : r))
    );
  }

  async function runQuickscan(stepId: ProcessStepId, onderzoekType: OnderzoekType) {
    try {
      const final = await streamRapportGeneratie(
        {
          traceId,
          type: onderzoekType,
          collected: collected ?? undefined,
          conflicten,
          actionId: linkedActionId,
        },
        {
          onTemplate: (document) => {
            setStreamingRapport({ ...document, inhoud: '', status: 'in_uitvoering' });
          },
          onDelta: (_chunk, accumulated) => {
            setStreamCharCount(accumulated.length);
            setStreamingRapport((prev) =>
              prev
                ? {
                    ...prev,
                    inhoud: accumulated,
                    status: 'in_uitvoering',
                    _source: anthropicConfigured ? 'live' : 'demo',
                  }
                : null
            );
          },
          onDone: (document) => {
            upsertRapport(document);
            onStatusChange(stepId, 'gereed');
          },
          onError: (message) => {
            console.error(`[ProcessStepsPanel] stream ${stepId}:`, message);
          },
        }
      );

      if (!final) {
        onStatusChange(stepId, 'open');
      }
    } catch (err) {
      console.error(`[ProcessStepsPanel] quickscan ${stepId} mislukt:`, err);
      onStatusChange(stepId, 'open');
    } finally {
      setStreamingRapport(null);
      setStreamCharCount(0);
      setRunningStep(null);
    }
  }

  function handleStep(stepId: ProcessStepId) {
    const quickscanType = QUICKSCAN_MAP[stepId];
    if (quickscanType) {
      const stepMeta = ENGINEERING_WORKFLOW.find((s) => s.id === stepId);
      flushSync(() => {
        setActiveRapportType(quickscanType);
        setRunningStep(stepId);
        setStreamCharCount(0);
        setStreamingRapport({
          type: quickscanType,
          titel: stepMeta?.label ?? 'Onderzoeksrapport',
          status: 'in_uitvoering',
          inhoud: '',
          _source: anthropicConfigured ? 'live' : 'demo',
        });
      });
      onStatusChange(stepId, 'bezig');
      void runQuickscan(stepId, quickscanType);
      return;
    }

    flushSync(() => setRunningStep(stepId));
    onStatusChange(stepId, 'bezig');

    startTransition(async () => {
      try {
        switch (stepId) {
          case 'onderzoek_check': {
            const result = await onderzoekCheckAction(traceId, collected ?? undefined, conflicten);
            setOnderzoekCheck(result);
            onOnderzoekCheck(result);
            onStatusChange(stepId, 'gereed');
            notifyActionCompleted();
            break;
          }
          case 'berekenen':
            await runBerekeningenAction(traceId, linkedActionId);
            onStatusChange(stepId, 'gereed');
            notifyActionCompleted();
            break;
          case 'tekenen':
            await generateTekeningenAction(traceId, linkedActionId);
            onStatusChange(stepId, 'gereed');
            notifyActionCompleted();
            break;
          case 'vergunning_checklist':
            await generateVergunningChecklistAction(traceId, collected ?? undefined, conflicten, linkedActionId);
            onStatusChange(stepId, 'gereed');
            notifyActionCompleted();
            break;
          case 'aanvragen':
            await generateAanvragenAction(traceId, collected ?? undefined, linkedActionId);
            onStatusChange(stepId, 'gereed');
            notifyActionCompleted();
            break;
          case 'ai_analyse':
            await aiAnalyseAction(traceId, conflicten);
            onStatusChange(stepId, 'gereed');
            break;
        }
      } catch (err) {
        console.error(`[ProcessStepsPanel] stap ${stepId} mislukt:`, err);
        onStatusChange(stepId, 'open');
      } finally {
        setRunningStep(null);
      }
    });
  }

  const procesStappen = ENGINEERING_WORKFLOW.filter(
    (s) => !['ontwerp', 'data_verzamelen', 'toets_trace'].includes(s.id)
  );

  const onderzoekStappen = procesStappen.filter((s) => ONDERZOEK_STEPS.has(s.id));
  const overigeStappen = procesStappen.filter((s) => !ONDERZOEK_STEPS.has(s.id));

  const onderzoekBlocked = onderzoekStappen.some((s) => !canStart(s.id));
  const onderzoekBlockHint = onderzoekStappen
    .map((s) => blockedReason(s.id))
    .find(Boolean);

  const runningQuickscanStep =
    runningStep && ONDERZOEK_STEPS.has(runningStep) ? runningStep : null;
  const runningStepMeta = runningStep
    ? ENGINEERING_WORKFLOW.find((s) => s.id === runningStep)
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden lg:flex-row">
      <div className="flex w-full shrink-0 flex-col overflow-auto border-b border-border lg:w-80 lg:border-b-0 lg:border-r">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-medium text-foreground">Onderzoeken & proces</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Start een onderzoek — het rapport verschijnt direct rechts.
          </p>
          {(runningQuickscanStep || bulkGenerating || streamingRapport) &&
            (runningStepMeta || bulkGenerating || streamingRapport) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#2D6FE8]/30 bg-[#2D6FE8]/8 px-3 py-2">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[#2D6FE8]" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#2D6FE8]">
                  {streamingRapport && streamCharCount > 0
                    ? 'Tekst wordt live opgebouwd'
                    : anthropicConfigured
                      ? 'AI genereert rapport'
                      : 'Rapport wordt opgesteld'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bulkGenerating
                    ? 'Alle onderzoeksrapporten'
                    : (streamingRapport?.titel ?? runningStepMeta?.label)}
                  {streamCharCount > 0 && (
                    <span className="ml-1 text-[#2D6FE8]">
                      · {streamCharCount.toLocaleString('nl-NL')} tekens
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1 px-3 pb-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Onderzoeken
          </p>
          {onderzoekBlocked && onderzoekBlockHint && (
            <p className="mx-1 mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-800">
              Eerst voltooien in Fase 2: {onderzoekBlockHint}. Data wordt automatisch geladen…
            </p>
          )}
          {onderzoekStappen.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              status={stepStatuses[step.id] ?? 'open'}
              enabled={canStart(step.id)}
              isRunning={runningStep === step.id}
              isAnyRunning={runningStep !== null || bulkGenerating}
              hasRapport={rapporten.some(
                (r) => r.type === QUICKSCAN_MAP[step.id as ProcessStepId]
              )}
              isSaved={savedTypes.has(QUICKSCAN_MAP[step.id as ProcessStepId]!)}
              isSelected={
                activeRapportType === QUICKSCAN_MAP[step.id as ProcessStepId]
              }
              onStart={() => handleStep(step.id)}
              onSelect={() => {
                const type = QUICKSCAN_MAP[step.id as ProcessStepId];
                if (type && rapporten.some((r) => r.type === type)) {
                  setActiveRapportType(type);
                }
              }}
              blockedReason={blockedReason(step.id)}
            />
          ))}
        </div>

        {onderzoekCheck && (
          <div className="mx-3 mb-3 rounded-lg border border-[#2D6FE8]/30 bg-[#2D6FE8]/5 p-3">
            <p className="text-xs font-medium text-foreground">Benodigde onderzoeken</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{onderzoekCheck.samenvatting}</p>
            <div className="mt-2 space-y-1">
              {onderzoekCheck.items.map((item) => (
                <div key={item.type + item.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-foreground">{item.label}</span>
                  <Badge
                    variant="outline"
                    className={
                      item.prioriteit === 'verplicht'
                        ? 'border-[#FF4D1C]/50 text-[#FF4D1C]'
                        : item.prioriteit === 'aanbevolen'
                        ? 'border-amber-500/50 text-amber-700'
                        : 'border-border text-muted-foreground'
                    }
                  >
                    {item.prioriteit}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1 px-3 pb-4">
          <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Overige stappen
          </p>
          {overigeStappen.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              status={stepStatuses[step.id] ?? 'open'}
              enabled={canStart(step.id)}
              isRunning={runningStep === step.id}
              isAnyRunning={runningStep !== null || bulkGenerating}
              onStart={() => handleStep(step.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-[400px] min-w-0 flex-1 flex-col overflow-hidden">
        {rapporten.length > 0 && (
          <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
            {rapporten.map((r) => (
              <button
                key={r.type}
                type="button"
                onClick={() => setActiveRapportType(r.type)}
                className={`rounded-md px-2.5 py-1 text-[10px] transition-colors ${
                  activeRapportType === r.type
                    ? 'bg-[#2D6FE8] text-white'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {r.titel}
                {savedTypes.has(r.type) && <span className="ml-1 opacity-80">✓</span>}
              </button>
            ))}
          </div>
        )}
        {streamingRapport ? (
          <OnderzoekReportStreaming
            rapport={streamingRapport}
            useAnthropic={anthropicConfigured}
            charCount={streamCharCount}
          />
        ) : (runningQuickscanStep && runningStepMeta) || bulkGenerating ? (
          <OnderzoekReportLoading
            stepLabel={
              bulkGenerating
                ? 'Alle onderzoeksrapporten'
                : (runningStepMeta?.label ?? 'Rapport')
            }
            useAnthropic={anthropicConfigured}
          />
        ) : activeRapport ? (
          <OnderzoekReportDocument
            rapport={activeRapport}
            projectId={projectId}
            traceId={traceId}
            isSaved={savedTypes.has(activeRapport.type)}
            isSaving={isSaving}
            onSave={handleSave}
          />
        ) : (
          <OnderzoekReportPlaceholder />
        )}
      </div>

      <div className="hidden h-full min-h-[280px] w-72 shrink-0 lg:block lg:w-80">
        <RapportAiAssistent
          traceId={traceId}
          rapport={activeRapport}
          conflicten={conflicten}
          onRapportBewerkt={handleRapportBewerkt}
        />
      </div>

      <div className="h-80 shrink-0 border-t border-border lg:hidden">
        <RapportAiAssistent
          traceId={traceId}
          rapport={activeRapport}
          conflicten={conflicten}
          onRapportBewerkt={handleRapportBewerkt}
        />
      </div>
    </div>
  );
}

interface StepRowProps {
  step: { id: ProcessStepId; label: string; beschrijving: string; fase: number; vereist?: ProcessStepId[] };
  status: StepStatus;
  enabled: boolean;
  isRunning: boolean;
  isAnyRunning: boolean;
  hasRapport?: boolean;
  isSaved?: boolean;
  isSelected?: boolean;
  blockedReason?: string | null;
  onStart: () => void;
  onSelect?: () => void;
}

function StepRow({
  step,
  status,
  enabled,
  isRunning,
  isAnyRunning,
  hasRapport,
  isSaved,
  isSelected,
  blockedReason: blockReason,
  onStart,
  onSelect,
}: StepRowProps) {
  return (
    <Card
      className={`${!enabled ? 'opacity-60' : ''} ${isSelected ? 'border-[#2D6FE8]/50 bg-[#2D6FE8]/5' : ''}`}
      title={!enabled && blockReason ? `Eerst voltooien: ${blockReason}` : undefined}
    >
      <CardContent className="flex items-center gap-2 p-2.5">
        {STATUS_ICON[isRunning ? 'bezig' : status]}
        <button
          type="button"
          className="flex-1 min-w-0 text-left disabled:opacity-50"
          onClick={onSelect}
          disabled={!hasRapport}
        >
          <p className="text-xs font-medium text-foreground leading-tight">{step.label}</p>
          {hasRapport && (
            <p className="text-[10px] text-muted-foreground">
              {isSaved ? 'Opgeslagen in dossier' : 'Rapport beschikbaar — nog niet opgeslagen'}
            </p>
          )}
        </button>
        <Button
          size="sm"
          variant={hasRapport ? 'outline' : 'default'}
          className={`shrink-0 h-7 min-w-[4.5rem] text-[10px] ${!hasRapport ? 'bg-[#2D6FE8] hover:bg-[#2D6FE8]/90' : ''} ${isRunning ? 'border-[#2D6FE8]/50 bg-[#2D6FE8]/10' : ''}`}
          disabled={!enabled || isAnyRunning}
          onClick={onStart}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-0.5 h-3 w-3 animate-spin" />
              AI…
            </>
          ) : (
            <>
              <Play className="mr-0.5 h-3 w-3" />
              {hasRapport ? 'Opnieuw' : 'Start'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
