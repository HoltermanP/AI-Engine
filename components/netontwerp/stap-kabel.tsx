'use client';

import { useState, useTransition } from 'react';
import type { Netontwerp } from '@/lib/netontwerp/types';
import type { MapTrace } from '@/components/trace-map';
import { kabelAdviesAction, kiesKabelAction, type KabelAdviesResultaat } from '@/lib/actions/netontwerp';
import { kabelsVoorNetvlak, type KabelSpec } from '@/lib/netontwerp/kabel-catalogus';
import { CalcResultsGrouped } from '@/components/calc-results-grouped';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Zap } from 'lucide-react';

interface StapKabelProps {
  ontwerp: Netontwerp;
  traces: MapTrace[];
  onOntwerpChange: (ontwerp: Netontwerp) => void;
}

function KabelKaart({
  spec,
  gekozen,
  aanbevolen,
  onKies,
}: {
  spec: KabelSpec;
  gekozen: boolean;
  aanbevolen: boolean;
  onKies: () => void;
}) {
  return (
    <div
      className={`rounded-md border p-2 text-xs ${
        gekozen ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{spec.label}</span>
        {aanbevolen && (
          <span className="rounded bg-[#2D6FE8]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#2D6FE8]">
            advies
          </span>
        )}
        {gekozen && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-600" />}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
        <span>Belastbaarheid {spec.belastbaarheidGrondA} A</span>
        <span>Ø {spec.diameterMm} mm</span>
        <span>Haspel {spec.haspelLengteM} m</span>
        <span>€ {spec.kostprijsPerM}/m</span>
      </div>
      {!gekozen && (
        <Button size="sm" variant="outline" className="mt-2 h-6 w-full text-[10px]" onClick={onKies}>
          Kies deze kabel
        </Button>
      )}
    </div>
  );
}

export function StapKabel({ ontwerp, traces, onOntwerpChange }: StapKabelProps) {
  const [advies, setAdvies] = useState<Record<string, KabelAdviesResultaat>>({});
  const [pending, startTransition] = useTransition();
  const [bezigTraceId, setBezigTraceId] = useState<string | null>(null);

  const berekenAdvies = (traceId: string) => {
    setBezigTraceId(traceId);
    startTransition(async () => {
      const resultaat = await kabelAdviesAction(ontwerp, traceId);
      if (resultaat) setAdvies((prev) => ({ ...prev, [traceId]: resultaat }));
      setBezigTraceId(null);
    });
  };

  const kiesKabel = (traceId: string, kabelId: string, bron: 'advies' | 'handmatig', motivatie?: string) => {
    startTransition(async () => {
      const bijgewerkt = await kiesKabelAction(ontwerp, traceId, kabelId, bron, motivatie);
      onOntwerpChange(bijgewerkt);
    });
  };

  if (ontwerp.aansluitingen.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Voer eerst belastingen in (stap 1) — het kabeladvies wordt uit de ontwerpbelasting berekend.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {traces.map((trace) => {
        const traceAdvies = advies[trace.id];
        const keuze = ontwerp.kabelKeuzes.find((k) => k.traceId === trace.id);
        const netvlak = trace.discipline === 'elektra_ms' ? 'MS' : 'LS';
        const catalogus = kabelsVoorNetvlak(
          netvlak,
          netvlak === 'MS' ? ontwerp.uitgangspunten.spanningMsKV : undefined,
        );

        return (
          <div key={trace.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: trace.kleur }} />
              <span className="font-semibold">{trace.code}</span>
              <span className="text-muted-foreground">· {netvlak}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto h-7 text-xs"
                disabled={pending && bezigTraceId === trace.id}
                onClick={() => berekenAdvies(trace.id)}
              >
                {pending && bezigTraceId === trace.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                Bereken advies
              </Button>
            </div>

            {traceAdvies && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center text-[10px]">
                  <div>
                    <p className="font-mono text-sm font-semibold">{traceAdvies.belastingKVA}</p>
                    <p className="text-muted-foreground">kVA ontwerp</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{traceAdvies.belastingA}</p>
                    <p className="text-muted-foreground">A ontwerpstroom</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{traceAdvies.lengteM}</p>
                    <p className="text-muted-foreground">m tracé</p>
                  </div>
                </div>

                <p className={`rounded-md p-2 text-[11px] ${traceAdvies.advies.voldoet ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                  {traceAdvies.advies.motivatie}
                </p>

                <KabelKaart
                  spec={traceAdvies.advies.advies}
                  gekozen={keuze?.kabelId === traceAdvies.advies.advies.id}
                  aanbevolen
                  onKies={() =>
                    kiesKabel(trace.id, traceAdvies.advies.advies.id, 'advies', traceAdvies.advies.motivatie)
                  }
                />
                {traceAdvies.advies.alternatieven.map((alt) => (
                  <KabelKaart
                    key={alt.id}
                    spec={alt}
                    gekozen={keuze?.kabelId === alt.id}
                    aanbevolen={false}
                    onKies={() => kiesKabel(trace.id, alt.id, 'handmatig')}
                  />
                ))}

                <CalcResultsGrouped berekeningen={traceAdvies.berekeningen} />
              </div>
            )}

            {!traceAdvies && keuze && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Gekozen kabel:{' '}
                <span className="font-medium text-foreground">
                  {catalogus.find((k) => k.id === keuze.kabelId)?.label ?? keuze.kabelId}
                </span>{' '}
                ({keuze.bron})
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
