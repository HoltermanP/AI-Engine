import type { BodemGebiedType, BodemRisicoklasse } from '@/lib/services/bodem-risico/types';

export interface VervuildeGrondLocatie {
  id: string;
  bron: string;
  naam: string;
  status: string;
  polygon?: [number, number][];
  x?: number;
  y?: number;
  risicoklasse?: BodemRisicoklasse;
  gebiedType?: BodemGebiedType;
  afstandTraceM?: number;
}

export interface VervuildeGrondResult {
  locaties: VervuildeGrondLocatie[];
  bronnen: string[];
}

export type VervuildeGrondProvider = 'wfs' | 'ogc' | 'arcgis';

export interface VervuildeGrondSourceLayer {
  bron: string;
  label: string;
  color: string;
  typeNames?: string;
  collection?: string;
  layerId?: number;
  wfsBaseUrl?: string;
  gemeenteFilter?: string;
  gemeenteField?: string;
  nameFields?: string[];
  statusFields?: string[];
  /** WFS levert alleen GML (geen GeoJSON) — o.a. Bodemloket MapServer. */
  wfsGml?: boolean;
}

export interface VervuildeGrondSourceDefinition {
  id: string;
  label: string;
  gemeente: string;
  provider: VervuildeGrondProvider;
  baseUrl: string;
  layers: VervuildeGrondSourceLayer[];
  defaultEnabled?: boolean;
  coverageBbox?: { minX: number; minY: number; maxX: number; maxY: number };
  testBbox?: { minX: number; minY: number; maxX: number; maxY: number };
}
