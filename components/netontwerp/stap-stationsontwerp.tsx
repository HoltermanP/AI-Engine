'use client';

import { useState, useTransition } from 'react';
import type { Netontwerp } from '@/lib/netontwerp/types';
import {
  genereerStationsontwerpenAction,
  genereerStationTekeningenAction,
} from '@/lib/actions/netontwerp';
import type { DrawingResult } from '@/lib/drawings/types';
import { downloadSvgAsPdf } from '@/lib/export/download';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Download, Loader2, PencilRuler } from 'lucide-react';

interface StapStationsontwerpProps {
  ontwerp: Netontwerp;
  onOntwerpChange: (ontwerp: Netontwerp) => void;
}

export function StapStationsontwerp({ ontwerp, onOntwerpChange }: StapStationsontwerpProps) {
  const [tekeningen, setTekeningen] = useState<DrawingResult[]>([]);
  const [pending, startTransition] = useTransition();

  const stations = ontwerp.assets.filter((a) => a.type === 'station');

  const genereer = () => {
    startTransition(async () => {
      const bijgewerkt = await genereerStationsontwerpenAction(ontwerp);
      onOntwerpChange(bijgewerkt);
      const tek = await genereerStationTekeningenAction(bijgewerkt);
      setTekeningen(tek);
      toast('succes', 'Stationsontwerpen gegenereerd', `${bijgewerkt.stationsOntwerpen.length} station(s), ${tek.length} tekeningen — vastgelegd in het dossier`);
    });
  };

  if (stations.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Plaats eerst stations (stap 4) — het stationsontwerp wordt per geplaatst station opgebouwd.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold">Stationsontwerpen</p>
            <p className="text-[10px] text-muted-foreground">
              Eenlijnschema (RMU-velden, trafo, LS-groepen) + plattegrond per station
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={genereer}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PencilRuler className="h-3 w-3" />}
            Genereer ontwerpen
          </Button>
        </div>

        {ontwerp.stationsOntwerpen.length > 0 && (
          <div className="mt-2 space-y-1.5 text-xs">
            {ontwerp.stationsOntwerpen.map((so) => {
              const station = ontwerp.assets.find((a) => a.id === so.stationAssetId);
              return (
                <div key={so.stationAssetId} className="rounded-md border border-border px-2 py-1.5">
                  <span className="font-medium">{station?.naam ?? so.stationAssetId}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    trafo {so.trafo.vermogenKVA} kVA {so.trafo.spanning} · {so.velden.length} MS-velden ·{' '}
                    {so.lsGroepen.length} LS-groepen (
                    {so.lsGroepen.map((g) => `${g.zekeringA}A`).join(', ')})
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tekeningen.map((t) => (
        <div key={t.label} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">{t.label}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => downloadSvgAsPdf(t.svg, t.label)}
            >
              <Download className="h-3 w-3" /> PDF
            </Button>
          </div>
          <div
            className="mt-2 overflow-hidden rounded bg-muted/50 [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: t.svg }}
          />
        </div>
      ))}
    </div>
  );
}
