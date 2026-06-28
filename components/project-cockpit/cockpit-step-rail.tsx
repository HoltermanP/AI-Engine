'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  PROJECT_PROCESS_STEPS,
  resolveProjectProcessStep,
  type ProjectProcessStepId,
} from '@/lib/navigation/project-process';

/**
 * Horizontale processtap-rail van de cockpit. Wisselt de stap via `?stap=`
 * (router.replace, GEEN route-navigatie), zodat de kaart gemount blijft.
 */
export function CockpitStepRail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStep = resolveProjectProcessStep(searchParams.get('stap'));

  const gaNaarStap = useCallback(
    (stap: ProjectProcessStepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('stap', stap);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {PROJECT_PROCESS_STEPS.map((step, i) => {
        const Icon = step.icon;
        const active = step.id === activeStep;
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
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{step.titel}</span>
              <span className="sm:hidden">{step.nummer}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
