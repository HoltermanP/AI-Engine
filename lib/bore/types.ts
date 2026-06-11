import type { DemoSondering } from '@/demo/bro';

export type BoreMethode = 'hdd' | 'persing' | 'sleufloos';

export const BORE_METHODE_LABELS: Record<BoreMethode, string> = {
  hdd: 'Gestuurd boren (HDD)',
  persing: 'Persing / microtunneling',
  sleufloos: 'Sleufloze techniek',
};

export interface BoreTrajectory {
  entryAngleDeg: number;
  exitAngleDeg: number;
  maxDiepteNap: number;
  boogstraalM: number;
  booglengteM: number;
  entryPutL: number;
  exitPutL: number;
  entryPutB: number;
  exitPutB: number;
  entryPutD: number;
  exitPutD: number;
}

export interface BoreSegmentInput {
  volgorde: number;
  methode: BoreMethode;
  wegnaam: string;
  lengteM: number;
  buisDiameterMm: number;
  productDiameterMm: number;
  maaiveldNap: number;
  diepteAsNap: number;
  vereisteDekking: number;
  trajectory: BoreTrajectory;
  sonderingen: DemoSondering[];
  grondwaterNap: number;
  grondFactor: number;
  dominantGrondsoort: string;
}

export interface BoreCalcResult {
  type: string;
  segmentVolgorde: number;
  methode: BoreMethode;
  normReferentie: string;
  invoer: Record<string, number | string | boolean>;
  resultaat: Record<string, number | string | boolean>;
  aannames: string[];
  conclusie: string;
}

export interface BorePlan {
  segmentVolgorde: number;
  methode: BoreMethode;
  label: string;
  samenvatting: string;
  lengteM: number;
  maaiveldNap: number;
  grondwaterNap: number;
  vereisteDekking: number;
  trajectory: BoreTrajectory;
  sonderingRefs: string[];
  risicos: string[];
  maatregelen: string[];
  uitvoeringsvolgorde: string[];
}

export interface BoreSegmentResult {
  volgorde: number;
  methode: BoreMethode;
  label: string;
  berekeningen: BoreCalcResult[];
  boorplan: BorePlan;
  sonderingen: DemoSondering[];
}

export interface BoreEngineeringResult {
  traceId: string;
  traceCode: string;
  segmenten: BoreSegmentResult[];
}
