'use client';

import { NETONTWERP_STAPPEN } from '@/lib/netontwerp/stappen';
import type { NetontwerpStap, StapStatus } from '@/lib/netontwerp/types';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface NetontwerpStappenNavProps {
  actieveStap: NetontwerpStap;
  onStapChange: (stap: NetontwerpStap) => void;
  stappenStatus: Record<NetontwerpStap, StapStatus>;
}

function StapIndicator({
  nummer,
  status,
  isActief,
}: {
  nummer: number;
  status: StapStatus;
  isActief: boolean;
}) {
  if (status === 'gereed') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'bezig') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2D6FE8]/20 ring-2 ring-[#2D6FE8]/40">
        <Loader2 className="h-3 w-3 animate-spin text-[#2D6FE8]" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        isActief
          ? 'bg-[#2D6FE8] text-white shadow-sm shadow-[#2D6FE8]/30'
          : 'bg-muted text-muted-foreground ring-1 ring-border',
      )}
    >
      {nummer}
    </span>
  );
}

export function NetontwerpStappenNav({
  actieveStap,
  onStapChange,
  stappenStatus,
}: NetontwerpStappenNavProps) {
  const actief = NETONTWERP_STAPPEN.find((s) => s.id === actieveStap);

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        {NETONTWERP_STAPPEN.map((stap) => {
          const isActief = stap.id === actieveStap;
          return (
            <button
              key={stap.id}
              type="button"
              onClick={() => onStapChange(stap.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActief
                  ? 'bg-[#2D6FE8]/10 text-[#2D6FE8] ring-1 ring-[#2D6FE8]/30'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <StapIndicator
                nummer={stap.nummer}
                status={stappenStatus[stap.id] ?? 'open'}
                isActief={isActief}
              />
              <span className={cn(!isActief && 'hidden lg:inline')}>{stap.titel}</span>
            </button>
          );
        })}
      </div>
      {actief && (
        <p className="px-4 pb-2 text-xs text-muted-foreground">{actief.beschrijving}</p>
      )}
    </div>
  );
}
