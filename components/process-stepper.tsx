'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepperStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

export interface StepperStep {
  id: string;
  nummer: number;
  label: string;
  titel: string;
  href?: string;
  status?: StepperStatus;
}

interface ProcessStepperProps {
  steps: StepperStep[];
  activeStepId: string;
  className?: string;
  compact?: boolean;
}

function StepIndicator({
  nummer,
  status,
  isActive,
}: {
  nummer: number;
  status: StepperStatus;
  isActive: boolean;
}) {
  if (status === 'gereed') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }

  if (status === 'blokkerend') {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF4D1C] text-xs font-bold text-white shadow-sm">
        !
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
        isActive
          ? 'bg-[#2D6FE8] text-white shadow-md shadow-[#2D6FE8]/30'
          : status === 'bezig'
          ? 'bg-[#2D6FE8]/20 text-[#2D6FE8] ring-2 ring-[#2D6FE8]/40'
          : 'bg-muted text-muted-foreground ring-1 ring-border'
      )}
    >
      {nummer}
    </span>
  );
}

function Connector({ completed }: { completed: boolean }) {
  return (
    <div className="mx-1 hidden min-w-[1.5rem] flex-1 items-center sm:flex">
      <div
        className={cn(
          'h-0.5 w-full rounded-full transition-colors',
          completed ? 'bg-emerald-400' : 'bg-border'
        )}
      />
      <ChevronRight
        className={cn(
          '-ml-1 h-3 w-3 shrink-0',
          completed ? 'text-emerald-400' : 'text-muted-foreground/40'
        )}
      />
    </div>
  );
}

export function ProcessStepper({
  steps,
  activeStepId,
  className,
  compact = false,
}: ProcessStepperProps) {
  const activeIndex = steps.findIndex((s) => s.id === activeStepId);

  return (
    <nav
      aria-label="Werkproces"
      className={cn(
        'rounded-xl border border-border/60 bg-card/80 px-3 py-2.5 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex items-stretch gap-0 overflow-x-auto">
        {steps.map((step, index) => {
          const status = step.status ?? 'open';
          const isActive = step.id === activeStepId;
          const isPast = activeIndex > index || status === 'gereed';

          const content = (
            <>
              <StepIndicator nummer={step.nummer} status={status} isActive={isActive} />
              {!compact && (
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide',
                      isActive ? 'text-[#2D6FE8]' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.titel}
                  </p>
                </div>
              )}
              {compact && (
                <p
                  className={cn(
                    'text-xs font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.titel}
                </p>
              )}
            </>
          );

          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center">
              {index > 0 && <Connector completed={isPast} />}
              {step.href ? (
                <Link
                  href={step.href}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                    isActive
                      ? 'bg-[#2D6FE8]/10 ring-1 ring-[#2D6FE8]/30'
                      : 'hover:bg-muted/60'
                  )}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5',
                    isActive && 'bg-[#2D6FE8]/10 ring-1 ring-[#2D6FE8]/30'
                  )}
                >
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
