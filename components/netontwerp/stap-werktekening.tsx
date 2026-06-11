'use client';

import { useState, useTransition } from 'react';
import type { Netontwerp } from '@/lib/netontwerp/types';
import { MOF_SUBTYPE_LABELS, type MofSubtype } from '@/lib/netontwerp/types';
import {
  plaatsMoffenAction,
  genereerWerktekeningenAction,
} from '@/lib/actions/netontwerp';
import type { DrawingResult } from '@/lib/drawings/types';
import { downloadSvgAsPdf } from '@/lib/export/download';
import { Button } from '@/components/ui/button';
import { CircleDot, Download, FileSpreadsheet, FileType2, Loader2, Workflow } from 'lucide-react';

interface StapWerktekeningProps {
  ontwerp: Netontwerp;
  onOntwerpChange: (ontwerp: Netontwerp) => void;
}

export function StapWerktekening({ ontwerp, onOntwerpChange }: StapWerktekeningProps) {
  const [tekeningen, setTekeningen] = useState<DrawingResult[]>([]);
  const [pending, startTransition] = useTransition();

  const moffen = ontwerp.assets.filter((a) => a.type === 'mof');
  const mantelbuizen = ontwerp.assets.filter((a) => a.type === 'mantelbuis');

  const plaatsAssets = () => {
    startTransition(async () => {
      const bijgewerkt = await plaatsMoffenAction(ontwerp);
      onOntwerpChange(bijgewerkt);
    });
  };

  const genereerTekeningen = () => {
    startTransition(async () => {
      setTekeningen(await genereerWerktekeningenAction(ontwerp));
    });
  };

  if (ontwerp.kabelKeuzes.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
        Kies eerst een kabel (stap 3) — moffen worden per haspellengte van de gekozen kabel geplaatst.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold">Moffen & mantelbuizen</p>
            <p className="text-[10px] text-muted-foreground">
              Automatisch per haspellengte + eindmoffen; mantelbuizen bij kruisingen
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending} onClick={plaatsAssets}>
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleDot className="h-3 w-3" />}
            Plaats automatisch
          </Button>
        </div>

        {moffen.length > 0 && (
          <div className="mt-2 max-h-48 space-y-1 overflow-auto text-[11px]">
            {moffen.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                <span>{MOF_SUBTYPE_LABELS[m.subtype as MofSubtype] ?? m.subtype}</span>
                <span className="font-mono text-muted-foreground">
                  {m.positie.binding === 'chainage' ? `km ${(m.positie.chainageM / 1000).toFixed(3)}` : ''}
                </span>
              </div>
            ))}
            {mantelbuizen.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                <span>{m.naam}</span>
                <span className="font-mono text-muted-foreground">
                  {m.positie.binding === 'chainage_bereik'
                    ? `${m.positie.vanM.toFixed(0)}–${m.positie.totM.toFixed(0)} m`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Werktekening (UO)</p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={pending || moffen.length === 0}
            onClick={genereerTekeningen}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Workflow className="h-3 w-3" />}
            Genereer werktekening
          </Button>
        </div>

        {tekeningen.map((t) => (
          <div key={t.label} className="mt-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium">{t.label}</p>
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
              className="mt-1 overflow-hidden rounded bg-muted/50 [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: t.svg }}
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold">Export uitvoering</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ontwerp.traceIds.map((traceId) => (
            <div key={traceId} className="contents">
              <a
                href={`/api/export?traceId=${traceId}&type=dxf&variant=werktekening`}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
              >
                <FileType2 className="h-3.5 w-3.5" /> DXF werktekening
              </a>
              <a
                href={`/api/export?traceId=${traceId}&type=materiaal`}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Materiaallijst (Excel)
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
