'use client';

import { useSearchParams } from 'next/navigation';
import { resolveProjectProcessStep } from '@/lib/navigation/project-process';
import { useCockpit } from './cockpit-context';
import { IntakePanel } from './panels/intake-panel';
import { EngineeringPanel } from './panels/engineering-panel';
import { PlanningPanel } from './panels/planning-panel';
import { DossierPanel } from './panels/dossier-panel';
import { TraceFase1Panel } from '@/components/trace-fase1-panel';
import { BodemVooronderzoekPanel } from '@/components/bodem-vooronderzoek-panel';
import { NetontwerpWorkspace } from '@/components/netontwerp/netontwerp-workspace';
import type { Netontwerp } from '@/lib/netontwerp/types';

export interface CockpitSidePanelProps {
  initieelNetontwerp: Netontwerp;
  anthropicConfigured?: boolean;
}

/** Wisselt het zijpaneel op basis van de actieve processtap (`?stap=`). */
export function CockpitSidePanel({ initieelNetontwerp, anthropicConfigured }: CockpitSidePanelProps) {
  const searchParams = useSearchParams();
  const step = resolveProjectProcessStep(searchParams.get('stap'));
  const { allTraces, selectedTraceId } = useCockpit();
  const trace = allTraces.find((t) => t.id === selectedTraceId) ?? allTraces[0];

  switch (step) {
    case 'intake':
      return <IntakePanel />;
    case 'trace':
      return trace ? (
        <TraceFase1Panel trace={trace} anthropicConfigured={anthropicConfigured} />
      ) : (
        <p className="p-4 text-sm text-muted-foreground">Nog geen tracé in dit project.</p>
      );
    case 'bodem':
      return <BodemVooronderzoekPanel />;
    case 'netontwerp':
      return <NetontwerpWorkspace initieleOntwerp={initieelNetontwerp} />;
    case 'engineering':
      return <EngineeringPanel anthropicConfigured={anthropicConfigured} />;
    case 'planning':
      return <PlanningPanel />;
    case 'dossier':
      return <DossierPanel />;
    default:
      return <IntakePanel />;
  }
}
