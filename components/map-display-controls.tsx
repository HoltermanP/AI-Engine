'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeftRight,
  Copy,
  GitBranch,
  Link2,
  Magnet,
  Minus,
  MoveRight,
  Pencil,
  Plus,
  RotateCcw,
  Ruler,
  Scissors,
  Split,
  Trash2,
  Triangle,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import type { CadOpties } from '@/components/trace-map';

export type DrawMode =
  | 'none'
  | 'draw'
  | 'edit'
  | 'auto'
  | 'meten'
  | 'trim'
  | 'extend'
  | 'break'
  | 'join'
  | 'reverse'
  | 'dim-lineair'
  | 'dim-hoek';

interface MapDisplayControlsProps {
  traceLineWidth: number;
  onTraceLineWidthChange: (w: number) => void;
  multiLineMode: boolean;
  onMultiLineModeChange: (v: boolean) => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  onClearDraw?: () => void;
  onRestoreDemo?: () => void;
  editable?: boolean;
  /** CAD-opties: objectsnap (F3) en ortho (F8) */
  cadOpties?: CadOpties;
  onCadOptiesChange?: (opties: CadOpties) => void;
  /** Parallel kopiëren (offset) van het geselecteerde tracé */
  onOffset?: (afstandM: number) => void;
}

