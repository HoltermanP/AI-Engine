'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GitBranch, Minus, Pencil, Plus, RotateCcw, Trash2, Wand2 } from 'lucide-react';

export type DrawMode = 'none' | 'draw' | 'edit' | 'auto';

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
}: MapDisplayControlsProps) {
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
            </p>
          )}
        </div>
      )}
    </div>
  );
}
