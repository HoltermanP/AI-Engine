'use client';

import { TRACE_PHASES, type PhaseStatus, type TracePhase } from '@/lib/process/phases';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';

interface TracePhaseNavProps {
  activePhase: TracePhase;
  onPhaseChange: (phase: TracePhase) => void;
  phaseStatuses: Partial<Record<TracePhase, PhaseStatus>>;
}

function PhaseIndicator({
  nummer,
  status,
  isActive,
}: {
  nummer: number;
  status: PhaseStatus;
  isActive: boolean;
}) {
  if (status === 'gereed') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === 'blokkerend') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF4D1C] text-white">
        <AlertTriangle className="h-3 w-3" />
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
        isActive
          ? 'bg-[#2D6FE8] text-white shadow-sm shadow-[#2D6FE8]/30'
          : 'bg-muted text-muted-foreground ring-1 ring-border'
      )}
    >
      {nummer}
    </span>
  );
}

/**
 * Eén rustige navigatiebalk: fase-pills met daaronder de beschrijving van de
 * actieve fase. Op smalle schermen tonen alleen de actieve fase en de
 * indicatoren tekst — de rest blijft bereikbaar via horizontaal scrollen.
 */
export function TracePhaseNav({ activePhase, onPhaseChange, phaseStatuses }: TracePhaseNavProps) {
  const activeIndex = TRACE_PHASES.findIndex((p) => p.id === activePhase);
  const activeDef = TRACE_PHASES[activeIndex];
  const next =
    activeIndex >= 0 && activeIndex < TRACE_PHASES.length - 1
      ? TRACE_PHASES[activeIndex + 1]
      : null;

  return (
    <nav aria-label="Tracé-werkproces" className="border-b border-border bg-card">
      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 sm:px-4 [scrollbar-width:thin]">
        {TRACE_PHASES.map((phase, index) => {
          const status = phaseStatuses[phase.id] ?? (phase.id === 'fase1' ? 'gereed' : 'open');
          const isActive = activePhase === phase.id;
          const isPast = index < activeIndex || status === 'gereed';

          return (
            <div key={phase.id} className="flex shrink-0 items-center">
              {index > 0 && (
                <ChevronRight
                  className={cn(
                    'mx-0.5 h-3 w-3 shrink-0',
                    isPast ? 'text-emerald-400' : 'text-muted-foreground/30'
                  )}
                />
              )}
              <button
                type="button"
                onClick={() => onPhaseChange(phase.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-2 py-1.5 transition-colors sm:px-2.5',
                  isActive ? 'bg-[#2D6FE8]/10 ring-1 ring-[#2D6FE8]/30' : 'hover:bg-muted/60'
                )}
              >
                <PhaseIndicator nummer={phase.nummer} status={status} isActive={isActive} />
                <span
                  className={cn(
                    'whitespace-nowrap text-xs font-medium',
                    isActive ? 'text-foreground' : 'hidden text-muted-foreground md:inline'
                  )}
                >
                  {phase.titel}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {activeDef && (
        <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/30 px-3 py-1.5 sm:px-4">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Fase {activeDef.nummer}</span>
            {' · '}
            {activeDef.beschrijving}
          </p>
          {next && (
            <p className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
              Daarna: <span className="font-medium text-foreground">{next.titel}</span>
            </p>
          )}
        </div>
      )}
    </nav>
  );
}

/** Volgende fase-knop voor onderin een paneel */
export function TracePhaseNextButton({
  currentPhase,
  onPhaseChange,
  phaseStatuses,
}: {
  currentPhase: TracePhase;
  onPhaseChange: (phase: TracePhase) => void;
  phaseStatuses: Partial<Record<TracePhase, PhaseStatus>>;
}) {
  const index = TRACE_PHASES.findIndex((p) => p.id === currentPhase);
  const next = index >= 0 && index < TRACE_PHASES.length - 1 ? TRACE_PHASES[index + 1] : null;
  if (!next) return null;

  const currentStatus = phaseStatuses[currentPhase] ?? 'open';
  const canProceed = currentStatus === 'gereed' || currentPhase === 'fase1';

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-3 py-2 sm:px-4">
      <p className="hidden min-w-0 truncate text-[11px] text-muted-foreground sm:block">
        {canProceed
          ? 'Deze fase is gereed — ga door naar de volgende stap.'
          : 'Rond eerst deze fase af om verder te gaan.'}
      </p>
      <button
        type="button"
        onClick={() => onPhaseChange(next.id)}
        disabled={!canProceed}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          canProceed
            ? 'bg-[#2D6FE8] text-white shadow-sm hover:bg-[#2563d4]'
            : 'cursor-not-allowed bg-muted text-muted-foreground'
        )}
      >
        Volgende: {next.titel}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
