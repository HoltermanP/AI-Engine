'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Droplets, Loader2, MapPin, Play } from 'lucide-react';
import { loadMapLibre, type MapLibreMap } from '@/lib/maplibre-cdn';
import { lineRdToGeoJson } from '@/lib/geo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BboxQuery } from '@/lib/connectors/types';
import type { BodemSignaal, SignaalErnst } from '@/lib/services/bodem-vooronderzoek/types';
import type { RapportSectie } from '@/lib/services/bodem-vooronderzoek/nen5725-rapport';

const BRT_GRIJS =
  'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png';

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

export interface BodemVooronderzoekPanelProps {
  /** Tracé-coördinaten in RD/28992 (voor buffer- en AHN-analyse + kaartlijn). */
  trace?: [number, number, number?][];
  /** Losse bbox (RD) als er geen tracé is. */
  bbox?: BboxQuery;
  traceId?: string;
  projectId?: string;
  omschrijving?: string;
  bufferM?: number;
}

export function BodemVooronderzoekPanel({
  trace,
  bbox,
  traceId,
  projectId,
  omschrijving,
  bufferM = 25,
}: BodemVooronderzoekPanelProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<VooronderzoekResultaat | null>(null);

  // Kaart initialiseren (BRT grijs als basiskaart).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    void (async () => {
      const ml = await loadMapLibre();
      if (cancelled || !mapContainer.current) return;
      map = new ml.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            basemap: { type: 'raster', tiles: [BRT_GRIJS], tileSize: 256, attribution: '© PDOK' },
          },
          layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
        },
        center: [5.2, 52.2],
        zoom: 7,
      });
      map.addControl(new ml.NavigationControl(), 'top-right');
      map.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left');
      map.on('load', () => {
        if (!cancelled) setMapReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Kaartlagen bijwerken zodra er een resultaat is: verontreiniging-fill + tracé-lijn.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !resultaat) return;

    const fc = resultaat.geojson;
    // Verontreiniging-fill (kleur op ernst: verontreinigd = kritisch, anders let op).
    const wbb = map.getSource('wbb-source') as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined;
    if (wbb?.setData) {
      wbb.setData(fc);
    } else {
      map.addSource('wbb-source', { type: 'geojson', data: fc });
      map.addLayer({
        id: 'wbb-fill',
        type: 'fill',
        source: 'wbb-source',
        paint: {
          'fill-color': [
            'case',
            ['in', 'verontreinig', ['downcase', ['coalesce', ['get', 'statusOordeel'], '']]],
            ERNST_KLEUR.kritisch,
            ERNST_KLEUR.let_op,
          ],
          'fill-opacity': 0.45,
          'fill-outline-color': '#5d2c26',
        },
      });
    }

    // Tracé-lijn bovenop.
    if (trace && trace.length >= 2) {
      const lineFc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: lineRdToGeoJson(trace), properties: {} }],
      };
      const src = map.getSource('trace-source') as { setData: (d: GeoJSON.FeatureCollection) => void } | undefined;
      if (src?.setData) {
        src.setData(lineFc);
      } else {
        map.addSource('trace-source', { type: 'geojson', data: lineFc });
        map.addLayer({
          id: 'trace-line',
          type: 'line',
          source: 'trace-source',
          paint: { 'line-color': '#1d4ed8', 'line-width': 3 },
        });
      }
    }

    // Inzoomen op de data.
    const coords: [number, number][] = [];
    for (const f of fc.features) {
      const g = f.geometry;
      if (g.type === 'Polygon') for (const ring of g.coordinates) for (const c of ring) coords.push(c as [number, number]);
    }
    if (coords.length > 0) {
      const xs = coords.map((c) => c[0]);
      const ys = coords.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]],
        { padding: 40, maxZoom: 16, duration: 600 }
      );
    }
  }, [resultaat, mapReady, trace]);

  const startVooronderzoek = useCallback(async () => {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch('/api/bodem/vooronderzoek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trace, bbox, traceId, projectId, omschrijving, bufferM }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Onbekende fout');
      setResultaat(data as VooronderzoekResultaat);
    } catch (e) {
      setFout(e instanceof Error ? e.message : 'Bodem-vooronderzoek mislukt');
    } finally {
      setBezig(false);
    }
  }, [trace, bbox, traceId, projectId, omschrijving, bufferM]);

  const gesorteerdeSignalen = resultaat
    ? [...resultaat.signalen].sort(
        (a, b) => ERNST_VOLGORDE.indexOf(a.ernst) - ERNST_VOLGORDE.indexOf(b.ernst)
      )
    : [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Kaart */}
      <div className="lg:w-1/2">
        <Card className="overflow-hidden">
          <div ref={mapContainer} className="h-[420px] w-full" />
          <div className="flex flex-wrap items-center gap-3 border-t p-3 text-xs text-muted-foreground">
            <span className="font-medium">Legenda:</span>
            <LegendaItem kleur={ERNST_KLEUR.kritisch} label="Bekend verontreinigd (WBB)" />
            <LegendaItem kleur={ERNST_KLEUR.let_op} label="Bodemlocatie (onderzocht)" />
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1 w-5 rounded" style={{ background: '#1d4ed8' }} /> Tracé
            </span>
          </div>
        </Card>
      </div>

      {/* Paneel */}
      <div className="flex flex-col gap-3 lg:w-1/2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Bodem-vooronderzoek</h2>
            <p className="text-xs text-muted-foreground">
              NEN 5725-assistent · aggregeert open data, markeert mens-werk
            </p>
          </div>
          <Button onClick={startVooronderzoek} disabled={bezig}>
            {bezig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {bezig ? 'Bezig…' : 'Start vooronderzoek'}
          </Button>
        </div>

        {fout && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {fout}
          </div>
        )}

        {resultaat && (
          <>
            <ScopeBanner disclaimer={resultaat.rapport.disclaimer} />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" /> {resultaat.ingest.aantal} WBB-locaties
              </span>
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-[#C0392B]" /> {resultaat.aantalKritisch} kritisch
              </span>
              <span>
                Opgehaald {resultaat.ingest.fetchedAt.slice(0, 10)}
                {resultaat.ingest.uitCache ? ' (cache)' : ''}
              </span>
            </div>

            <Tabs defaultValue="signalen">
              <TabsList>
                <TabsTrigger value="signalen">Signaleringen ({resultaat.signalen.length})</TabsTrigger>
                <TabsTrigger value="rapport">Concept-rapport</TabsTrigger>
              </TabsList>

              <TabsContent value="signalen" className="space-y-2">
                {gesorteerdeSignalen.map((s, i) => (
                  <SignaalKaart key={i} signaal={s} />
                ))}
              </TabsContent>

              <TabsContent value="rapport" className="space-y-3">
                <h3 className="text-base font-semibold">{resultaat.rapport.titel}</h3>
                <Badge variant="outline">status: {resultaat.rapport.status}</Badge>
                <Separator />
                {resultaat.rapport.secties.map((sectie) => (
                  <RapportSectieBlok key={sectie.nummer} sectie={sectie} />
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

function LegendaItem({ kleur, label }: { kleur: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: kleur, opacity: 0.7 }} />
      {label}
    </span>
  );
}

function ScopeBanner({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{disclaimer.replace(/\*\*/g, '')}</p>
    </div>
  );
}

function SignaalKaart({ signaal }: { signaal: BodemSignaal }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {signaal.handmatigeVerificatie && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-medium">{signaal.titel}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{signaal.toelichting}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {signaal.bron} · opgehaald {signaal.bronDatum.slice(0, 10)}
              {signaal.afstandM !== undefined && signaal.afstandM > 0 ? ` · ${signaal.afstandM} m` : ''}
            </p>
          </div>
        </div>
        <Badge style={{ backgroundColor: ERNST_KLEUR[signaal.ernst], color: 'white' }}>
          {ERNST_LABEL[signaal.ernst]}
        </Badge>
      </div>
    </Card>
  );
}

function RapportSectieBlok({ sectie }: { sectie: RapportSectie }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">
          {sectie.nummer} {sectie.titel}
        </h4>
        {sectie.handmatigeVerificatie && (
          <Badge variant="outline" className="border-amber-400 text-amber-700">
            <AlertTriangle className="mr-1 h-3 w-3" /> Handmatig
          </Badge>
        )}
      </div>
      <div className="whitespace-pre-wrap text-xs text-muted-foreground">
        {sectie.markdown.replace(/\*\*/g, '').replace(/^- /gm, '• ')}
      </div>
    </div>
  );
}