export function MapDisplayControls({
  traceLineWidth,
  onTraceLineWidthChange,
  multiLineMode,
  onMultiLineModeChange,
  drawMode,
  onDrawModeChange,
  onClearDraw,
  onRestoreDemo,
  editable = true,
  cadOpties,
  onCadOptiesChange,
  onOffset,
}: MapDisplayControlsProps) {
  const [offsetAfstand, setOffsetAfstand] = useState('2');
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs font-medium text-foreground">Tracéweergave</p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Lijndikte</Label>
          <span className="font-mono text-[10px] text-foreground">{traceLineWidth}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTraceLineWidthChange(Math.max(1, traceLineWidth - 1))}
            className="rounded border border-border p-1 hover:bg-muted"
          >
            <Minus className="h-3 w-3" />
          </button>
          <input
            type="range"
            min={1}
            max={12}
            value={traceLineWidth}
            onChange={(e) => onTraceLineWidthChange(Number(e.target.value))}
            className="flex-1 accent-[#2D6FE8]"
          />
          <button
            type="button"
            onClick={() => onTraceLineWidthChange(Math.min(12, traceLineWidth + 1))}
            className="rounded border border-border p-1 hover:bg-muted"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="multi-line" checked={multiLineMode} onCheckedChange={onMultiLineModeChange} />
        <Label htmlFor="multi-line" className="flex items-center gap-1 text-[11px]">
          <GitBranch className="h-3 w-3" />
          Meerlijnige tekenwijze
        </Label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Toont afzonderlijke kabels en leidingen als parallelle lijnen
      </p>

      {editable && (
        <div className="space-y-2 border-t border-border pt-2">
          <p className="text-xs font-medium text-foreground">Tekentools</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'auto' ? 'none' : 'auto')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'auto' ? 'bg-[#2D6FE8] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Wand2 className="h-3 w-3" /> Auto-tracé
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'draw' ? 'none' : 'draw')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'draw' ? 'bg-[#2D6FE8] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Pencil className="h-3 w-3" /> Tekenen
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'edit' ? 'none' : 'edit')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'edit' ? 'bg-[#2D6FE8] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Pencil className="h-3 w-3" /> Wijzigen
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'meten' ? 'none' : 'meten')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'meten' ? 'bg-[#9333EA] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Ruler className="h-3 w-3" /> Meten
            </button>
            {onClearDraw && (
              <button
                type="button"
                onClick={onClearDraw}
                disabled={drawMode === 'none'}
                className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" /> Leegmaken
              </button>
            )}
            {onRestoreDemo && (
              <button
                type="button"
                onClick={onRestoreDemo}
                className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" /> Herstellen
              </button>
            )}
          </div>

          {/* CAD-bewerken: trim / extend / break / join / reverse */}
          <p className="pt-1 text-[10px] font-medium text-muted-foreground">CAD-bewerken</p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                { mode: 'trim', label: 'Trim', icon: Scissors },
                { mode: 'extend', label: 'Verlengen', icon: MoveRight },
                { mode: 'break', label: 'Breken', icon: Split },
                { mode: 'join', label: 'Samenvoegen', icon: Link2 },
                { mode: 'reverse', label: 'Omkeren', icon: ArrowLeftRight },
              ] as const
            ).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onDrawModeChange(drawMode === mode ? 'none' : mode)}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                  drawMode === mode ? 'bg-[#0E7490] text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>

          {/* Bemating: lineair / hoek */}
          <p className="pt-1 text-[10px] font-medium text-muted-foreground">Bemating</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'dim-lineair' ? 'none' : 'dim-lineair')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'dim-lineair' ? 'bg-[#1f2937] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Ruler className="h-3 w-3" /> Lengtemaat
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange(drawMode === 'dim-hoek' ? 'none' : 'dim-hoek')}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${
                drawMode === 'dim-hoek' ? 'bg-[#1f2937] text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Triangle className="h-3 w-3" /> Hoekmaat
            </button>
          </div>
          {drawMode !== 'none' && (
            <p className="text-[10px] text-[#2D6FE8]">
              {drawMode === 'auto'
                ? 'Klik waypoints op de kaart (min. 2). Gebruik daarna "Bereken tracé" in het paneel.'
                : drawMode === 'draw'
                  ? 'Klik op de kaart om punten toe te voegen. Groen = start, blauw = laatste punt.'
                  : 'Sleep punten om het tracé te wijzigen. Klik op een lijnsegment om een punt toe te voegen.'}
            </p>
          )}
          {drawMode === 'edit' && (
            <p className="text-[10px] text-muted-foreground">
              Alle lijnsegmenten van het tracé zijn bewerkbaar. Hover over een punt voor de sleepcursor.
            </p>
          )}
          {drawMode === 'draw' && (
            <p className="text-[10px] text-muted-foreground">
              Bij starten wordt het bestaande tracé leeggemaakt voor een nieuwe tekening.
              Typ een getal + Enter voor exacte maatinvoer.
            </p>
          )}
          {drawMode === 'meten' && (
            <p className="text-[10px] text-[#9333EA]">
              Klik meetpunten op de kaart; de totaallengte verschijnt bij het laatste punt. Esc wist de meting.
            </p>
          )}
          {drawMode === 'trim' && (
            <p className="text-[10px] text-[#0E7490]">
              Klik op het deel van het tracé dat je wegsnijdt — het wordt afgesneden tot de dichtstbijzijnde kruisende lijn (ander tracé of bestaand net).
            </p>
          )}
          {drawMode === 'extend' && (
            <p className="text-[10px] text-[#0E7490]">
              Klik bij het uiteinde dat je wilt verlengen — het schuift door tot de eerste lijn die het raakt.
            </p>
          )}
          {drawMode === 'break' && (
            <p className="text-[10px] text-[#0E7490]">
              Klik op het tracé om het op dat punt in twee aparte lijnen te splitsen.
            </p>
          )}
          {drawMode === 'join' && (
            <p className="text-[10px] text-[#0E7490]">
              Klik bij een aansluitpunt van twee lijnen om ze samen te voegen tot één polylijn.
            </p>
          )}
          {drawMode === 'reverse' && (
            <p className="text-[10px] text-[#0E7490]">
              Klik op een lijn om de tekenrichting (start ↔ eind) om te keren.
            </p>
          )}
          {(drawMode === 'dim-lineair' || drawMode === 'dim-hoek') && (
            <p className="text-[10px] text-[#1f2937]">
              {drawMode === 'dim-lineair'
                ? 'Klik twee punten voor een lengtemaat (snapt op hoekpunten). De maatlijn komt op de tekening en in de DXF.'
                : 'Klik drie punten (been – hoekpunt – been) voor een hoekmaat. Esc annuleert.'}
            </p>
          )}

          {cadOpties && onCadOptiesChange && (
            <div className="flex flex-wrap gap-1 border-t border-border pt-2">
              <button
                type="button"
                title="Objectsnap: snap op eind-/hoekpunten en lijnen (F3)"
                onClick={() => onCadOptiesChange({ ...cadOpties, osnap: !cadOpties.osnap })}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono ${
                  cadOpties.osnap ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Magnet className="h-3 w-3" /> OSNAP F3
              </button>
              <button
                type="button"
                title="Ortho-modus: richtingen in stappen van 45° (F8)"
                onClick={() => onCadOptiesChange({ ...cadOpties, ortho: !cadOpties.ortho })}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono ${
                  cadOpties.ortho ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                ∟ ORTHO F8
              </button>
            </div>
          )}

          {onOffset && (
            <div className="flex items-center gap-1.5 border-t border-border pt-2">
              <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={offsetAfstand}
                onChange={(e) => setOffsetAfstand(e.target.value)}
                className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-[10px]"
                aria-label="Offset-afstand in meters"
              />
              <span className="text-[10px] text-muted-foreground">m</span>
              <button
                type="button"
                onClick={() => onOffset(Number(offsetAfstand.replace(',', '.')) || 2)}
                className="rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                title="Parallelle lijn naast het geselecteerde tracé (offset)"
              >
                Parallel kopiëren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
