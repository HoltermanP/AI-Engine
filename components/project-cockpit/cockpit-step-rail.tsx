'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_PROCESS_STEPS,
  resolveProjectProcessStep,
  type ProjectProcessStepId,
} from '@/lib/navigation/project-process';
import { useCockpit } from './cockpit-context';

type StapStatus = 'gereed' | 'bezig' | 'blokkerend' | null;

/**
 * Horizontale processtap-rail. Wisselt de stap via `?stap=` (router.replace,
 * GEEN route-navigatie) zodat de kaart gemount blijft, en toont per stap een
 * status-indicator wáár we een betrouwbaar live-signaal hebben.
 */
export function CockpitStepRail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStep = resolveProjectProcessStep(searchParams.get('stap'));
  const { traces, selectedTraceId, toetsStatus } = useCockpit();

  const gaNaarStap = useCallback(
    (stap: ProjectProcessStepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('stap', stap);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const stapStatus = (id: ProjectProcessStepId): StapStatus => {
    if (id === 'trace') {
      const t = traces.find((x) => x.id === selectedTraceId) ?? traces[0];
      return t && (t.coordinates?.length ?? 0) >= 2 ? 'gereed' : null;
    }
    if (id === 'engineering') {
      if (toetsStatus === 'gereed') return 'gereed';
      if (toetsStatus === 'blokkerend') return 'blokkerend';
      if (toetsStatus === 'bezig') return 'bezig';
      return null;
    }
    return null;
  };

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {PROJECT_PROCESS_STEPS.map((step, i) => {
        const Icon = step.icon;
        const active = step.id === activeStep;
        const status = stapStatus(step.id);
        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && <span className="px-1 text-muted-foreground/40">›</span>}
            <button
              type="button"
              onClick={() => gaNaarStap(step.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-[#2D6FE8] text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="relative inline-flex">
                <Icon className="h-3.5 w-3.5" />
                {status && (
                  <span
                    className={cn(
                      'absolute -right-1.5 -top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full ring-2',
                      active ? 'ring-[#2D6FE8]' : 'ring-card',
                      status === 'gereed' && 'bg-emerald-500',
                      status === 'bezig' && 'animate-pulse bg-amber-500',
                      status === 'blokkerend' && 'bg-red-500'
                    )}
                  >
                    {status === 'gereed' && <Check className="h-1.5 w-1.5 text-white" strokeWidth={4} />}
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">{step.titel}</span>
              <span className="sm:hidden">{step.nummer}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
