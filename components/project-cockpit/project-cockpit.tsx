'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Map as MapIcon, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PROJECT_PROCESS_STEPS,
  resolveProjectProcessStep,
  type ProjectProcessStepId,
} from '@/lib/navigation/project-process';
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

/** Kopbalk: projectnaam + autosave-melding (binnen de provider). */
function CockpitAutosave() {
  const { autosaveMelding } = useCockpit();
  if (!autosaveMelding) return null;
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
      {autosaveMelding}
    </span>
  );
}

/**
 * Project-cockpit: één scherm met een BLIJVENDE kaart en een processtap-rail.
 * De schermindeling past zich per stap aan: kaart-centrische stappen (tekenen,
 * netontwerp, bodem) geven de kaart het grootste deel; inhoud-/output-stappen
 * (engineering/calculatie, planning, dossier) geven het paneel het grootste deel.
 * De kaart kan ook handmatig in/uitgeklapt worden en blijft altijd gemount.
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStep = resolveProjectProcessStep(searchParams.get('stap'));
  const stepIndex = PROJECT_PROCESS_STEPS.findIndex((s) => s.id === activeStep);
  const stepDef = PROJECT_PROCESS_STEPS[stepIndex] ?? PROJECT_PROCESS_STEPS[0];
  const kaartCentrisch = stepDef.layout === 'kaart';

  const initialSelectedTraceId = searchParams.get('traceId') ?? allTraces[0]?.id;

  // Kaart-zichtbaarheid: standaard verborgen op inhoud-brede stappen voor maximale
  // ruimte; altijd zichtbaar op kaart-centrische stappen. Handmatig overschrijfbaar.
  // De eerste render houdt de kaart zichtbaar zodat MapLibre correct initialiseert
  // (anders zou hij op de breed-landingsstap verborgen opstarten en blanco blijven).
  const [kaartVerborgen, setKaartVerborgen] = useState(false);
  const eersteRender = useRef(true);
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    setKaartVerborgen(!kaartCentrisch);
  }, [kaartCentrisch, activeStep]);

  const gaNaarStap = useCallback(
    (stap: ProjectProcessStepId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('stap', stap);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const vorige = stepIndex > 0 ? PROJECT_PROCESS_STEPS[stepIndex - 1] : null;
  const volgende =
    stepIndex < PROJECT_PROCESS_STEPS.length - 1 ? PROJECT_PROCESS_STEPS[stepIndex + 1] : null;

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
        {/* Kopbalk: projectnaam, stap-walker en kaart-toggle */}
        <div className="flex min-w-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
          <h1 className="truncate font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-foreground">
            {projectNaam}
          </h1>
          <CockpitAutosave />
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={!vorige}
              onClick={() => vorige && gaNaarStap(vorige.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Vorige
            </button>
            {volgende && (
              <button
                type="button"
                onClick={() => gaNaarStap(volgende.id)}
                className="inline-flex items-center gap-1 rounded-md bg-[#2D6FE8] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#2563d4]"
              >
                {volgende.titel} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setKaartVerborgen((v) => !v)}
              aria-pressed={!kaartVerborgen}
              className={cn(
                'ml-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
                kaartVerborgen
                  ? 'border-border text-muted-foreground hover:bg-muted'
                  : 'border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[#2D6FE8]'
              )}
              title={kaartVerborgen ? 'Kaart tonen' : 'Kaart verbergen'}
            >
              {kaartVerborgen ? <MapIcon className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
              Kaart
            </button>
          </div>
        </div>

        <CockpitStepRail />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Zijpaneel — breedte afhankelijk van stap-layout en kaart-zichtbaarheid */}
          <aside
            className={cn(
              'w-full shrink-0 overflow-y-auto bg-background',
              kaartVerborgen
                ? 'lg:flex-1'
                : kaartCentrisch
                  ? 'max-h-[42dvh] border-b border-border lg:max-h-none lg:w-[380px] lg:border-b-0 lg:border-r'
                  : 'border-b border-border lg:flex-1 lg:border-b-0 lg:border-r'
            )}
          >
            <CockpitSidePanel
              initieelNetontwerp={initieelNetontwerp}
              anthropicConfigured={anthropicConfigured}
            />
          </aside>

          {/* De BLIJVENDE kaart — stabiele positie (tweede kind), nooit unmount.
              Verbergen gebeurt via 'hidden' (display:none); ResizeObserver in de
              kaart herstelt de grootte bij opnieuw tonen. */}
          <div
            className={cn(
              'relative min-w-0',
              kaartVerborgen
                ? 'hidden'
                : kaartCentrisch
                  ? 'min-h-[320px] flex-1 lg:min-h-0'
                  : 'min-h-[320px] flex-1 lg:min-h-0 lg:max-w-[520px]'
            )}
          >
            <CockpitMap />
          </div>
        </div>
      </div>
    </CockpitProvider>
  );
}
