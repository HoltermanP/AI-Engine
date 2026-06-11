import type { Discipline } from '@/lib/db/types';
import type { Leglocatie, TraceSegment } from '@/demo/roads';
import type { MapLayerData } from '@/components/trace-map';

export interface TraceWaypoint {
  x: number;
  y: number;
  label?: string;
}

export interface TraceRoutingInput {
  waypoints: TraceWaypoint[];
  discipline: Discipline;
  projectId: string;
  vereisteDekking: number;
  netType?: string;
  layerData?: MapLayerData;
  bestaandNet?: {
    id: string;
    thema: string;
    beheerder: string;
    coordinates: [number, number, number?][];
    /** Minimale parallelafstand (m) conform netbeheerder/NEN 7171 */
    vrijTeHoudenAfstand?: number;
  }[];
  useAi?: boolean;
}

export interface RouteSegmentAnalysis {
  volgorde: number;
  wegnaam: string;
  leglocatie: Leglocatie;
  legtechniek: TraceSegment['legtechniek'];
  lengteM: number;
  /** Kruisingen in dit segment */
  kruisingen: RouteCrossing[];
  /** Score 0–100 (hoger = beter) */
  score: number;
  opmerkingen: string[];
  /** Privaat terrein — zakelijk recht vereist */
  zakelijkRechtVereist?: boolean;
  /** Gemotiveerde afwijkingen van de richtlijnen (wat + waarom + maatregel) */
  afwijkingen?: string[];
}

export interface RouteCrossing {
  type: 'weg' | 'water' | 'spoor' | 'natuur' | 'bebouwing';
  naam: string;
  breedteM?: number;
  legtechniek: TraceSegment['legtechniek'];
  normReferentie?: string;
  /** Gekozen uitvoeringsmethode (asfaltzagen, nanodrill, gestuurde boring, …) */
  methode?: string;
  methodeLabel?: string;
  beheerder?: string;
  vergunning?: string;
  /** Gekozen oplossing + afgewezen alternatieven met reden */
  afweging?: string[];
  /** Kruisingslocatie (RD) voor annotatie op de tekening */
  x?: number;
  y?: number;
}

export interface TraceRoutingResult {
  id?: string;
  label?: string;
  traceLines: [number, number, number][][];
  coordinates: [number, number, number][];
  segmenten: RouteSegmentAnalysis[];
  totaleLengteM: number;
  /** Algemene score 0–100 */
  score: number;
  samenvatting: string[];
  waarschuwingen: string[];
  blokkades: string[];
  normReferenties: string[];
  aiToelichting?: string;
  aiBron?: 'live' | 'demo';
  /** Top 3 route-alternatieven (eerste = aanbevolen) */
  alternatieven?: TraceRouteAlternative[];
  geselecteerdeAlternativeId?: string;
}

export interface TraceRouteAlternative {
  id: string;
  label: string;
  beschrijving: string;
  traceLines: [number, number, number][][];
  coordinates: [number, number, number][];
  segmenten: RouteSegmentAnalysis[];
  totaleLengteM: number;
  score: number;
  waarschuwingen: string[];
  blokkades: string[];
}

export interface RoutingContext {
  discipline: Discipline;
  projectId: string;
  gemeente: string;
  vereisteDekking: number;
  offsetM: number;
  diepteNap: number;
  normReferenties: string[];
  roadCenterlines: { id: string; naam: string; type: string; centerline: [number, number][] }[];
  pandPolygonen: [number, number][][];
  begroeidPolygonen: [number, number][][];
  percelen: { id: string; perceelnummer: string; polygon: [number, number][]; publiek?: boolean }[];
  watergangen: { naam: string; coordinates: [number, number][]; breedteM?: number }[];
  belemmeringen: { id: string; categorie: string; naam?: string; coordinates: [number, number][] }[];
  bestaandNet: TraceRoutingInput['bestaandNet'];
  /** Boompunten (BGT vegetatieobject) — minimale afstand bewaken */
  bomen: { x: number; y: number }[];
  /** Geüploade referentieontwerpen: geleerde voorkeurscorridors */
  referentieTraces: [number, number][][];
  /** Risicozones uit de datalagen: vermijden waar mogelijk, anders gemotiveerd afwijken */
  risicoZones: RisicoZone[];
}

export interface RisicoZone {
  type: 'bodem' | 'natura2000' | 'archeologie' | 'nge' | 'flora_fauna';
  naam: string;
  polygon: [number, number][];
  ernst: 'hoog' | 'middel' | 'laag';
  /** Maatregel/onderzoeksplicht bij doorkruising */
  maatregel: string;
}
