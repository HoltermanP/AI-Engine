'use client';

import { PROJECT_FASEN } from '@/lib/process/fasen';
import { TRACE_PHASES } from '@/lib/process/phases';

/**
 * Compacte, inklapbare uitleg van het standaard ontwerpproces. Ingeklapt op
 * het dashboard zodat het dagelijkse werk geen documentatie in de weg heeft.
 */
export function WorkflowOverview() {
  return (
    <details className="group rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
        Hoe werkt het ontwerpproces?
      </summary>
      <div className="grid gap-4 border-t border-border/60 p-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#2D6FE8]">
            Standaard ontwerpproces
          </p>
          <ol className="space-y-2">
            {PROJECT_FASEN.map((fase) => (
              <li key={fase.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2D6FE8]/10 text-[10px] font-bold text-[#2D6FE8]">
                  {fase.nummer}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{fase.naam}</p>
                  <p className="text-xs text-muted-foreground">{fase.omschrijving}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
            Per tracé in de werkruimte
          </p>
          <ol className="space-y-2">
            {TRACE_PHASES.map((fase) => (
              <li key={fase.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                  {fase.nummer}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{fase.titel}</p>
                  <p className="text-xs text-muted-foreground">{fase.beschrijving}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </details>
  );
}
