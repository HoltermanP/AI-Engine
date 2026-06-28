'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  listReferentieTracesAction,
  uploadReferentieTracesAction,
  type ReferentieTraceOverzicht,
} from '@/lib/actions/trace-leren';
import { GraduationCap, Upload } from 'lucide-react';

/**
 * Trainen van de automatische tracébepaling: upload eerder ontworpen tracés
 * (GeoJSON). De router behandelt deze als geleerde voorkeurscorridors.
 */
export function TraceLeerPanel() {
  const [overzicht, setOverzicht] = useState<ReferentieTraceOverzicht | null>(null);
  const [melding, setMelding] = useState<{ tekst: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listReferentieTracesAction().then(setOverzicht);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const result = await uploadReferentieTracesAction(file.name, String(reader.result ?? ''));
        setMelding({
          ok: result.ok,
          tekst: result.ok
            ? `${result.aantal} referentietracé(s) toegevoegd — de router gebruikt ze direct als voorkeurscorridor`
            : result.error,
        });
        setOverzicht(await listReferentieTracesAction());
      });
    };
    reader.readAsText(file);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GraduationCap className="h-4 w-4 text-[#2D6FE8]" />
          Tracébepaling trainen met bestaande ontwerpen
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Upload eerder ontworpen tracés (GeoJSON of AutoCAD <span className="font-mono">.dxf</span>,
          RD of WGS84). De automatische tracébepaling leert hiervan: routes die een referentieontwerp
          volgen krijgen een sterke voorkeur en worden in de segmentanalyse als &quot;geleerde
          voorkeurscorridor&quot; gemarkeerd. DWG eerst in AutoCAD als DXF exporteren
          (<span className="font-mono">DXFOUT</span>).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.dxf,application/geo+json,application/json,image/vnd.dxf"
          className="hidden"
          onChange={handleFile}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()} className="bg-[#2D6FE8]">
            <Upload className="mr-1 h-3 w-3" />
            Referentietracés uploaden
          </Button>
          {overzicht && (
            <p className="text-xs text-muted-foreground">
              {overzicht.aantal} referentietracé(s) geladen
              {overzicht.aantal > 0 && ` · ${overzicht.totaleLengteKm} km · bron: ${overzicht.bronnen.join(', ')}`}
            </p>
          )}
        </div>
        {melding && (
          <p className={`text-xs ${melding.ok ? 'text-emerald-700' : 'text-red-600'}`}>{melding.tekst}</p>
        )}
      </CardContent>
    </Card>
  );
}
