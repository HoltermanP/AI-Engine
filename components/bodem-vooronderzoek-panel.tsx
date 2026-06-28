'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Droplets, Loader2, Play } from 'lucide-react';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BodemSignaal, SignaalErnst } from '@/lib/services/bodem-vooronderzoek/types';
import type { RapportSectie } from '@/lib/services/bodem-vooronderzoek/nen5725-rapport';

/** Kleur per ernst — sluit aan op de bestaande RISICO_KLEUR-tinten. */
const ERNST_KLEUR: Record<SignaalErnst, string> = {
  kritisch: '#C0392B',
  let_op: '#E67E22',
  info: '#7F8C8D',
};
const ERNST_LABEL: Record<SignaalErnst, string> = {
  kritisch: 'Kritisch',
  let_op: 'Let op',
  info: 'Info',
};
const ERNST_VOLGORDE: SignaalErnst[] = ['kritisch', 'let_op', 'info'];

interface VooronderzoekResultaat {
  gebiedKey: string;
  ingest: { aantal: number; uitCache: boolean; fetchedAt: string; afgekapt: boolean };
  signalen: BodemSignaal[];
  aantalKritisch: number;
  rapport: {
    titel: string;
    disclaimer: string;
    secties: RapportSectie[];
    markdown: string;
    status: string;
  };
  geojson: GeoJSON.FeatureCollection;
}

/**
 * Zijpaneel "Bodem & omgeving" — start het NEN 5725-vooronderzoek voor het
 * geselecteerde tracé en toont de signaleringen + concept-rapport. De WBB-
 * signalen worden op de GEDEELDE cockpit-kaart getoond (geen eigen kaart meer).
 */
export function BodemVooronderzoekPanel() {
  const { allTraces, selectedTraceId } = useCockpit();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<VooronderzoekResultaat | null>(null);

  const trace = useMemo(
    () => allTraces.find((t) => t.id === selectedTraceId) ?? allTraces[0],
    [allTraces, selectedTraceId]
  );

  // Publiceer de WBB-signalen als laag op de gedeelde kaart (read-only modus).
  const mapConfig = useMemo(
    () => ({ editable: false, bodemSignalen: resultaat?.geojson }),
    [resultaat?.geojson]
  );
  useCockpitMap(mapConfig);

  const startVooronderzoek = useCallback(async () => {
    if (!trace) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch('/api/bodem/vooronderzoek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trace: trace.coordinates,
          traceId: trace.id,
          omschrijving: `${trace.code} — ${trace.naam}`,
          bufferM: 25,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Onbekende fout');
      setResultaat(data as VooronderzoekResultaat);
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Bodem-vooronderzoek mislukt');
    } finally {
      setBezig(false);
    }
  }, [trace]);

  const gesorteerdeSignalen = resultaat
    ? [...resultaat.signalen].sort(
        (a, b) => ERNST_VOLGORDE.indexOf(a.ernst) - ERNST_VOLGORDE.indexOf(b.ernst)
      )
    : [];

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Bodem & omgeving</h2>
          <p className="text-[11px] text-muted-foreground">
            NEN 5725-assistent · {trace ? `${trace.code} — ${trace.naam}` : 'geen tracé'}
          </p>
        </div>
        <Button size="sm" onClick={startVooronderzoek} disabled={bezig || !trace}>
          {bezig ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
          {bezig ? 'Bezig…' : 'Start'}
        </Button>
      </div>

      {fout && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">
          {fout}
        </div>
      )}

      {resultaat && (
        <>
          <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-[11px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{resultaat.rapport.disclaimer.replace(/\*\*/g, '')}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5" /> {resultaat.ingest.aantal} WBB-locaties
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-[#C0392B]" /> {resultaat.aantalKritisch} kritisch
            </span>
            <span>Opgehaald {resultaat.ingest.fetchedAt.slice(0, 10)}{resultaat.ingest.uitCache ? ' (cache)' : ''}</span>
          </div>

          <Tabs defaultValue="signalen">
            <TabsList>
              <TabsTrigger value="signalen">Signaleringen ({resultaat.signalen.length})</TabsTrigger>
              <TabsTrigger value="rapport">Concept-rapport</TabsTrigger>
            </TabsList>

            <TabsContent value="signalen" className="space-y-2">
              {gesorteerdeSignalen.map((s, i) => (
                <Card key={i} className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {s.handmatigeVerificatie && (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{s.titel}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{s.toelichting}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {s.bron} · opgehaald {s.bronDatum.slice(0, 10)}
                          {s.afstandM !== undefined && s.afstandM > 0 ? ` · ${s.afstandM} m` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge style={{ backgroundColor: ERNST_KLEUR[s.ernst], color: 'white' }}>
                      {ERNST_LABEL[s.ernst]}
                    </Badge>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="rapport" className="space-y-3">
              <h3 className="text-sm font-semibold">{resultaat.rapport.titel}</h3>
              <Badge variant="outline">status: {resultaat.rapport.status}</Badge>
              <Separator />
              {resultaat.rapport.secties.map((sectie) => (
                <div key={sectie.nummer} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold">{sectie.nummer} {sectie.titel}</h4>
                    {sectie.handmatigeVerificatie && (
                      <Badge variant="outline" className="border-amber-400 text-amber-700">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Handmatig
                      </Badge>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-[11px] text-muted-foreground">
                    {sectie.markdown.replace(/\*\*/g, '').replace(/^- /gm, '• ')}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
