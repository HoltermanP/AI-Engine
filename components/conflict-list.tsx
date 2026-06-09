'use client';

import { Badge } from '@/components/ui/badge';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, MapPin, XCircle } from 'lucide-react';

interface ConflictListProps {
  conflicten: DetectedConflict[];
  selectedConflictId?: string | null;
  onSelectConflict?: (conflict: DetectedConflict | null) => void;
}

const ERNST_STYLES = {
  blokkerend: {
    icon: XCircle,
    badge: 'border-[#FF4D1C]/50 bg-[#FF4D1C]/10 text-[#FF4D1C]',
    label: 'Blokkerend',
  },
  waarschuwing: {
    icon: AlertTriangle,
    badge: 'border-amber-500/50 bg-amber-500/10 text-amber-700',
    label: 'Waarschuwing',
  },
  info: {
    icon: Info,
    badge: 'border-[#2D6FE8]/50 bg-[#2D6FE8]/10 text-[#2D6FE8]',
    label: 'Info',
  },
};

export function ConflictList({
  conflicten,
  selectedConflictId,
  onSelectConflict,
}: ConflictListProps) {
  if (conflicten.length === 0) {
    return (
      <p className="text-xs text-green-700">
        Geen conflicten gedetecteerd.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {conflicten.map((c) => {
        const style = ERNST_STYLES[c.ernst];
        const Icon = style.icon;
        const isSelected = selectedConflictId === c.id;
        const clickable = Boolean(onSelectConflict);

        return (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              onSelectConflict?.(isSelected ? null : c)
            }
            disabled={!clickable}
            className={cn(
              'w-full rounded border bg-card p-3 text-left text-xs transition-colors',
              clickable && 'cursor-pointer hover:border-[#2D6FE8]/40 hover:bg-muted/40',
              isSelected
                ? 'border-[#2D6FE8] bg-[#2D6FE8]/5 ring-1 ring-[#2D6FE8]/30'
                : 'border-border'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <Badge variant="outline" className={style.badge}>
                  {style.label}
                </Badge>
              </div>
              {c.norm && (
                <span className="font-mono text-[10px] text-muted-foreground">{c.norm}</span>
              )}
            </div>
            <p className="mt-2 font-medium text-foreground">{c.titel}</p>
            <p className="mt-1 text-muted-foreground">{c.toelichting}</p>
            {(c.waardeGemeten !== undefined || c.waardeEis !== undefined) && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Gemeten: {c.waardeGemeten ?? '—'} m · Eis: {c.waardeEis ?? '—'} m
              </p>
            )}
            {clickable && (
              <p className="mt-2 flex items-center gap-1 text-[10px] text-[#2D6FE8]">
                <MapPin className="h-3 w-3" />
                {isSelected ? 'Geselecteerd op kaart' : 'Toon op kaart'}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
