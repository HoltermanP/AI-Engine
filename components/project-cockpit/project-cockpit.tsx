'use client';

import { useSearchParams } from 'next/navigation';
import { CockpitProvider, useCockpit } from './cockpit-context';
import { CockpitMap } from './cockpit-map';
import { CockpitStepRail } from './cockpit-step-rail';
import { CockpitSidePanel } from './cockpit-side-panel';
import type { MapNet, MapTrace } from '@/components/trace-map';
import type { DemoTrace } from '@/demo/traces';
import type { Netontwerp } from '@/lib/netontwerp/types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';

export interface ProjectCockpitProps {
  projectId: string;
  projectNaam: string;
  allTraces: DemoTrace[];
  initialTraces: MapTrace[];
  bestaandNet: MapNet[];
  initialCollected: CollectedTraceData | null;
  initialConflicten: DetectedConflict[];
  initieelNetontwerp: Netontwerp;
  anthropicConfigured?: boolean;
}

/** Kop met projectnaam + autosave-melding (binnen de provider). */
function CockpitHeader({ projectNaam }: { projectNaam: string }) {
  const { autosaveMelding } = useCockpit();
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
      <h1 className="truncate font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-foreground">
        {projectNaam}
      </h1>
      {autosaveMelding && (
        <span className="ml-auto shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
          {autosaveMelding}
        </span>
      )}
    </div>
  );
}

/**
 * Project-cockpit: één scherm met een BLIJVENDE kaart en een processtap-rail.
 * Stapwissels (via `?stap=`) wisselen alleen het zijpaneel; de kaart (CockpitMap)
 * staat buiten de paneel-switch en blijft over alle stappen gemount.
 */
export function ProjectCockpit({
  projectId,
  projectNaam,
  allTraces,
  initialTraces,
  bestaandNet,
  initialCollected,
  initialConflicten,
  initieelNetontwerp,
  anthropicConfigured,
}: ProjectCockpitProps) {
  const searchParams = useSearchParams();
  const initialSelectedTraceId = searchParams.get('traceId') ?? allTraces[0]?.id;

  return (
    <CockpitProvider
      projectId={projectId}
      allTraces={allTraces}
      initialTraces={initialTraces}
      initialSelectedTraceId={initialSelectedTraceId}
      bestaandNet={bestaandNet}
      initialCollected={initialCollected}
      initialConflicten={initialConflicten}
    >
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        <CockpitHeader projectNaam={projectNaam} />
        <CockpitStepRail />
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="max-h-[42dvh] w-full shrink-0 overflow-y-auto border-b border-border bg-background lg:max-h-none lg:w-[380px] lg:border-b-0 lg:border-r">
            <CockpitSidePanel
              initieelNetontwerp={initieelNetontwerp}
              anthropicConfigured={anthropicConfigured}
            />
          </aside>
          <div className="relative min-h-[320px] min-w-0 flex-1 lg:min-h-0">
            <CockpitMap />
          </div>
        </div>
      </div>
    </CockpitProvider>
  );
}
