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
  /** Slechtste markering binnen dit segment (best-effort routering) */
  marker?: SegmentMarker;
  /** Vereist handmatige correctie (loopt door bebouwing/privaat) */
  handmatigOplossen?: boolean;
}

/**
 * Markering van een (deel)tracé bij best-effort routering: 'ok' = vrije ligging,
 * 'door_bebouwing'/'door_privaat' = handmatig oplossen.
 */
export type SegmentMarker = 'ok' | 'door_bebouwing' | 'door_privaat';

/** Een gemarkeerd deel van de uiteindelijke tracégeometrie. */
export interface MarkedSegment {
  marker: SegmentMarker;
  coordinates: [number, number, number][];
  lengteM: number;
  /** Voor 'door_privaat': perceelnummer(s); voor 'door_bebouwing': pand-aanduiding indien bekend */
  toelichting?: string;
}

/** Eén particulier perceel dat door het tracé wordt doorkruist (ZRO). */
export interface ZroPerceel {
  perceelnummer: string;
  eigenaarType: 'particulier' | 'bedrijf' | 'gemeente' | 'overheid' | 'onbekend';
  lengteDoorPerceelM: number;
  /** Welke route-segmenten (volgorde) dit perceel raken */
  segmentVolgorde: number[];
  status: 'zakelijk_recht_vereist' | 'gedoogplicht' | 'publiek' | 'eigenaar_onbekend';
  /** Bestaand recht indien bekend uit BRK */
  zakelijkRecht?: string;
}

/** Overzicht van zakelijk recht (ZRO) over de particuliere percelen op het tracé. */
export interface ZroOverzicht {
  percelen: ZroPerceel[];
  totaalPrivaatM: number;
  bron: 'live' | 'demo';
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
  /** Panddekking onzeker (PDOK-data afgekapt) — bebouwingsvrijheid niet gegarandeerd */
  panddekkingOnzeker?: boolean;
  /** Gemarkeerde deeltracés (best-effort routering) */
  markedSegments?: MarkedSegment[];
  /** Eén of meer segmenten lopen door bebouwing/privaat en vereisen handmatige correctie */
  heeftHandmatigOpTeLossen?: boolean;
  /** Zakelijk-recht-overzicht over doorkruiste particuliere percelen */
  zroOverzicht?: ZroOverzicht;
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
  /** Panddekking onzeker (PDOK-data afgekapt) */
  panddekkingOnzeker?: boolean;
  /** Gemarkeerde deeltracés (best-effort routering) */
  markedSegments?: MarkedSegment[];
  /** Eén of meer segmenten lopen door bebouwing/privaat */
  heeftHandmatigOpTeLossen?: boolean;
  /** Zakelijk-recht-overzicht over doorkruiste particuliere percelen */
  zroOverzicht?: ZroOverzicht;
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
  /** Panddekking onzeker (PDOK-feature-caps geraakt) — bebouwingstoets mogelijk onvolledig */
  panddekkingOnzeker: boolean;
}

export interface RisicoZone {
  type: 'bodem' | 'natura2000' | 'archeologie' | 'nge' | 'flora_fauna';
  naam: string;
  polygon: [number, number][];
  ernst: 'hoog' | 'middel' | 'laag';
  /** Maatregel/onderzoeksplicht bij doorkruising */
  maatregel: string;
}
