'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Download, FileText, FolderArchive, Loader2, ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDossierAction, generateDoDocumentAction } from '@/lib/actions/engineering';
import { downloadAllDossierItemsPdf, downloadDossierItemPdf } from '@/lib/export/download';
import type { DossierItem } from '@/lib/dossier/store';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';

const TYPE_LABELS: Record<DossierItem['type'], string> = {
  berekening: 'Berekeningen',
  tekening: 'Tekeningen',
  onderzoek: 'Onderzoeken',
  aanvraag: 'Aanvragen',
  rapport: 'Rapporten',
  ai: 'AI-analyses',
  calculatie: 'Calculaties',
};

/**
 * Zijpaneel "Dossier" — bundelt de geproduceerde documenten per type, genereert
 * het Definitief Ontwerp en biedt downloads. Geen kaart (read-only context).
 */
export function DossierPanel() {
  const { projectId } = useCockpit();
  useCockpitMap(useMemo(() => ({ editable: false, defaultDrawMode: 'none' as const }), []));

  const [items, setItems] = useState<DossierItem[]>([]);
  const [doContent, setDoContent] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    getDossierAction(projectId).then(setItems);
  }, [projectId]);

  const grouped = useMemo(
    () =>
      Object.keys(TYPE_LABELS).reduce(
        (acc, type) => {
          acc[type as DossierItem['type']] = items.filter((i) => i.type === type);
          return acc;
        },
        {} as Record<DossierItem['type'], DossierItem[]>
      ),
    [items]
  );

  function handleGenerateDo() {
    startTransition(async () => {
      const result = await generateDoDocumentAction(projectId);
      setDoContent(result.inhoud);
    });
  }

  async function handleDownloadAll() {
    setDownloading(true);
    try {
      await downloadAllDossierItemsPdf(items, `dossier-${projectId}`);
    } finally {
      setDownloading(false);
    }
  }

  const typesMetItems = (Object.keys(TYPE_LABELS) as DossierItem['type'][]).filter(
    (t) => grouped[t].length > 0
  );

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Dossier</h2>
          <p className="text-[11px] text-muted-foreground">{items.length} document(en)</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={handleGenerateDo} disabled={isPending}>
            {isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ScrollText className="mr-1 h-3.5 w-3.5" />}
            Genereer DO
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadAll} disabled={downloading || items.length === 0}>
            {downloading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FolderArchive className="mr-1 h-3.5 w-3.5" />}
            Alles (PDF)
          </Button>
        </div>
      </div>

      {doContent && (
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Definitief Ontwerp (concept)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
              {doContent.replace(/\*\*/g, '')}
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nog geen documenten. Deze ontstaan in eerdere stappen (engineering, tekeningen, onderzoeken).
        </p>
      ) : (
        <Tabs defaultValue={typesMetItems[0] ?? 'berekening'}>
          <TabsList className="flex-wrap">
            {typesMetItems.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TYPE_LABELS[t]} ({grouped[t].length})
              </TabsTrigger>
            ))}
          </TabsList>
          {typesMetItems.map((t) => (
            <TabsContent key={t} value={t} className="space-y-1.5">
              {grouped[t].map((item) => (
                <Card key={item.id} className="flex items-center justify-between gap-2 p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{item.naam}</p>
                      {item.formaat && (
                        <Badge variant="outline" className="mt-0.5 text-[9px]">
                          {item.formaat}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => downloadDossierItemPdf(item)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
