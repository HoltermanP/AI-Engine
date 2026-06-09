'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProcessStepsPanel } from '@/components/process-steps-panel';
import { ReportViewer } from '@/components/report-viewer';
import type { ProcessStepId, StepStatus } from '@/lib/process/workflow';
import { isProcessStepVoltooid } from '@/lib/process/workflow';
import type { PhaseStatus, TracePhase } from '@/lib/process/phases';
import type { CalcResult } from '@/lib/calc/types';
import type { DrawingResult } from '@/lib/drawings/types';
import type { OnderzoekDocument, AanvraagDocument, VergunningCheckItem } from '@/lib/research/types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { DemoTrace } from '@/demo/traces';
import { CalcResultsGrouped } from '@/components/calc-results-grouped';
import { BoreEngineeringPanel } from '@/components/bore-engineering-panel';
import { CalculatiePanel } from '@/components/calculatie-panel';
import {
  runBerekeningenAction,
  generateTekeningenAction,
  generateOnderzoekenAction,
  generateAanvragenAction,
  generateVergunningChecklistAction,
  aiAnalyseAction,
  generateVolledigDossierAction,
  runAlleOnderzoekenEnProcessenAction,
} from '@/lib/actions/engineering';
import { downloadSvgAsPdf } from '@/lib/export/download';
import { Calculator, FileImage, FileText, FolderOpen, Loader2, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';

type StapStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

interface TraceEngineeringPanelProps {
  projectId: string;
  traceId: string;
  traceCode: string;
  trace: DemoTrace;
  phase: 'fase3' | 'fase4' | 'output';
  collected: CollectedTraceData | null;
  conflicten: DetectedConflict[];
  dataStatus: StapStatus;
  toetsStatus: StapStatus;
  onPhaseStatusesChange?: (statuses: Partial<Record<TracePhase, PhaseStatus>>) => void;
  linkedActionId?: string;
  anthropicConfigured?: boolean;
}

export function TraceEngineeringPanel({
  projectId,
  traceId,
  traceCode,
  trace,
  phase,
  collected,
  conflicten,
  dataStatus,
  toetsStatus,
  onPhaseStatusesChange,
  linkedActionId,
  anthropicConfigured = false,
}: TraceEngineeringPanelProps) {
  const router = useRouter();
  const [berekeningen, setBerekeningen] = useState<CalcResult[]>([]);
  const [tekeningen, setTekeningen] = useState<DrawingResult[]>([]);
  const [onderzoeken, setOnderzoeken] = useState<OnderzoekDocument[]>([]);
  const [savedOnderzoekTypes, setSavedOnderzoekTypes] = useState<Set<string>>(new Set());
  const [aanvragen, setAanvragen] = useState<AanvraagDocument[]>([]);
  const [checklist, setChecklist] = useState<VergunningCheckItem[]>([]);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<'live' | 'demo'>('demo');
  const [stepStatuses, setStepStatuses] = useState<Partial<Record<ProcessStepId, StepStatus>>>({
    ontwerp: 'gereed',
    data_verzamelen: 'open',
    toets_trace: 'open',
  });
  const [isPending, startTransition] = useTransition();
  const [generatingAllReports, setGeneratingAllReports] = useState(false);

  useEffect(() => {
    setStepStatuses((prev) => ({
      ...prev,
      data_verzamelen: dataStatus === 'gereed' ? 'gereed' : dataStatus === 'bezig' ? 'bezig' : 'open',
      toets_trace: toetsStatus === 'gereed' || toetsStatus === 'blokkerend' ? toetsStatus : toetsStatus === 'bezig' ? 'bezig' : 'open',
    }));
  }, [dataStatus, toetsStatus]);

  const toetsVoltooid = isProcessStepVoltooid('toets_trace', stepStatuses.toets_trace);
  const calcStatus = (stepStatuses.berekenen ?? 'open') as StapStatus;
  const tekenStatus = (stepStatuses.tekenen ?? 'open') as StapStatus;
  const onderzoekStatus = (stepStatuses.onderzoek_check ?? 'open') as StapStatus;
  const aanvraagStatus = (stepStatuses.aanvragen ?? 'open') as StapStatus;
  const dossierStatus = (stepStatuses.dossier ?? 'open') as StapStatus;

  useEffect(() => {
    const fase3Status: PhaseStatus =
      calcStatus === 'gereed' && tekenStatus === 'gereed'
        ? 'gereed'
        : calcStatus === 'bezig' || tekenStatus === 'bezig'
        ? 'bezig'
        : 'open';

    const fase4Status: PhaseStatus =
      onderzoekStatus === 'gereed' && aanvraagStatus === 'gereed'
        ? 'gereed'
        : onderzoekStatus === 'bezig' || aanvraagStatus === 'bezig'
        ? 'bezig'
        : onderzoekStatus === 'gereed' || onderzoeken.length > 0
        ? 'bezig'
        : 'open';

    onPhaseStatusesChange?.({
      fase3: fase3Status,
      fase4: fase4Status,
      output: dossierStatus,
    });
  }, [calcStatus, tekenStatus, onderzoekStatus, aanvraagStatus, dossierStatus, onderzoeken.length, onPhaseStatusesChange]);

  function updateStep(id: ProcessStepId, status: StepStatus) {
    setStepStatuses((prev) => ({ ...prev, [id]: status }));
  }

  function handleBerekeningen() {
    startTransition(async () => {
      updateStep('berekenen', 'bezig');
      const result = await runBerekeningenAction(traceId, linkedActionId);
      setBerekeningen(result);
      updateStep('berekenen', 'gereed');
      router.refresh();
    });
  }

  function handleTekeningen() {
    startTransition(async () => {
      updateStep('tekenen', 'bezig');
      const result = await generateTekeningenAction(traceId, linkedActionId);
      setTekeningen(result);
      updateStep('tekenen', 'gereed');
      router.refresh();
    });
  }

  function handleOnderzoeken() {
    setGeneratingAllReports(true);
    updateStep('onderzoek_check', 'bezig');
    void (async () => {
      try {
        const result = await generateOnderzoekenAction(traceId, collected ?? undefined, conflicten, linkedActionId);
        setOnderzoeken(result);
        setSavedOnderzoekTypes(new Set(result.map((r) => r.type)));
        updateStep('onderzoek_check', 'gereed');
        result.forEach((r) => {
          const map: Record<string, ProcessStepId> = {
            bodem_nen5725: 'quickscan_bodem',
            natura2000: 'quickscan_natura2000',
            archeologie: 'quickscan_archeologie',
            ecologie_wnb: 'quickscan_ecologie',
            nge_ce: 'quickscan_nge',
            kl_inventarisatie: 'kl_inventarisatie',
          };
          const stepId = map[r.type];
          if (stepId) updateStep(stepId, 'gereed');
        });
        router.refresh();
      } finally {
        setGeneratingAllReports(false);
      }
    })();
  }

  function handleAanvragen() {
    startTransition(async () => {
      updateStep('aanvragen', 'bezig');
      const [aanv, check] = await Promise.all([
        generateAanvragenAction(traceId, collected ?? undefined, linkedActionId),
        generateVergunningChecklistAction(traceId, collected ?? undefined, conflicten, linkedActionId),
      ]);
      setAanvragen(aanv);
      setChecklist(check);
      updateStep('vergunning_checklist', 'gereed');
      updateStep('aanvragen', 'gereed');
      router.refresh();
    });
  }

  function handleAi() {
    startTransition(async () => {
      updateStep('ai_analyse', 'bezig');
      const result = await aiAnalyseAction(traceId, conflicten);
      setAiText(result.text);
      setAiSource(result._source);
      updateStep('ai_analyse', 'gereed');
    });
  }

  function handleAlleProcessen() {
    startTransition(async () => {
      updateStep('onderzoek_check', 'bezig');
      updateStep('berekenen', 'bezig');
      const result = await runAlleOnderzoekenEnProcessenAction(
        traceId,
        collected ?? undefined,
        conflicten
      );
      setBerekeningen(result.berekeningen);
      setTekeningen(result.tekeningen);
      setOnderzoeken(result.onderzoeken);
      setSavedOnderzoekTypes(new Set(result.onderzoeken.map((r) => r.type)));
      setAanvragen(result.aanvragen);
      setChecklist(result.checklist);
      if (result.ai) {
        setAiText(result.ai.text);
        setAiSource(result.ai._source);
      }
      updateStep('onderzoek_check', 'gereed');
      updateStep('berekenen', 'gereed');
      updateStep('tekenen', 'gereed');
      updateStep('aanvragen', 'gereed');
      updateStep('vergunning_checklist', 'gereed');
      updateStep('ai_analyse', 'gereed');
      router.refresh();
    });
  }

  function handleVolledigDossier() {
    startTransition(async () => {
      updateStep('dossier', 'bezig');
      const result = await generateVolledigDossierAction(traceId, collected ?? undefined, conflicten);
      setBerekeningen(result.berekeningen);
      setTekeningen(result.tekeningen);
      setOnderzoeken(result.onderzoeken);
      setSavedOnderzoekTypes(new Set(result.onderzoeken.map((r) => r.type)));
      setAanvragen(result.aanvragen);
      setChecklist(result.checklist);
      if (result.ai) {
        setAiText(result.ai.text);
        setAiSource(result.ai._source);
      }
      updateStep('berekenen', 'gereed');
      updateStep('tekenen', 'gereed');
      updateStep('onderzoek_check', 'gereed');
      updateStep('quickscan_bodem', 'gereed');
      updateStep('quickscan_natura2000', 'gereed');
      updateStep('quickscan_archeologie', 'gereed');
      updateStep('quickscan_ecologie', 'gereed');
      updateStep('quickscan_nge', 'gereed');
      updateStep('kl_inventarisatie', 'gereed');
      updateStep('vergunning_checklist', 'gereed');
      updateStep('aanvragen', 'gereed');
      updateStep('ai_analyse', 'gereed');
      updateStep('dossier', 'gereed');
      router.refresh();
    });
  }

  if (phase === 'fase3') {
    return (
      <div className="flex h-full flex-col overflow-auto">
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Engineering-berekeningen</p>
              <p className="text-xs text-muted-foreground">Discipline-specifieke berekeningen conform norm</p>
            </div>
            <Button size="sm" onClick={handleBerekeningen} disabled={isPending || !toetsVoltooid} className="bg-[#2D6FE8]">
              <Calculator className="mr-1 h-3 w-3" /> Bereken
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {!toetsVoltooid && (
            <p className="mb-3 text-xs text-amber-700">Voltooi eerst Fase 2: data verzamelen en tracé toetsen.</p>
          )}
          {toetsVoltooid && toetsStatus === 'blokkerend' && (
            <p className="mb-3 text-xs text-amber-700">
              Tracé-toets uitgevoerd — er zijn blokkades gevonden. U kunt doorgaan met engineering.
            </p>
          )}
          <CalcResultsGrouped berekeningen={berekeningen} />

          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">SVG-tekeningen</p>
              <p className="text-xs text-muted-foreground">Tracé, profielen en kruisingsdetails</p>
            </div>
            <Button size="sm" onClick={handleTekeningen} disabled={isPending} className="bg-[#2D6FE8]">
              <FileImage className="mr-1 h-3 w-3" /> Genereer
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tekeningen.map((t) => (
              <Card key={t.type} className="overflow-hidden">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm">{t.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="overflow-hidden rounded bg-muted/50" dangerouslySetInnerHTML={{ __html: t.svg }} />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => downloadSvgAsPdf(t.svg, t.label)}
                      className="text-[10px] text-[#2D6FE8] hover:underline"
                    >
                      Download PDF
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <BoreEngineeringPanel trace={trace} disabled={!toetsVoltooid || isPending} />
          <CalculatiePanel traceId={traceId} disabled={!toetsVoltooid || isPending} />
        </div>
      </div>
    );
  }

  if (phase === 'fase4') {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <p className="text-xs text-muted-foreground">
            OMO/OMA · Conditionerende onderzoeken (Anthropic) · Aanvragen · AI-assistent
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleAanvragen} disabled={isPending}>
              <FileText className="mr-1 h-3 w-3" /> Aanvragen & checklist
            </Button>
            <Button size="sm" variant="outline" onClick={handleOnderzoeken} disabled={isPending}>
              {generatingAllReports ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <FileText className="mr-1 h-3 w-3" />
              )}
              {generatingAllReports ? 'AI bezig…' : 'Alle rapporten'}
            </Button>
            <Button size="sm" onClick={handleAlleProcessen} disabled={isPending} className="bg-[#2D6FE8]">
              {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
              Alles uitvoeren
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ProcessStepsPanel
            traceId={traceId}
            projectId={projectId}
            collected={collected}
            conflicten={conflicten}
            rapporten={onderzoeken}
            stepStatuses={stepStatuses}
            onStatusChange={updateStep}
            linkedActionId={linkedActionId}
            onRapportenChange={setOnderzoeken}
            onOnderzoekCheck={() => {}}
            anthropicConfigured={anthropicConfigured}
            bulkGenerating={generatingAllReports}
          />
        </div>

        {(checklist.length > 0 || aanvragen.length > 0) && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              {checklist.length > 0 && (
                <Card className="flex-1">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">Vergunningchecklist (OMO)</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-28 space-y-1 overflow-auto p-3 pt-1">
                    {checklist.map((item) => (
                      <div key={item.vergunning} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{item.vergunning}</span>
                        <Badge variant="outline" className={
                          item.status === 'vereist' ? 'border-[#FF4D1C]/50 text-[#FF4D1C]'
                          : item.status === 'concept' ? 'border-amber-500/50 text-amber-700'
                          : 'border-border text-muted-foreground'
                        }>{item.status === 'vereist' ? 'Vereist' : item.status === 'concept' ? 'Concept' : 'Niet nodig'}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {aanvragen.length > 0 && (
                <div className="flex-1">
                  <p className="mb-2 text-xs font-medium text-foreground">Concept-aanvragen</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {aanvragen.map((a) => (
                      <Card key={a.type}>
                        <CardHeader className="p-2 pb-0">
                          <CardTitle className="text-xs">{a.titel}</CardTitle>
                          <p className="text-[10px] text-muted-foreground">→ {a.ontvanger}</p>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // output phase
  const docCount =
    berekeningen.length + tekeningen.length + onderzoeken.length + aanvragen.length + (aiText ? 1 : 0);

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-[#2D6FE8]" />
          <h2 className="mt-3 text-lg font-semibold text-foreground">Dossier & bijlagen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bundel alle rapporten, tekeningen en berekeningen voor dit tracé.
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold text-foreground">{berekeningen.length}</p>
                <p className="text-[10px] text-muted-foreground">Berekeningen</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{tekeningen.length}</p>
                <p className="text-[10px] text-muted-foreground">Tekeningen</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{onderzoeken.length}</p>
                <p className="text-[10px] text-muted-foreground">Onderzoeken</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{aanvragen.length}</p>
                <p className="text-[10px] text-muted-foreground">Aanvragen</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="bg-[#2D6FE8] hover:bg-[#2D6FE8]/90"
            onClick={handleVolledigDossier}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Genereer volledig dossier
          </Button>
          <Link
            href={`/project/${projectId}/dossier?trace=${traceId}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Bekijk dossier
          </Link>
        </div>

        {dossierStatus === 'gereed' && (
          <p className="text-center text-xs text-green-700">
            Dossier gegenereerd — {docCount} documenten beschikbaar.
          </p>
        )}

        {onderzoeken.length > 0 && (
          <div className="min-h-[400px]">
            <p className="mb-2 text-sm font-medium text-foreground">Rapporten in dossier</p>
            <ReportViewer rapporten={onderzoeken} savedTypes={savedOnderzoekTypes} />
          </div>
        )}
      </div>
    </div>
  );
}
