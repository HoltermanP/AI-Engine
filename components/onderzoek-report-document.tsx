'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SourceBadge } from '@/components/source-badge';
import type { OnderzoekDocument } from '@/lib/research/types';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import { DocumentPreview } from '@/components/document-preview';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Sparkles,
} from 'lucide-react';

interface OnderzoekReportDocumentProps {
  rapport: OnderzoekDocument;
  projectId?: string;
  traceId?: string;
  isSaved?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_uitvoering: 'In uitvoering',
  afgerond: 'Afgerond',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'border-slate-300 text-slate-600',
  in_uitvoering: 'border-amber-500/50 text-amber-700',
  afgerond: 'border-green-500/50 text-green-700',
};

export function OnderzoekReportDocument({
  rapport,
  projectId,
  traceId,
  isSaved = false,
  isSaving = false,
  onSave,
  compact = false,
}: OnderzoekReportDocumentProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [rapport.type, rapport.inhoud]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-[#2D6FE8]" />
          <span className="text-sm font-medium text-foreground">{rapport.titel}</span>
          <SourceBadge source={rapport._source} />
          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[rapport.status] ?? ''}`}>
            {STATUS_LABELS[rapport.status] ?? rapport.status}
          </Badge>
          {isSaved && (
            <Badge variant="outline" className="border-green-500/50 text-[10px] text-green-700 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Opgeslagen in dossier
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isSaved && projectId && (
            <Link
              href={`/project/${projectId}/dossier${traceId ? `?trace=${traceId}` : ''}`}
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-xs hover:bg-muted"
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Dossier
            </Link>
          )}
          {onSave && !isSaved && (
            <Button
              size="sm"
              className="h-8 bg-[#2D6FE8] hover:bg-[#2D6FE8]/90"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Opslaan in dossier
            </Button>
          )}
          <DocumentDownloadButtons
            markdown={rapport.inhoud}
            title={rapport.titel}
            filename={rapport.titel.replace(/\s+/g, '_')}
            pdfMeta={{
              subtitel: rapport.titel,
              status: STATUS_LABELS[rapport.status] ?? rapport.status,
            }}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`flex-1 overflow-auto bg-slate-100/50 ${compact ? 'p-3' : 'p-6'}`}
      >
        <DocumentPreview
          markdown={rapport.inhoud}
          compact={compact}
          title={rapport.titel}
          showBrandHeader={!compact}
          meta={
            !compact
              ? [{ label: 'Status', value: STATUS_LABELS[rapport.status] ?? rapport.status }]
              : undefined
          }
        />
      </div>
    </div>
  );
}

interface OnderzoekReportLoadingProps {
  stepLabel: string;
  useAnthropic?: boolean;
}

export function OnderzoekReportLoading({
  stepLabel,
  useAnthropic = true,
}: OnderzoekReportLoadingProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-[#2D6FE8]/8 via-white to-slate-50/80 p-8 text-center">
      <div className="relative mb-6">
        <div className="rounded-2xl bg-[#2D6FE8]/10 p-6 ring-1 ring-[#2D6FE8]/20">
          <Sparkles className="h-10 w-10 text-[#2D6FE8] animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-1 shadow-md ring-1 ring-border">
          <Loader2 className="h-6 w-6 animate-spin text-[#2D6FE8]" />
        </div>
      </div>
      <Badge variant="outline" className="mb-3 border-[#2D6FE8]/40 bg-[#2D6FE8]/5 text-[#2D6FE8]">
        {useAnthropic ? 'Anthropic AI' : 'Rapportgenerator'}
      </Badge>
      <h3 className="font-[family-name:var(--font-space-grotesk)] text-base font-semibold text-foreground">
        {stepLabel}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {useAnthropic
          ? 'Claude analyseert tracédata en schrijft een uitgebreid, gestructureerd rapport.'
          : 'Het conceptrapport wordt opgesteld op basis van tracé- en projectdata.'}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Even geduld — dit duurt meestal <span className="font-medium text-foreground">30–90 seconden</span>
      </p>
      <div className="mt-8 w-full max-w-sm space-y-2.5 text-left">
        <AiProgressStep label="Conceptrapport samenstellen" status="done" />
        <AiProgressStep
          label={useAnthropic ? 'AI-rapport genereren (Anthropic)' : 'Rapport structureren'}
          status="active"
        />
        <AiProgressStep label="Markdown opmaken" status="pending" />
      </div>
    </div>
  );
}

function AiProgressStep({
  label,
  status,
}: {
  label: string;
  status: 'done' | 'active' | 'pending';
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[11px] ${
        status === 'active'
          ? 'border-[#2D6FE8]/40 bg-[#2D6FE8]/5 text-foreground'
          : status === 'done'
            ? 'border-green-500/30 bg-green-500/5 text-green-800'
            : 'border-border bg-muted/30 text-muted-foreground'
      }`}
    >
      {status === 'active' ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#2D6FE8]" />
      ) : status === 'done' ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0 opacity-40" />
      )}
      <span>{label}</span>
    </div>
  );
}

