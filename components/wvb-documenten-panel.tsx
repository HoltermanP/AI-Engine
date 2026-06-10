'use client';

/**
 * Paneel "Documenten & exports" — werkvoorbereidingsdocumenten per tracé.
 *
 * Genereert per document de markdown via een server action en biedt daarna
 * PDF/Word-download via het bestaande DocumentDownloadButtons-patroon.
 * Daarnaast directe exports: DXF (CAD) en materiaallijst (Excel).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import {
  genereerKabeltrekplanAction,
  genereerProefsleuvenAction,
  genereerUitgangspuntenAction,
  genereerVgPlanAction,
  type WvbDocumentResultaat,
} from '@/lib/actions/wvb-documenten';
import { Download, FileText, Loader2 } from 'lucide-react';

interface WvbDocumentenPanelProps {
  traceId: string;
  traceCode: string;
}

interface DocumentDef {
  id: string;
  naam: string;
  omschrijving: string;
  action: (traceId: string) => Promise<WvbDocumentResultaat>;
}

const DOCUMENTEN: DocumentDef[] = [
  {
    id: 'uitgangspunten',
    naam: 'Uitgangspuntennotitie',
    omschrijving: 'Normen, dekking, parallelafstanden en kruisingsmethoden (VO)',
    action: genereerUitgangspuntenAction,
  },
  {
    id: 'proefsleuven',
    naam: 'Proefsleuvenplan',
    omschrijving: 'Voorgestelde proefsleuflocaties conform CROW 500 (WVB)',
    action: genereerProefsleuvenAction,
  },
  {
    id: 'vgplan',
    naam: 'V&G-plan ontwerpfase',
    omschrijving: 'Risico-inventarisatie met beheersmaatregelen (WVB)',
    action: genereerVgPlanAction,
  },
  {
    id: 'kabeltrekplan',
    naam: 'Kabeltrekplan',
    omschrijving: 'Trekvakken, opstelplaatsen, rollenplan en trekkrachttoets (WVB)',
    action: genereerKabeltrekplanAction,
  },
];

interface GegenereerdDocument {
  titel: string;
  docCode: string;
  markdown: string;
}

export function WvbDocumentenPanel({ traceId, traceCode }: WvbDocumentenPanelProps) {
  const [bezig, setBezig] = useState<string | null>(null);
  const [resultaten, setResultaten] = useState<Record<string, GegenereerdDocument>>({});
  const [fouten, setFouten] = useState<Record<string, string>>({});

  async function genereer(doc: DocumentDef) {
    setBezig(doc.id);
    setFouten((f) => ({ ...f, [doc.id]: '' }));
    try {
      const resultaat = await doc.action(traceId);
      if ('error' in resultaat) {
        setFouten((f) => ({ ...f, [doc.id]: resultaat.error }));
      } else {
        setResultaten((r) => ({ ...r, [doc.id]: resultaat }));
      }
    } catch {
      setFouten((f) => ({
        ...f,
        [doc.id]: 'Genereren mislukt — probeer het opnieuw.',
      }));
    } finally {
      setBezig(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Documenten &amp; exports
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Werkvoorbereidingsdocumenten worden deterministisch gegenereerd uit het tracé en de
          verzamelde gebiedsdata.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {DOCUMENTEN.map((doc) => {
          const resultaat = resultaten[doc.id];
          const fout = fouten[doc.id];
          return (
            <div key={doc.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{doc.naam}</p>
                  <p className="text-xs text-muted-foreground">{doc.omschrijving}</p>
                  {resultaat && (
                    <Badge variant="outline" className="mt-1 font-mono text-[10px]">
                      {resultaat.docCode}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {resultaat ? (
                    <DocumentDownloadButtons
                      markdown={resultaat.markdown}
                      title={resultaat.titel}
                      filename={resultaat.docCode}
                      size="sm"
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={bezig !== null}
                      onClick={() => genereer(doc)}
                    >
                      {bezig === doc.id ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Genereren…
                        </>
                      ) : (
                        'Genereer'
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {fout && <p className="mt-2 text-xs text-destructive">{fout}</p>}
            </div>
          );
        })}

        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-medium text-foreground">Directe exports</p>
          <p className="text-xs text-muted-foreground">
            CAD-bestand (NLCS-lagen) en materiaallijst, rechtstreeks gedownload.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`/api/export?traceId=${traceId}&type=dxf`}
              download
              className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              <Download className="mr-1 h-3 w-3" />
              DXF ({traceCode})
            </a>
            <a
              href={`/api/export?traceId=${traceId}&type=materiaal`}
              download
              className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
            >
              <Download className="mr-1 h-3 w-3" />
              Materiaallijst (Excel)
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
