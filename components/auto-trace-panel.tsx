'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from '@/components/source-badge';
import { AfwegingsmatrixTabel } from '@/components/afwegingsmatrix-tabel';
import { buildAfwegingsmatrix } from '@/lib/services/afwegingsmatrix';
import { Check, GitBranch, Loader2, MapPin, Save, Scale, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { TraceRoutingResult, TraceRouteAlternative, TraceWaypoint } from '@/lib/services/trace-routing';
import { cn } from '@/lib/utils';

interface AutoTracePanelProps {
  waypoints: TraceWaypoint[];
  onClearWaypoints: () => void;
  onRemoveWaypoint: (index: number) => void;
  onPlanTrace: () => void;
  isPlanning: boolean;
  result: TraceRoutingResult | null;
  selectedAlternativeId: string | null;
  onSelectAlternative: (id: string) => void;
  onSaveTrace: () => void;
  onSaveManualTrace?: () => void;
  isSaving: boolean;
  saveMessage?: string | null;
  planError?: string | null;
  anthropicConfigured?: boolean;
}

function AlternativeCard({
  alt,
  selected,
  onSelect,
}: {
  alt: TraceRouteAlternative;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded border px-2 py-2 text-left text-[10px] transition-colors',
        selected
          ? 'border-[#2D6FE8] bg-[#2D6FE8]/10'
          : 'border-border hover:border-[#2D6FE8]/50 hover:bg-muted/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-medium text-foreground">
            {selected && <Check className="h-3 w-3 shrink-0 text-[#2D6FE8]" />}
            {alt.label}
          </p>
          <p className="mt-0.5 text-muted-foreground">{alt.beschrijving}</p>
        </div>
        <Badge
          className={cn(
            'shrink-0 font-mono text-[9px]',
            alt.score >= 70 ? 'bg-emerald-600' : alt.score >= 40 ? 'bg-amber-600' : 'bg-red-600'
          )}
        >
          {alt.score}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-muted-foreground">
        {alt.totaleLengteM} m · {alt.segmenten.length} seg.
        {alt.waarschuwingen.length > 0 && ` · ${alt.waarschuwingen.length} waarsch.`}
      </p>
    </button>
  );
}

export function AutoTracePanel({
  waypoints,
  onClearWaypoints,
  onRemoveWaypoint,
  onPlanTrace,
  isPlanning,
  result,
  selectedAlternativeId,
  onSelectAlternative,
  onSaveTrace,
  onSaveManualTrace,
  isSaving,
  saveMessage,
  planError,
  anthropicConfigured = false,
}: AutoTracePanelProps) {
  const [showAi, setShowAi] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);

  const activeAlt =
    result?.alternatieven?.find((a) => a.id === selectedAlternativeId) ??
    result?.alternatieven?.[0];

  // Afwegingsmatrix (multicriteria-analyse) — pure functie, client-side berekend.
  const afwegingsmatrix = useMemo(
    () =>
      result?.alternatieven && result.alternatieven.length >= 2
        ? buildAfwegingsmatrix(result.alternatieven)
        : null,
    [result?.alternatieven]
  );

  const stap1Klaar = waypoints.length >= 2;
  const stap2Klaar = Boolean(result && activeAlt);
  const stap3Klaar = Boolean(saveMessage && !saveMessage.startsWith('Fout'));

  function StapIndicator({ nummer, klaar, actief }: { nummer: number; klaar: boolean; actief: boolean }) {
    if (klaar) {
      return (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      );
    }
    return (
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          actief ? 'bg-[#2D6FE8] text-white' : 'bg-muted text-muted-foreground ring-1 ring-border'
        )}
      >
        {nummer}
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Wand2 className="h-3.5 w-3.5 text-[#2D6FE8]" />
            Tracé bepalen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-1 text-xs">
          {/* Stappenwijzer met live status — het proces leidt */}
          <ol className="space-y-1.5">
            <li className="flex items-center gap-2">
              <StapIndicator nummer={1} klaar={stap1Klaar} actief={!stap1Klaar} />
              <span className={cn(stap1Klaar ? 'text-muted-foreground' : 'font-medium text-foreground')}>
                Klik start- en eindpunt op de kaart
              </span>
              {waypoints.length > 0 && (
                <Badge variant="outline" className="ml-auto font-mono text-[10px]">
                  {waypoints.length} {waypoints.length === 1 ? 'punt' : 'punten'}
                </Badge>
              )}
            </li>
            <li className="flex items-center gap-2">
              <StapIndicator nummer={2} klaar={stap2Klaar} actief={stap1Klaar && !stap2Klaar} />
              <span className={cn(stap2Klaar ? 'text-muted-foreground' : stap1Klaar ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                Bereken het tracé langs het wegennet
              </span>
            </li>
            <li className="flex items-center gap-2">
              <StapIndicator nummer={3} klaar={stap3Klaar} actief={stap2Klaar && !stap3Klaar} />
              <span className={cn(stap3Klaar ? 'text-muted-foreground' : stap2Klaar ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                Kies een alternatief en sla op
              </span>
            </li>
          </ol>

          {waypoints.length > 0 && !stap2Klaar && (
            <ul className="max-h-28 space-y-1 overflow-auto">
              {waypoints.map((wp, i) => (
                <li
                  key={`${wp.x}-${wp.y}-${i}`}
                  className="flex items-center justify-between gap-1 rounded border border-border px-2 py-1 font-mono text-[10px]"
                >
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-[#2D6FE8]" />
                    {i === 0 ? 'Start' : i === waypoints.length - 1 ? 'Eind' : `Punt ${i + 1}`}:{' '}
                    {wp.x.toFixed(0)}, {wp.y.toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveWaypoint(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Verwijder punt ${i + 1}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={waypoints.length < 2 || isPlanning}
              onClick={onPlanTrace}
            >
              {isPlanning ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Berekenen…
                </>
              ) : (
                <>
                  <Sparkles className="mr-1 h-3 w-3" /> Bereken tracé
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={waypoints.length === 0 || isPlanning}
              onClick={onClearWaypoints}
            >
              Wissen
            </Button>
          </div>

          {planError && (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {planError}
            </div>
          )}
        </CardContent>
      </Card>

      {result && !activeAlt && (
        <Card>
          <CardContent className="space-y-2 p-3 text-xs">
            <p className="font-medium text-red-600">Geen route berekend</p>
            {result.waarschuwingen.map((w) => (
              <p key={w} className="text-muted-foreground">
                {w}
              </p>
            ))}
            {result.blokkades.map((b) => (
              <p key={b} className="text-red-600">
                {b}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {result && activeAlt && (
        <>
          {result.alternatieven && result.alternatieven.length > 1 && (
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <GitBranch className="h-3.5 w-3.5" />
                  Route-alternatieven ({result.alternatieven.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-1">
                {result.alternatieven.map((alt) => (
                  <AlternativeCard
                    key={alt.id}
                    alt={alt}
                    selected={alt.id === selectedAlternativeId}
                    onSelect={() => onSelectAlternative(alt.id)}
                  />
                ))}

                {afwegingsmatrix && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-full text-xs"
                      onClick={() => setShowMatrix((v) => !v)}
                    >
                      <Scale className="mr-1 h-3 w-3" />
                      {showMatrix ? 'Afwegingsmatrix verbergen' : 'Afwegingsmatrix tonen'}
                    </Button>
                    {showMatrix && (
                      <div className="mt-2">
                        <AfwegingsmatrixTabel matrix={afwegingsmatrix} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{activeAlt.label}</span>
                <Badge
                  className={cn(
                    'font-mono text-[10px]',
                    activeAlt.score >= 70
                      ? 'bg-emerald-600'
                      : activeAlt.score >= 40
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                  )}
                >
                  {activeAlt.score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1 text-xs">
              <p className="font-mono text-foreground">
                {activeAlt.totaleLengteM} m · {activeAlt.segmenten.length} segment(en)
              </p>

              {result.samenvatting.map((line) => (
                <p key={line} className="text-muted-foreground">
                  {line}
                </p>
              ))}

              {activeAlt.blokkades.length > 0 && (
                <div className="rounded border border-red-300 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950/30">
                  <p className="font-medium text-red-700 dark:text-red-400">Blokkades</p>
                  <ul className="mt-1 list-inside list-disc text-red-600 dark:text-red-300">
                    {activeAlt.blokkades.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeAlt.waarschuwingen.length > 0 && (
                <div className="rounded border border-amber-300 bg-amber-50 p-2 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="font-medium text-amber-800 dark:text-amber-400">Waarschuwingen</p>
                  <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-300">
                    {activeAlt.waarschuwingen.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="font-medium text-foreground">Segmenten</p>
                {activeAlt.segmenten.map((seg) => (
                  <div key={seg.volgorde} className="rounded border border-border px-2 py-1.5 text-[10px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{seg.wegnaam}</span>
                      <span className="font-mono text-muted-foreground">{seg.score}/100</span>
                    </div>
                    <p className="font-mono text-muted-foreground">
                      {seg.legtechniek.replace(/_/g, ' ')} · {seg.lengteM} m ·{' '}
                      {seg.leglocatie.replace(/_/g, ' ')}
                    </p>
                    {seg.zakelijkRechtVereist && (
                      <p className="text-amber-600">Zakelijk recht vereist</p>
                    )}
                  </div>
                ))}
              </div>

              {result.normReferenties.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-foreground">Normen</p>
                  <div className="flex flex-wrap gap-1">
                    {result.normReferenties.map((n) => (
                      <Badge key={n} variant="secondary" className="text-[9px]">
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.aiToelichting && (
                <div className="border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAi((v) => !v)}
                    className="flex w-full items-center justify-between text-left font-medium text-foreground"
                  >
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#2D6FE8]" />
                      AI-beoordeling
                    </span>
                    <span className="flex items-center gap-1">
                      <SourceBadge source={result.aiBron === 'live' ? 'live' : 'demo'} />
                      {!anthropicConfigured && (
                        <span className="text-[9px] text-muted-foreground">Sjabloon</span>
                      )}
                    </span>
                  </button>
                  {showAi && (
                    <div className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                      {result.aiToelichting.replace(/\*\*/g, '')}
                    </div>
                  )}
                </div>
              )}

              <Button
                size="sm"
                className="mt-2 h-8 w-full text-xs"
                disabled={isSaving}
                onClick={onSaveTrace}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Opslaan…
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-3 w-3" /> Berekend tracé opslaan
                  </>
                )}
              </Button>
              {activeAlt.blokkades.length > 0 && (
                <p className="text-[10px] text-amber-600">
                  Let op: blokkades gedetecteerd — opslaan kan, maar controleer het tracé in fase 2.
                </p>
              )}
              {saveMessage && (
                <p
                  className={cn(
                    'text-[10px]',
                    saveMessage.startsWith('Fout') ? 'text-red-600' : 'text-emerald-600'
                  )}
                >
                  {saveMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {onSaveManualTrace && (
        <Card>
          <CardContent className="space-y-2 p-3 pt-3">
            <p className="text-[11px] text-muted-foreground">
              Handmatig getekend of bewerkt tracé op de kaart opslaan voor fase 2 (data ophalen).
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-full text-xs"
              disabled={isSaving}
              onClick={onSaveManualTrace}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Opslaan…
                </>
              ) : (
                <>
                  <Save className="mr-1 h-3 w-3" /> Huidige kaartgeometrie opslaan
                </>
              )}
            </Button>
            {saveMessage && !result && (
              <p
                className={cn(
                  'text-[10px]',
                  saveMessage.startsWith('Fout') ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                {saveMessage}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
