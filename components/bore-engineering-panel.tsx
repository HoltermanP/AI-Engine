'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DemoTrace } from '@/demo/traces';
import type { BoreEngineeringResult, BoreSegmentResult } from '@/lib/bore/types';
import { BORE_METHODE_LABELS } from '@/lib/bore/types';
import { sleuflozeSegmenten } from '@/lib/bore';
import type { DrawingResult } from '@/lib/drawings/types';
import { runVolledigeBoorengineeringAction } from '@/lib/actions/bore-engineering';
import { downloadSvgAsPdf } from '@/lib/export/download';
import { Drill, FileImage, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BoreEngineeringPanelProps {
  trace: DemoTrace;
  disabled?: boolean;
}

function calcVoldoet(b: BoreSegmentResult['berekeningen'][0]): boolean | null {
  if ('voldoet' in b.resultaat) return Boolean(b.resultaat.voldoet);
  if ('dekkingVoldoet' in b.resultaat) return Boolean(b.resultaat.dekkingVoldoet);
  if ('geschikt' in b.resultaat) return Boolean(b.resultaat.geschikt);
  return null;
}

export function BoreEngineeringPanel({ trace, disabled }: BoreEngineeringPanelProps) {
  const segments = useMemo(() => sleuflozeSegmenten(trace), [trace]);
  const [selected, setSelected] = useState<number[]>(() => segments.map((s) => s.volgorde));
  const [result, setResult] = useState<BoreEngineeringResult | null>(null);
  const [tekeningen, setTekeningen] = useState<DrawingResult[]>([]);
  const [isPending, startTransition] = useTransition();

  if (segments.length === 0) return null;

  function toggle(volgorde: number) {
    setSelected((prev) =>
      prev.includes(volgorde) ? prev.filter((v) => v !== volgorde) : [...prev, volgorde],
    );
  }

  function handleUitwerken() {
    if (selected.length === 0) return;
    startTransition(async () => {
      const res = await runVolledigeBoorengineeringAction(trace.id, selected);
      setResult(res.engineering);
      setTekeningen(res.tekeningen);
    });
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/15 text-orange-600">
            <Drill className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Boorengineering</p>
            <p className="text-xs text-muted-foreground">
              Selecteer sleufloze segmenten en werk uit tot boorplan + tekeningen
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleUitwerken}
          disabled={disabled || isPending || selected.length === 0}
          className="bg-orange-600 hover:bg-orange-600/90"
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Drill className="mr-1 h-3 w-3" />
          )}
          Uitwerken ({selected.length})
        </Button>
      </div>

      <div className="mb-4 space-y-2">
        {segments.map((seg) => {
          const isOn = selected.includes(seg.volgorde);
          return (
            <button
              key={seg.volgorde}
              type="button"
              onClick={() => toggle(seg.volgorde)}
              disabled={disabled}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                isOn ? 'border-orange-500/50 bg-orange-500/5' : 'border-border bg-muted/30 opacity-70'
              }`}
            >
              <span className="font-medium text-foreground">
                S{seg.volgorde} · {seg.wegnaam}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {BORE_METHODE_LABELS[seg.legtechniek as keyof typeof BORE_METHODE_LABELS] ?? seg.legtechniek}
                </Badge>
                <span className="text-muted-foreground">{seg.lengteM} m</span>
              </span>
            </button>
          );
        })}
      </div>

      {result && (
        <div className="space-y-6">
          {result.segmenten.map((seg) => (
            <div key={seg.volgorde}>
              <h4 className="mb-2 text-sm font-semibold text-foreground">{seg.label}</h4>
              <Card className="mb-3 border-l-4 border-l-orange-500">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-xs font-medium">Boorplan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-1 text-xs">
                  <p className="text-foreground">{seg.boorplan.samenvatting}</p>
                  <div className="flex flex-wrap gap-1">
                    {seg.boorplan.sonderingRefs.map((id) => (
                      <Badge key={id} variant="secondary" className="font-mono text-[10px]">
                        {id}
                      </Badge>
                    ))}
                  </div>
                  {seg.boorplan.risicos.length > 0 && (
                    <div className="rounded bg-amber-500/10 p-2">
                      <p className="mb-1 flex items-center gap-1 font-medium text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Risico&apos;s
                      </p>
                      <ul className="list-inside list-disc text-amber-900/80">
                        {seg.boorplan.risicos.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ol className="list-inside list-decimal text-muted-foreground">
                    {seg.boorplan.uitvoeringsvolgorde.map((st) => (
                      <li key={st}>{st}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {seg.berekeningen.map((b) => {
                  const ok = calcVoldoet(b);
                  return (
                    <Card key={b.type} className="border-l-2 border-l-muted">
                      <CardHeader className="flex-row items-center justify-between p-3 pb-0">
                        <CardTitle className="text-xs capitalize">{b.type.replace(/_/g, ' ')}</CardTitle>
                        <div className="flex items-center gap-2">
                          {ok !== null && (
                            <Badge variant={ok ? 'default' : 'destructive'} className="text-[10px]">
                              {ok ? (
                                <><CheckCircle2 className="mr-0.5 h-3 w-3" /> Voldoet</>
                              ) : (
                                'Voldoet niet'
                              )}
                            </Badge>
                          )}
                          <span className="font-mono text-[10px] text-muted-foreground">{b.normReferentie}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 text-xs">
                        <p>{b.conclusie}</p>
                        <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px] text-muted-foreground">
                          {Object.entries(b.resultaat).map(([k, v]) => (
                            <span key={k} className="rounded bg-muted px-1 py-0.5">
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {tekeningen.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <FileImage className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium">Boor-tekeningen</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {tekeningen.map((t) => (
                  <Card key={`${t.type}-${t.segmentVolgorde}`} className="overflow-hidden">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm">{t.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div
                        className="overflow-hidden rounded bg-muted/50"
                        dangerouslySetInnerHTML={{ __html: t.svg }}
                      />
                      <button
                        type="button"
                        onClick={() => downloadSvgAsPdf(t.svg, t.label)}
                        className="mt-2 text-[10px] text-orange-600 hover:underline"
                      >
                        Download PDF
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
