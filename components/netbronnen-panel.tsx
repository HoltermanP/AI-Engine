'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listNetBronnenAction,
  loadNetBronViaApiAction,
  uploadNetLaagAction,
  type NetBronStatus,
} from '@/lib/actions/netbeheerder-data';
import { Cable, CloudDownload, Upload, CheckCircle2 } from 'lucide-react';

/**
 * Beheer van K&L-lagen per netbeheerder/waterbedrijf: laden via open-data-API
 * waar beschikbaar, anders eigen GeoJSON uploaden. Geladen lagen verschijnen
 * direct in de kaart (bestaand net) en tellen mee in de tracé-toetsing.
 */
export function NetbronnenPanel() {
  const [bronnen, setBronnen] = useState<NetBronStatus[]>([]);
  const [melding, setMelding] = useState<{ bronId: string; tekst: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBronRef = useRef<string | null>(null);

  const refresh = () => listNetBronnenAction().then(setBronnen);

  useEffect(() => {
    void refresh();
  }, []);

  function handleApiLoad(bronId: string) {
    startTransition(async () => {
      const result = await loadNetBronViaApiAction(bronId);
      setMelding({
        bronId,
        ok: result.ok,
        tekst: result.ok ? `${result.aantal} lijnen geladen via API` : result.error,
      });
      await refresh();
    });
  }

  function handleUploadKlik(bronId: string) {
    uploadBronRef.current = bronId;
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const bronId = uploadBronRef.current;
    e.target.value = '';
    if (!file || !bronId) return;

    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const result = await uploadNetLaagAction(bronId, String(reader.result ?? ''));
        setMelding({
          bronId,
          ok: result.ok,
          tekst: result.ok ? `${result.aantal} lijnen geüpload` : result.error,
        });
        await refresh();
      });
    };
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Cable className="h-4 w-4 text-[#2D6FE8]" />
          K&L-lagen netbeheerders & waterbedrijven
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Open data via API waar beschikbaar; anders eigen GeoJSON uploaden (RD of WGS84,
          LineString/MultiLineString). Geladen lagen verschijnen als bestaand net op de kaart en in de toetsing.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          className="hidden"
          onChange={handleFile}
        />
        {bronnen.map((bron) => (
          <div
            key={bron.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-foreground">
                {bron.label}
                <Badge variant="outline" className="text-[10px]">
                  {bron.thema}
                </Badge>
                {bron.geladenItems > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {bron.geladenItems} lijnen geladen
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {bron.toelichting}
                {!bron.apiBeschikbaar && ` · API instelbaar via ${bron.envVar}`}
              </p>
              {melding?.bronId === bron.id && (
                <p className={`text-[10px] ${melding.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                  {melding.tekst}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              {bron.apiBeschikbaar && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleApiLoad(bron.id)}
                >
                  <CloudDownload className="mr-1 h-3 w-3" />
                  Via API
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => handleUploadKlik(bron.id)}
              >
                <Upload className="mr-1 h-3 w-3" />
                Upload
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
