'use client';

import { TRACE_PHASES, type PhaseStatus, type TracePhase } from '@/lib/process/phases';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, Circle, Loader2, AlertTriangle } from 'lucide-react';

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

function PhaseConnector({ completed }: { completed: boolean }) {
  return (
    <div className="mx-0.5 hidden items-center sm:flex">
      <div
        className={cn(
          'h-px w-3 transition-colors',
          completed ? 'bg-emerald-400' : 'bg-border'
        )}
      />
      <ChevronRight
        className={cn(
          'h-3 w-3',
          completed ? 'text-emerald-400' : 'text-muted-foreground/30'
        )}
      />
    </div>
  );
}

export function TracePhaseNav({ activePhase, onPhaseChange, phaseStatuses }: TracePhaseNavProps) {
  const activeIndex = TRACE_PHASES.findIndex((p) => p.id === activePhase);

  return (
    <nav
      aria-label="Tracé-werkproces"
      className="border-b border-border bg-card px-4 py-2"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Tracé-werkproces · 5 fases
      </p>
      <div className="flex items-center overflow-x-auto">
        {TRACE_PHASES.map((phase, index) => {
          const status = phaseStatuses[phase.id] ?? (phase.id === 'fase1' ? 'gereed' : 'open');
          const isActive = activePhase === phase.id;
          const isPast = index < activeIndex || status === 'gereed';

          return (
            <div key={phase.id} className="flex items-center">
              {index > 0 && <PhaseConnector completed={isPast} />}
              <button
                type="button"
                onClick={() => onPhaseChange(phase.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  isActive
                    ? 'bg-[#2D6FE8]/10 ring-1 ring-[#2D6FE8]/30'
                    : 'hover:bg-muted/60'
                )}
              >
                <PhaseIndicator nummer={phase.nummer} status={status} isActive={isActive} />
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide',
                      isActive ? 'text-[#2D6FE8]' : 'text-muted-foreground'
                    )}
                  >
                    {phase.label}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {phase.titel}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export function TracePhaseHeader({ phase }: { phase: TracePhase }) {
  const def = TRACE_PHASES.find((p) => p.id === phase);
  const index = TRACE_PHASES.findIndex((p) => p.id === phase);
  const next = index >= 0 && index < TRACE_PHASES.length - 1 ? TRACE_PHASES[index + 1] : null;

  if (!def) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">
          Fase {def.nummer}: {def.titel}
        </p>
        <p className="text-xs text-muted-foreground">{def.beschrijving}</p>
      </div>
      {next && (
        <p className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
          Daarna: <span className="font-medium text-foreground">{next.titel}</span>
        </p>
      )}
    </div>
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
    <div className="flex items-center justify-end border-t border-border bg-muted/20 px-4 py-2">
      <button
        type="button"
        onClick={() => onPhaseChange(next.id)}
        disabled={!canProceed}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
          canProceed
            ? 'bg-[#2D6FE8] text-white hover:bg-[#2563d4]'
            : 'cursor-not-allowed bg-muted text-muted-foreground'
        )}
      >
        Volgende: {next.titel}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
