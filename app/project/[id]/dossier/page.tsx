'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { SourceBadge } from '@/components/source-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import { DocumentPreview } from '@/components/document-preview';
import { getDossierAction, generateDoDocumentAction, stelUitvoeringsmapSamenAction } from '@/lib/actions/engineering';
import type { DossierItem } from '@/lib/dossier/store';
import {
  dossierItemToHtml,
  isDossierItemTextDocument,
} from '@/lib/dossier/document-content';
import { getProjectHeaderAction } from '@/lib/actions/data';
import type { DemoProject } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import {
  downloadAllDossierItemsPdf,
  downloadAllDossierItemsWord,
  downloadDossierItemPdf,
  downloadDossierItemWord,
} from '@/lib/export/download';
import {
  Download,
  Eye,
  FileText,
  FolderArchive,
  Loader2,
  ScrollText,
} from 'lucide-react';

const TYPE_LABELS: Record<DossierItem['type'], string> = {
  berekening: 'Berekeningen',
  tekening: 'Tekeningen',
  onderzoek: 'Onderzoeken',
  aanvraag: 'Aanvragen',
  rapport: 'Rapporten',
  ai: 'AI-analyses',
  calculatie: 'Calculaties',
};

export default function DossierPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const traceFilter = searchParams.get('trace');
  const [projectHeader, setProjectHeader] = useState<{
    project: DemoProject;
    firstTrace: DemoTrace | null;
  } | null>(null);
  const [items, setItems] = useState<DossierItem[]>([]);
  const [doContent, setDoContent] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [downloadingAll, setDownloadingAll] = useState<'pdf' | 'word' | null>(null);
  const [mapMelding, setMapMelding] = useState<string | null>(null);

  const project = projectHeader?.project ?? null;
  const firstTrace = projectHeader?.firstTrace ?? null;

  useEffect(() => {
    getProjectHeaderAction(projectId).then(setProjectHeader);
  }, [projectId]);

  useEffect(() => {
    getDossierAction(projectId, traceFilter ?? undefined).then(setItems);
  }, [projectId, traceFilter]);

  const grouped = Object.keys(TYPE_LABELS).reduce(
    (acc, type) => {
      acc[type as DossierItem['type']] = items.filter((i) => i.type === type);
      return acc;
    },
    {} as Record<DossierItem['type'], DossierItem[]>
  );

  const doMarkdown =
    doContent ?? items.find((i) => i.naam.includes('Definitief Ontwerp'))?.inhoud ?? null;

  function handleGenerateDo() {
    startTransition(async () => {
      const result = await generateDoDocumentAction(projectId);
      setDoContent(result.inhoud);
      const fresh = await getDossierAction(projectId, traceFilter ?? undefined);
      setItems(fresh);
    });
  }

  function handleUitvoeringsmap() {
    if (!firstTrace) return;
    startTransition(async () => {
      const result = await stelUitvoeringsmapSamenAction(traceFilter ?? firstTrace.id);
      setMapMelding(
        result.compleet
          ? `${result.naam} samengesteld — alle vereiste stukken aanwezig.`
          : `${result.naam} samengesteld — nog aan te vullen: ${result.ontbrekend.length} onderdeel/onderdelen (zie de map).`
      );
      const fresh = await getDossierAction(projectId, traceFilter ?? undefined);
      setItems(fresh);
    });
  }

  async function handleDownloadAllPdf() {
    if (!project) return;
    setDownloadingAll('pdf');
    try {
      await downloadAllDossierItemsPdf(items, project.naam);
    } finally {
      setDownloadingAll(null);
    }
  }

  async function handleDownloadAllWord() {
    if (!project) return;
    setDownloadingAll('word');
    try {
      await downloadAllDossierItemsWord(items, project.naam);
    } finally {
      setDownloadingAll(null);
    }
  }

  return (
      <PageContainer>
        <PageHero
          eyebrow="Dossier"
          title={project?.naam ?? 'Onbekend project'}
          subtitle={`Alle documenten, tekeningen, rapporten en berekeningen${traceFilter ? ` voor tracé ${traceFilter}` : ''}.`}
          backLink={{ href: `/project/${projectId}`, label: 'Terug naar projectoverzicht' }}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{items.length} documenten</Badge>
              {traceFilter && (
                <Link href={`/project/${projectId}/dossier`} className="text-xs text-[#2D6FE8] hover:underline">
                  Toon alle tracés
                </Link>
              )}
            </div>
          }
        />

        <Card className="overflow-hidden border-[#2D6FE8]/20 bg-gradient-to-br from-[#2D6FE8]/8 via-white to-white stat-glow-blue">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="h-4 w-4 text-[#2D6FE8]" />
              Definitief Ontwerp (DO)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Stel een DO-document op met projectbeschrijving, tracés, engineering en bijlagenoverzicht.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleGenerateDo} disabled={isPending} className="bg-[#2D6FE8]">
                {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileText className="mr-1 h-3 w-3" />}
                DO-document opstellen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUitvoeringsmap}
                disabled={isPending || !firstTrace}
              >
                <FolderArchive className="mr-1 h-3 w-3" />
                Uitvoeringsmap samenstellen
              </Button>
              {doMarkdown && project && (
                <DocumentDownloadButtons
                  markdown={doMarkdown}
                  title={`Definitief Ontwerp — ${project.naam}`}
                  filename={`${project.naam.replace(/\s+/g, '_')}_DO`}
                />
              )}
              {items.length > 0 && project && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadAllPdf}
                    disabled={!!downloadingAll}
                  >
                    <FolderArchive className="mr-1 h-3 w-3" />
                    {downloadingAll === 'pdf' ? 'Bundel PDF…' : 'Alles als PDF'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadAllWord}
                    disabled={!!downloadingAll}
                  >
                    <FolderArchive className="mr-1 h-3 w-3" />
                    {downloadingAll === 'word' ? 'Bundel Word…' : 'Alles als Word'}
                  </Button>
                </>
              )}
            </div>
            {mapMelding && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-800">{mapMelding}</p>
            )}
            {doMarkdown && (
              <div className="max-h-96 overflow-auto rounded-lg border border-border bg-slate-100/50 p-4">
                <DocumentPreview
                  markdown={doMarkdown}
                  compact
                  title="Definitief Ontwerp (DO)"
                  subtitle={project?.naam}
                  showBrandHeader
                />
              </div>
            )}
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">Het dossier vult zich vanuit het proces</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Elke stap legt zijn producten hier automatisch vast — zo groeit het dossier mee tot
                  de complete uitvoeringsmap.
                </p>
              </div>
              <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  {
                    stap: '1',
                    titel: 'Engineering',
                    tekst: 'Berekeningen, tekeningen en boorplannen uit fase 3 / het netontwerp',
                    href: firstTrace ? `/project/${projectId}/trace/${firstTrace.id}` : undefined,
                    label: 'Naar tracé-engineering',
                  },
                  {
                    stap: '2',
                    titel: 'Omgeving',
                    tekst: 'Quickscans, vergunningchecklist en aanvragen uit fase 4',
                    href: firstTrace ? `/project/${projectId}/trace/${firstTrace.id}` : undefined,
                    label: 'Naar omgeving',
                  },
                  {
                    stap: '3',
                    titel: 'Werkvoorbereiding',
                    tekst: 'V&G-plan, kabeltrekplan en uitvoeringsmap richting start uitvoering',
                    href: `/project/${projectId}`,
                    label: 'Bekijk startgereedheid',
                  },
                ].map((kaart) => (
                  <div key={kaart.stap} className="rounded-lg border border-border bg-muted/30 p-3 text-left">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2D6FE8]/10 text-[11px] font-bold text-[#2D6FE8]">
                      {kaart.stap}
                    </span>
                    <p className="mt-2 text-xs font-semibold">{kaart.titel}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{kaart.tekst}</p>
                    {kaart.href && (
                      <Link href={kaart.href} className="mt-2 inline-block text-[11px] font-medium text-[#2D6FE8] hover:underline">
                        {kaart.label} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="alle">
            <TabsList>
              <TabsTrigger value="alle">Alle ({items.length})</TabsTrigger>
              {Object.entries(TYPE_LABELS).map(([type, label]) =>
                grouped[type as DossierItem['type']].length > 0 ? (
                  <TabsTrigger key={type} value={type}>
                    {label} ({grouped[type as DossierItem['type']].length})
                  </TabsTrigger>
                ) : null
              )}
            </TabsList>

            <TabsContent value="alle" className="mt-4">
              <DossierGrid items={items} />
            </TabsContent>

            {Object.entries(TYPE_LABELS).map(([type]) => (
              <TabsContent key={type} value={type} className="mt-4">
                <DossierGrid items={grouped[type as DossierItem['type']]} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </PageContainer>
  );
}

function DossierGrid({ items }: { items: DossierItem[] }) {
  const [selected, setSelected] = useState<DossierItem | null>(null);
  const [downloading, setDownloading] = useState<'pdf' | 'word' | null>(null);

  async function handlePdf(item: DossierItem) {
    setDownloading('pdf');
    try {
      await downloadDossierItemPdf(item);
    } finally {
      setDownloading(null);
    }
  }

  async function handleWord(item: DossierItem) {
    setDownloading('word');
    try {
      await downloadDossierItemWord(item);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader className="p-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{item.naam}</CardTitle>
                {item._source && <SourceBadge source={item._source} />}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString('nl-NL')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="max-h-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
                {isDossierItemTextDocument(item) ? (
                  <div
                    className="report-document p-3 text-[10px] leading-snug [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-[10px] [&_p]:text-[10px] [&_li]:text-[10px]"
                    dangerouslySetInnerHTML={{ __html: dossierItemToHtml(item) }}
                  />
                ) : (
                  <div
                    className="report-document p-2"
                    dangerouslySetInnerHTML={{ __html: dossierItemToHtml(item) }}
                  />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => setSelected(item)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Bekijken
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => handlePdf(item)}
                  disabled={!!downloading}
                >
                  <Download className="mr-1 h-3 w-3" />
                  {downloading === 'pdf' ? 'PDF…' : 'PDF'}
                </Button>
                {isDossierItemTextDocument(item) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleWord(item)}
                    disabled={!!downloading}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    {downloading === 'word' ? 'Word…' : 'Word'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
          {selected && (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{selected.naam}</p>
                  <p className="text-[10px] text-muted-foreground">{selected.type}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => handlePdf(selected)}
                    disabled={!!downloading}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    PDF
                  </Button>
                  {isDossierItemTextDocument(selected) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleWord(selected)}
                      disabled={!!downloading}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Word
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100/50 p-6">
                <DocumentPreview html={dossierItemToHtml(selected)} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
