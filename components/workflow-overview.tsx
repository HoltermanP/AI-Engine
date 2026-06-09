'use client';

import { PROJECT_PROCESS_STEPS } from '@/lib/navigation/project-process';
import { TRACE_PHASES } from '@/lib/process/phases';
import { ArrowRight } from 'lucide-react';

/** Statisch overzicht van het volledige werkproces op portfolio-niveau */
export function WorkflowOverview() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm">
      <div className="mb-3">
        <h2 className="section-heading text-base">Hoe werkt het?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elk project doorloopt vijf stappen. Per tracé werk je vervolgens vijf engineering-fases af.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#2D6FE8]">
            Projectniveau
          </p>
          <ol className="space-y-2">
            {PROJECT_PROCESS_STEPS.map((step) => (
              <li key={step.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2D6FE8]/10 text-[10px] font-bold text-[#2D6FE8]">
                  {step.nummer}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.titel}</p>
                  <p className="text-xs text-muted-foreground">{step.beschrijving}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
            Tracé-niveau (stap 2)
          </p>
          <ol className="space-y-2">
            {TRACE_PHASES.map((phase) => (
              <li key={phase.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700">
                  {phase.nummer}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{phase.titel}</p>
                  <p className="text-xs text-muted-foreground">{phase.beschrijving}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            Start via een project → kies een tracé → doorloop de fases
          </p>
        </div>
      </div>
    </div>
  );
}
