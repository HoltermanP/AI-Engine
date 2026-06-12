'use client';

import { useState, useTransition } from 'react';
import type { Netontwerp, NetontwerpAsset } from '@/lib/netontwerp/types';
import { STATION_SUBTYPE_LABELS, type StationSubtype } from '@/lib/netontwerp/types';
import { suggestStationsAction, genereerRingVerbindingAction } from '@/lib/actions/netontwerp';
import type { StationsAdvies } from '@/lib/netontwerp/stations-advies';
import { Button } from '@/components/ui/button';
import { Building2, CircleDashed, Loader2, Sparkles, Trash2, TriangleAlert } from 'lucide-react';

interface StapStationsProps {
  ontwerp: Netontwerp;
  onOntwerpChange: (ontwerp: Netontwerp) => void;
  /** Stations gesorteerd langs het MS-tracé (ringvolgorde), indien MS-tracé aanwezig */
  ringVolgorde?: { stationId: string; naam: string; chainageM: number }[];
  /** Nieuw ringtracé toevoegen aan de kaart (na genereerRingVerbindingAction) */
  onRingTrace?: (traceId: string) => void;
}

let stationTeller = 0;

export function StapStations({
  ontwerp,
  onOntwerpChange,
  ringVolgorde = [],
  onRingTrace,
}: StapStationsProps) {
  const [advies, setAdvies] = useState<StationsAdvies | null>(null);
  const [ringMelding, setRingMelding] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stations = ontwerp.assets.filter((a) => a.type === 'station');
  const ringStations = stations.filter((s) => s.subtype !== 'ls_verdeelkast');

  const genereerRing = () => {
    setRingMelding(null);
    startTransition(async () => {
      const resultaat = await genereerRingVerbindingAction(ontwerp);
      if ('error' in resultaat) {
        setRingMelding(resultaat.error);
        return;
      }
      onOntwerpChange(resultaat.ontwerp);
      onRingTrace?.(resultaat.trace.id);
      setRingMelding(resultaat.samenvatting);
    });
  };

  const berekenAdvies = () => {
    startTransition(async () => {
      setAdvies(await suggestStationsAction(ontwerp));
    });
  };

  const neemSuggestiesOver = () => {
    if (!advies) return;
    const handmatig = ontwerp.assets.filter((a) => a.type !== 'station' || a.bron === 'handmatig');
    const nieuw: NetontwerpAsset[] = advies.suggesties.map((s, i) => {
      stationTeller += 1;
      return {
        id: `station-auto-${stationTeller}-${i}`,
        type: 'station',
        subtype: s.subtype,
        naam: `TS-${String(i + 1).padStart(3, '0')}`,
        positie: { binding: 'punt', x: s.x, y: s.y },
        eigenschappen: {
          trafoKVA: s.trafoKVA,
          belastingKVA: s.belastingKVA,
          aansluitingIds: s.aansluitingIds.join(','),
        },
        bron: 'auto',
        gekoppeldeTraceIds: ontwerp.traceIds,
      };
    });
    onOntwerpChange({ ...ontwerp, assets: [...handmatig, ...nieuw] });
  };

  const verwijderStation = (id: string) => {
    onOntwerpChange({ ...ontwerp, assets: ontwerp.assets.filter((a) => a.id !== id) });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Stationsadvies</p>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={berekenAdvies}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Stel stations voor
          </Button>
        </div>
        {advies && (
          <div className="mt-2 space-y-2 text-xs">
            <p className="text-muted-foreground">{advies.toelichting}</p>
            {advies.suggesties.map((s, i) => (
              <div key={i} className="rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-purple-600" />
                  <span className="font-medium">
                    {STATION_SUBTYPE_LABELS[s.subtype]} — {s.trafoKVA} kVA
                  </span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {s.belastingKVA} kVA cluster
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {s.aansluitingIds.length} aansluitingen · verste {s.maxAfstandTotAansluitingM} m
                </p>
                {s.waarschuwingen.map((w, j) => (
                  <p key={j} className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            ))}
            {advies.suggesties.length > 0 && (
              <Button size="sm" className="w-full" onClick={neemSuggestiesOver}>
                Neem {advies.suggesties.length} suggestie{advies.suggesties.length > 1 ? 's' : ''} over
              </Button>
            )}
          </div>
        )}
      </div>

      {(ringVolgorde.length > 1 || ringStations.length >= 2) && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">MS-ring</p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={pending || ringStations.length < 2}
              onClick={genereerRing}
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleDashed className="h-3 w-3" />}
              Genereer ringverbinding
            </Button>
          </div>
          {ringVolgorde.length > 1 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              voeding →{' '}
              {ringVolgorde.map((r) => `${r.naam} (${(r.chainageM / 1000).toFixed(2)} km)`).join(' → ')}{' '}
              → voeding
            </p>
          )}
          {ringMelding && (
            <p className="mt-2 rounded-md bg-muted/60 p-2 text-[11px]">{ringMelding}</p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold">Geplaatste stations ({stations.length})</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Handmatig plaatsen kan via het palet links + kaartklik. Klik een station op de kaart om het te selecteren.
        </p>
        {stations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {stations.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                <span className="min-w-0 flex-1 truncate font-medium">{s.naam}</span>
                <span className="text-[10px] text-muted-foreground">
                  {STATION_SUBTYPE_LABELS[s.subtype as StationSubtype] ?? s.subtype}
                  {s.eigenschappen.trafoKVA ? ` · ${s.eigenschappen.trafoKVA} kVA` : ''}
                  {s.bron === 'auto' ? ' · auto' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => verwijderStation(s.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Verwijder station"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
