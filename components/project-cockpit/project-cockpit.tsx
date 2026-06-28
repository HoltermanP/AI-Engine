'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, HelpCircle, Map as MapIcon, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  PROJECT_PROCESS_STEPS,
  resolveProjectProcessStep,
  type ProjectProcessStepId,
} from '@/lib/navigation/project-process';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
 * Globale tracé-selector: bepaalt op welk tracé de stappen (bodem, netontwerp,
 * engineering) werken. Houdt de cockpit-context én `?traceId` in de URL synchroon.
 */
function CockpitTraceSelector() {
  const { allTraces, selectedTraceId, setSelectedTraceId } = useCockpit();
  const router = useRouter();
  const searchParams = useSearchParams();
  if (allTraces.length === 0) return null;

  const kies = (id: string) => {
    setSelectedTraceId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set('traceId', id);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Select value={selectedTraceId ?? allTraces[0]?.id} onValueChange={(v) => v && kies(v)}>
      <SelectTrigger className="h-7 w-[210px] text-xs">
        <SelectValue placeholder="Kies tracé" />
      </SelectTrigger>
      <SelectContent>
        {allTraces.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.kleur }} />
              {t.code} — {t.naam}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const SNELTOETSEN: [string, string][] = [
  ['F3', 'Object-snap (OSNAP) aan/uit'],
  ['F8', 'Ortho-modus aan/uit'],
  ['Ctrl/⌘ + Z', 'Tekenstap ongedaan maken'],
  ['Ctrl/⌘ + Shift + Z', 'Opnieuw'],
  ['Esc', 'Tekenmodus / selectie verlaten'],
  ['⌘K', 'Zoeken / snel navigeren'],
  ['Sleep de scheiding', 'Paneel- en kaartbreedte aanpassen'],
];

/** "?"-knop met een overzicht van de sneltoetsen (CAD-tekenen + cockpit). */
function CockpitShortcutsHelp() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Sneltoetsen"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Sneltoetsen &amp; tips</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          {SNELTOETSEN.map(([toets, uitleg]) => (
            <div key={toets} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{uitleg}</span>
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {toets}
              </kbd>
            </div>
          ))}
        </div>
        </DialogContent>
      </Dialog>
    </>
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

  // Sleepbare scheiding: breedte van het zijpaneel (px) op desktop.
  const KAART_DEFAULT = 380;
  const BREED_DEFAULT = 760;
  const [panelBreedte, setPanelBreedte] = useState(kaartCentrisch ? KAART_DEFAULT : BREED_DEFAULT);
  const splitRef = useRef<HTMLDivElement>(null);
  const pwSleutel = `cockpit:pw:${activeStep}`;

  // Kaart-zichtbaarheid auto-aanpassen per stap (eerste render overslaan).
  useEffect(() => {
    if (eersteRender.current) {
      eersteRender.current = false;
      return;
    }
    setKaartVerborgen(!kaartCentrisch);
  }, [kaartCentrisch, activeStep]);

  // Paneelbreedte per stap laden uit localStorage (val terug op de stap-default).
  useEffect(() => {
    const def = kaartCentrisch ? KAART_DEFAULT : BREED_DEFAULT;
    if (typeof window === 'undefined') {
      setPanelBreedte(def);
      return;
    }
    const opgeslagen = window.localStorage.getItem(pwSleutel);
    const n = opgeslagen ? parseInt(opgeslagen, 10) : NaN;
    setPanelBreedte(Number.isFinite(n) ? n : def);
  }, [activeStep, kaartCentrisch, pwSleutel]);

  const startSlepen = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      const container = splitRef.current;
      if (!container) return;
      const links = container.getBoundingClientRect().left;
      const breedte = container.getBoundingClientRect().width;
      let laatste = panelBreedte;
      const onMove = (ev: MouseEvent) => {
        laatste = Math.min(breedte - 320, Math.max(280, ev.clientX - links));
        setPanelBreedte(laatste);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        // Voorkeur per stap onthouden.
        try {
          window.localStorage.setItem(pwSleutel, String(Math.round(laatste)));
        } catch {
          /* localStorage niet beschikbaar — voorkeur niet bewaard */
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [panelBreedte, pwSleutel]
  );

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
      <AutosaveBijStapwissel />
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden">
        {/* Kopbalk: projectnaam, stap, tracé-selector, walker en kaart-toggle */}
        <div className="flex min-w-0 items-center gap-3 border-b border-border bg-card px-4 py-2">
          <h1 className="truncate font-[family-name:var(--font-space-grotesk)] text-sm font-bold text-foreground">
            {projectNaam}
          </h1>
          <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
            <ChevronRight className="h-3 w-3" /> {stepDef.titel}
          </span>
          <div className="hidden sm:block">
            <CockpitTraceSelector />
          </div>
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
            <CockpitShortcutsHelp />
          </div>
        </div>

        <CockpitStepRail />

        <div ref={splitRef} className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Zijpaneel — breedte instelbaar via de sleepbalk (desktop). */}
          <aside
            style={kaartVerborgen ? undefined : ({ ['--pw' as string]: `${panelBreedte}px` } as CSSProperties)}
            className={cn(
              'w-full overflow-y-auto bg-background',
              kaartVerborgen
                ? 'lg:flex-1'
                : cn(
                    'max-h-[42dvh] border-b border-border lg:max-h-none lg:w-[var(--pw)] lg:shrink-0 lg:border-b-0',
                    !kaartCentrisch && 'lg:border-b'
                  )
            )}
          >
            <CockpitSidePanel
              initieelNetontwerp={initieelNetontwerp}
              anthropicConfigured={anthropicConfigured}
            />
          </aside>

          {/* Sleepbalk tussen paneel en kaart (alleen desktop, kaart zichtbaar). */}
          {!kaartVerborgen && (
            <div
              role="separator"
              aria-orientation="vertical"
              onMouseDown={startSlepen}
              className="hidden w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-[#2D6FE8]/50 lg:block"
              title="Sleep om de breedte aan te passen"
            />
          )}

          {/* De BLIJVENDE kaart — stabiele positie, nooit unmount. Verbergen via
              'hidden' (display:none); ResizeObserver herstelt de grootte bij tonen. */}
          <div
            className={cn(
              'relative min-w-0',
              kaartVerborgen ? 'hidden' : 'min-h-[320px] flex-1 lg:min-h-0'
            )}
          >
            <CockpitMap />
          </div>
        </div>
      </div>
    </CockpitProvider>
  );
}

/**
 * Schrijft bij élke vervolgactie (wissel van hoofdstap of netontwerp-substap)
 * een openstaande wijziging direct weg. Centraal en navigatie-onafhankelijk:
 * werkt voor de Vorige/Volgende-knoppen, de step-rail én de substap-navigatie.
 */
function AutosaveBijStapwissel() {
  const { flushPendingSaves } = useCockpit();
  const searchParams = useSearchParams();
  const sleutel = `${searchParams.get('stap') ?? ''}:${searchParams.get('substap') ?? ''}`;
  const vorige = useRef(sleutel);
  useEffect(() => {
    if (vorige.current !== sleutel) {
      vorige.current = sleutel;
      void flushPendingSaves();
    }
  }, [sleutel, flushPendingSaves]);
  return null;
}
