'use client';

import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnderzoekReportDocument } from '@/components/onderzoek-report-document';
import type { OnderzoekDocument } from '@/lib/research/types';
import {
  markeerRapportDefinitiefAction,
  reviseRapportAction,
} from '@/lib/actions/rapport-ai';
import { CheckCircle2, Loader2, Maximize2, Send, Sparkles } from 'lucide-react';

interface ReportViewerProps {
  rapporten: OnderzoekDocument[];
  savedTypes?: Set<string>;
  defaultActive?: string;
  /** Nodig voor AI-bewerking + autosave naar het dossier */
  projectId?: string;
  traceId?: string;
  /** Wijzigingen (AI-revisies) terugmelden aan de eigenaar van de rapportenstate */
  onRapportChange?: (rapport: OnderzoekDocument) => void;
}

export function ReportViewer({
  rapporten,
  savedTypes,
  defaultActive,
  projectId,
  traceId,
  onRapportChange,
}: ReportViewerProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(
    defaultActive ?? rapporten[0]?.type ?? null
  );
  const [opmerking, setOpmerking] = useState('');
  const [chatMelding, setChatMelding] = useState<string | null>(null);
  const [definitiefTypes, setDefinitiefTypes] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  if (rapporten.length === 0) return null;

  const activeRapport = rapporten.find((r) => r.type === activeType) ?? rapporten[0];
  const kanBewerken = Boolean(projectId && traceId);
  const isDefinitief = definitiefTypes.has(activeRapport.type);

  function handleRevisie() {
    if (!projectId || !traceId || !opmerking.trim()) return;
    const rapport = activeRapport;
    startTransition(async () => {
      try {
        const result = await reviseRapportAction({
          projectId,
          traceId,
          titel: rapport.titel,
          inhoud: rapport.inhoud,
          opmerking,
        });
        onRapportChange?.({ ...rapport, inhoud: result.inhoud, _source: result._source });
        setOpmerking('');
        setChatMelding('Opmerking verwerkt door AI en automatisch opgeslagen in het dossier.');
      } catch (err) {
        setChatMelding(
          err instanceof Error ? err.message : 'AI-verwerking mislukt — probeer opnieuw.'
        );
      }
    });
  }

  function handleDefinitief() {
    if (!projectId || !traceId) return;
    const rapport = activeRapport;
    startTransition(async () => {
      await markeerRapportDefinitiefAction({
        projectId,
        traceId,
        titel: rapport.titel,
        inhoud: rapport.inhoud,
      });
      setDefinitiefTypes((prev) => new Set(prev).add(rapport.type));
      setChatMelding('Rapport gemarkeerd als definitief en opgeslagen in het dossier.');
    });
  }

  const tabs = (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card p-2">
      {rapporten.map((r) => (
        <button
          key={r.type}
          type="button"
          onClick={() => setActiveType(r.type)}
          className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
            activeRapport.type === r.type
              ? 'bg-[#2D6FE8] text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          {r.titel}
          {(savedTypes?.has(r.type) || definitiefTypes.has(r.type)) && (
            <span className="ml-1 text-[10px] opacity-80">✓</span>
          )}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        {isDefinitief && (
          <Badge variant="outline" className="border-emerald-500/50 text-[10px] text-emerald-700">
            Definitief
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="mr-1 h-3 w-3" />
          Volledig scherm
        </Button>
      </div>
    </div>
  );

  const chatbalk = kanBewerken ? (
    <div className="shrink-0 border-t border-border bg-card p-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <textarea
            value={opmerking}
            onChange={(e) => setOpmerking(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleRevisie();
              }
            }}
            rows={2}
            placeholder="Opmerking voor AI — wordt direct in het rapport verwerkt en automatisch opgeslagen…"
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-[#2D6FE8]"
            disabled={isPending || isDefinitief}
          />
        </div>
        <Button
          size="sm"
          className="h-9 bg-[#2D6FE8]"
          onClick={handleRevisie}
          disabled={isPending || !opmerking.trim() || isDefinitief}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 text-xs"
          onClick={handleDefinitief}
          disabled={isPending || isDefinitief}
        >
          <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
          {isDefinitief ? 'Definitief' : 'Markeer definitief'}
        </Button>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-[#2D6FE8]" />
        {chatMelding ??
          (isDefinitief
            ? 'Dit rapport is definitief — bewerkingen zijn vergrendeld.'
            : 'Snel AI-model verwerkt je opmerking direct in de tekst; opslaan gebeurt automatisch.')}
      </p>
    </div>
  ) : null;

  return (
    <>
      <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border border-border">
        {tabs}
        <div className="min-h-0 flex-1 overflow-hidden">
          <OnderzoekReportDocument
            rapport={activeRapport}
            isSaved={savedTypes?.has(activeRapport.type)}
            compact
          />
        </div>
        {chatbalk}
      </div>

      {/* Volledig scherm: ruime leesweergave + AI-chat */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="flex h-[94vh] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1400px]">
          {tabs}
          <div className="min-h-0 flex-1 overflow-auto">
            <OnderzoekReportDocument
              rapport={activeRapport}
              isSaved={savedTypes?.has(activeRapport.type)}
            />
          </div>
          {chatbalk}
        </DialogContent>
      </Dialog>
    </>
  );
}
