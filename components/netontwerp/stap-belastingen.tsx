'use client';

import { useState } from 'react';
import type { Aansluiting, AansluitingType, Netontwerp } from '@/lib/netontwerp/types';
import { AANSLUITING_TYPE_LABELS } from '@/lib/netontwerp/types';
import {
  belastingKVA,
  totaalBelastingKVA,
  stroomUitKVA,
  parseAansluitingenCsv,
  type CsvParseResultaat,
} from '@/lib/netontwerp/belastingen';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { ClipboardPaste, Trash2 } from 'lucide-react';

interface StapBelastingenProps {
  ontwerp: Netontwerp;
  onOntwerpChange: (ontwerp: Netontwerp) => void;
  /** Plaatst geïmporteerde rijen gespreid langs het tracé (workspace levert posities) */
  onBulkImport?: (rijen: CsvParseResultaat['rijen']) => void;
}

function NumInput({
  value,
  onChange,
  step = 1,
  min = 0,
  breed = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  breed?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`${breed ? 'w-20' : 'w-14'} rounded border border-border bg-background px-1.5 py-1 text-right text-xs`}
    />
  );
}

export function StapBelastingen({ ontwerp, onOntwerpChange, onBulkImport }: StapBelastingenProps) {
  const groei = ontwerp.uitgangspunten.groeifactor;
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvTekst, setCsvTekst] = useState('');

  const importeerCsv = () => {
    const { rijen, fouten } = parseAansluitingenCsv(csvTekst);
    if (rijen.length === 0) {
      toast('fout', 'Geen geldige regels gevonden', fouten[0] ?? 'Verwacht formaat: naam;type;aantal[;kVA;g]');
      return;
    }
    onBulkImport?.(rijen);
    setCsvOpen(false);
    setCsvTekst('');
    toast(
      'succes',
      `${rijen.length} aansluiting(en) geïmporteerd`,
      fouten.length ? `${fouten.length} regel(s) overgeslagen — posities gespreid langs het tracé, versleep ze waar nodig` : 'Posities gespreid langs het tracé — versleep ze waar nodig',
    );
  };

  const updateAansluiting = (id: string, patch: Partial<Aansluiting>) => {
    onOntwerpChange({
      ...ontwerp,
      aansluitingen: ontwerp.aansluitingen.map((a) =>
        a.id === id ? { ...a, ...patch } : a,
      ),
    });
  };

  const verwijderAansluiting = (id: string) => {
    onOntwerpChange({
      ...ontwerp,
      aansluitingen: ontwerp.aansluitingen.filter((a) => a.id !== id),
    });
  };

  const totaalLs = totaalBelastingKVA(ontwerp.aansluitingen, { netvlak: 'LS', groeifactor: groei });
  const stroomLs = stroomUitKVA(totaalLs, 'LS');

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold">Uitgangspunten</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Groeifactor</span>
            <NumInput
              value={ontwerp.uitgangspunten.groeifactor}
              step={0.1}
              onChange={(v) =>
                onOntwerpChange({
                  ...ontwerp,
                  uitgangspunten: { ...ontwerp.uitgangspunten, groeifactor: v || 1 },
                })
              }
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">MS-spanning</span>
            <select
              value={ontwerp.uitgangspunten.spanningMsKV}
              onChange={(e) =>
                onOntwerpChange({
                  ...ontwerp,
                  uitgangspunten: {
                    ...ontwerp.uitgangspunten,
                    spanningMsKV: Number(e.target.value) === 20 ? 20 : 10,
                  },
                })
              }
              className="rounded border border-border bg-background px-1.5 py-1 text-xs"
            >
              <option value={10}>10 kV</option>
              <option value={20}>20 kV</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Max ΔU LS</span>
            <span className="flex items-center gap-1">
              <NumInput
                value={ontwerp.uitgangspunten.maxSpanningsvalLsPct}
                step={0.5}
                onChange={(v) =>
                  onOntwerpChange({
                    ...ontwerp,
                    uitgangspunten: { ...ontwerp.uitgangspunten, maxSpanningsvalLsPct: v || 5 },
                  })
                }
              />
              %
            </span>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">N-1 stations</span>
            <input
              type="checkbox"
              checked={ontwerp.uitgangspunten.nMin1}
              onChange={(e) =>
                onOntwerpChange({
                  ...ontwerp,
                  uitgangspunten: { ...ontwerp.uitgangspunten, nMin1: e.target.checked },
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Aansluitingen ({ontwerp.aansluitingen.length})</p>
          <button
            type="button"
            onClick={() => setCsvOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium hover:bg-muted"
          >
            <ClipboardPaste className="h-3 w-3" />
            Plak uit Excel/CSV
          </button>
        </div>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Plaats losse punten via het palet + kaartklik, of importeer een lijst.
        </p>

        {csvOpen && (
          <div className="mt-2 rounded-md border border-[#2D6FE8]/30 bg-[#2D6FE8]/5 p-2">
            <p className="text-[10px] text-muted-foreground">
              Eén regel per groep: <code className="font-mono">naam;type;aantal[;kVA;gelijktijdigheid]</code>{' '}
              — typen: woning, utiliteit, bedrijf, laadinfra, pv
            </p>
            <textarea
              value={csvTekst}
              onChange={(e) => setCsvTekst(e.target.value)}
              rows={5}
              placeholder={'Fase 1 rijwoningen;woning;28;4\nSchool;utiliteit;1;50\nLaadplein;laadinfra;10;22;0,9'}
              className="mt-1.5 w-full rounded border border-border bg-background p-2 font-mono text-[11px]"
            />
            <Button size="sm" className="mt-1.5 h-7 w-full text-xs" onClick={importeerCsv}>
              Importeer aansluitingen
            </Button>
          </div>
        )}

        {ontwerp.aansluitingen.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Nog geen aansluitingen — kies “Aansluitpunt plaatsen” in het palet en klik op de kaart.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {ontwerp.aansluitingen.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <input
                    value={a.naam}
                    onChange={(e) => updateAansluiting(a.id, { naam: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => verwijderAansluiting(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Verwijder aansluiting"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                  <select
                    value={a.type}
                    onChange={(e) =>
                      updateAansluiting(a.id, { type: e.target.value as AansluitingType })
                    }
                    className="rounded border border-border bg-background px-1.5 py-1 text-xs"
                  >
                    {(Object.keys(AANSLUITING_TYPE_LABELS) as AansluitingType[]).map((t) => (
                      <option key={t} value={t}>
                        {AANSLUITING_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-muted-foreground">
                    aantal
                    <NumInput value={a.aantal} onChange={(v) => updateAansluiting(a.id, { aantal: v })} />
                  </label>
                  <label className="flex items-center gap-1 text-muted-foreground">
                    kVA/stuk
                    <NumInput
                      value={a.kVAPerStuk}
                      step={0.5}
                      onChange={(v) => updateAansluiting(a.id, { kVAPerStuk: v })}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-muted-foreground">
                    g
                    <NumInput
                      value={a.gelijktijdigheid}
                      step={0.05}
                      onChange={(v) => updateAansluiting(a.id, { gelijktijdigheid: v })}
                    />
                  </label>
                  <span className="ml-auto font-mono font-medium">
                    {belastingKVA(a, groei).toFixed(0)} kVA
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[#2D6FE8]/30 bg-[#2D6FE8]/5 p-3 text-xs">
        <div className="flex items-center justify-between font-medium">
          <span>Totaal LS-ontwerpbelasting (incl. groei {groei}×)</span>
          <span className="font-mono">{totaalLs.toFixed(0)} kVA</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-muted-foreground">
          <span>Ontwerpstroom bij 400 V</span>
          <span className="font-mono">{stroomLs.toFixed(0)} A</span>
        </div>
      </div>

      {ontwerp.aansluitingen.length > 0 && (
        <Button size="sm" variant="outline" className="w-full" disabled>
          Belastingen vastgelegd — ga door naar “Tracé schetsen”
        </Button>
      )}
    </div>
  );
}