interface OnderzoekReportStreamingProps {
  rapport: OnderzoekDocument;
  useAnthropic?: boolean;
  charCount?: number;
}

export function OnderzoekReportStreaming({
  rapport,
  useAnthropic = true,
  charCount,
}: OnderzoekReportStreamingProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const hasContent = rapport.inhoud.length > 0;

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [rapport.inhoud, autoScroll]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(nearBottom);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-[#2D6FE8]" />
          <span className="text-sm font-medium text-foreground">{rapport.titel}</span>
          <Badge
            variant="outline"
            className="gap-1 border-[#2D6FE8]/40 bg-[#2D6FE8]/5 text-[10px] text-[#2D6FE8]"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {useAnthropic ? 'AI schrijft…' : 'Rapport wordt opgebouwd…'}
          </Badge>
          {charCount != null && charCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {charCount.toLocaleString('nl-NL')} tekens
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[#2D6FE8] animate-pulse" />
          Live opbouw
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-auto bg-slate-100/50 p-6"
      >
        {hasContent ? (
          <DocumentPreview
            markdown={rapport.inhoud}
            title={rapport.titel}
            showBrandHeader
            meta={[{ label: 'Status', value: 'In uitvoering — live' }]}
          />
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <div className="rounded-2xl bg-[#2D6FE8]/10 p-5 ring-1 ring-[#2D6FE8]/20">
                <Sparkles className="h-8 w-8 text-[#2D6FE8] animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 shadow ring-1 ring-border">
                <Loader2 className="h-5 w-5 animate-spin text-[#2D6FE8]" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">
              {useAnthropic ? 'Claude bereidt het rapport voor…' : 'Rapport wordt samengesteld…'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              De tekst verschijnt hieronder zodra de eerste zinnen klaar zijn.
            </p>
          </div>
        )}
        {hasContent && (
          <div className="pointer-events-none sticky bottom-4 mx-auto mt-4 flex max-w-4xl justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2D6FE8]/30 bg-white/95 px-2.5 py-1 text-[10px] text-[#2D6FE8] shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2D6FE8] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2D6FE8]" />
              </span>
              Tekst wordt live toegevoegd
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OnderzoekReportPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-slate-50/50 p-8 text-center">
      <div className="mb-4 rounded-full bg-[#2D6FE8]/10 p-4">
        <FileText className="h-8 w-8 text-[#2D6FE8]" />
      </div>
      <h3 className="text-sm font-medium text-foreground">Rapportvoorbeeld</h3>
      <p className="mt-2 max-w-sm text-xs text-muted-foreground leading-relaxed">
        Start een onderzoek via de stappen links. Het rapport verschijnt hier direct opgemaakt
        in de applicatie. Sla het daarna op in het dossier.
      </p>
    </div>
  );
}
