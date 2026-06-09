import { traceAlongWeg } from './roads';

export type RioleringStelsel = 'gemengd' | 'vrijverval' | 'onder_overdruk';
export type RioleringType = 'hoofdriool' | 'huisaansluiting' | 'berging' | 'persleiding';

export interface DemoRiolering {
  id: string;
  type: RioleringType;
  stelsel: RioleringStelsel;
  diameterMm: number;
  beheerder: string;
  diepte: number;
  coordinates: [number, number, number][];
  parallelAan?: string;
}

/** Demodata riolering — parallel aan wegen, conform GWSW-ligging (berm/onder verharding) */
export const DEMO_RIOLERING: DemoRiolering[] = [
  {
    id: 'riool-hoofd-provincialeweg',
    type: 'hoofdriool',
    stelsel: 'gemengd',
    diameterMm: 600,
    beheerder: 'Waterschap Zuiderzeeland',
    diepte: -2.4,
    parallelAan: 'Provincialeweg N50',
    coordinates: traceAlongWeg('weg-provincialeweg', -4.5, -2.4, 0, 6200).map(([x, y]) => [x, y, -2.4]),
  },
  {
    id: 'riool-hoofd-schokkerweg',
    type: 'hoofdriool',
    stelsel: 'gemengd',
    diameterMm: 400,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -2.0,
    parallelAan: 'Schokkerweg',
    coordinates: traceAlongWeg('weg-schokkerweg', -4.2, -2.0, 0, 412).map(([x, y]) => [x, y, -2.0]),
  },
  {
    id: 'riool-hoofd-zuidermolenweg',
    type: 'hoofdriool',
    stelsel: 'gemengd',
    diameterMm: 400,
    beheerder: 'Waterschap Zuiderzeeland',
    diepte: -2.1,
    parallelAan: 'Zuidermolenweg',
    coordinates: traceAlongWeg('weg-zuidermolenweg', -5.0, -2.1, 0, 3200).map(([x, y]) => [x, y, -2.1]),
  },
  {
    id: 'riool-hoofd-markerwaardweg',
    type: 'hoofdriool',
    stelsel: 'vrijverval',
    diameterMm: 315,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -1.9,
    parallelAan: 'Markerwaardweg',
    coordinates: traceAlongWeg('weg-markerwaardweg', -4.8, -1.9, 150, 4200).map(([x, y]) => [x, y, -1.9]),
  },
  {
    id: 'riool-hoofd-oosterringweg',
    type: 'hoofdriool',
    stelsel: 'vrijverval',
    diameterMm: 500,
    beheerder: 'Waterschap Zuiderzeeland',
    diepte: -2.3,
    parallelAan: 'Oosterringweg',
    coordinates: traceAlongWeg('weg-oosterringweg', -4.0, -2.3, 800, 4200).map(([x, y]) => [x, y, -2.3]),
  },
  {
    id: 'riool-pers-industrie',
    type: 'persleiding',
    stelsel: 'onder_overdruk',
    diameterMm: 250,
    beheerder: 'Waterschap Zuiderzeeland',
    diepte: -1.6,
    parallelAan: 'Provincialeweg N50 (bedrijventerrein)',
    coordinates: traceAlongWeg('weg-provincialeweg', 8.0, -1.6, 2800, 3600).map(([x, y]) => [x, y, -1.6]),
  },
  {
    id: 'riool-berging-schokker',
    type: 'berging',
    stelsel: 'vrijverval',
    diameterMm: 160,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -1.5,
    parallelAan: 'Schokkerweg (zuidzijde)',
    coordinates: traceAlongWeg('weg-schokkerweg', 5.5, -1.5, 80, 280).map(([x, y]) => [x, y, -1.5]),
  },
  {
    id: 'riool-huisaansluiting-provinciaal-1',
    type: 'huisaansluiting',
    stelsel: 'gemengd',
    diameterMm: 125,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -1.2,
    parallelAan: 'Provincialeweg N50',
    coordinates: traceAlongWeg('weg-provincialeweg', -7.5, -1.2, 1200, 1350).map(([x, y]) => [x, y, -1.2]),
  },
  {
    id: 'riool-huisaansluiting-zuidermolen-1',
    type: 'huisaansluiting',
    stelsel: 'gemengd',
    diameterMm: 110,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -1.1,
    parallelAan: 'Zuidermolenweg',
    coordinates: traceAlongWeg('weg-zuidermolenweg', -7.0, -1.1, 900, 1050).map(([x, y]) => [x, y, -1.1]),
  },
  {
    id: 'riool-huisaansluiting-markerwaard-1',
    type: 'huisaansluiting',
    stelsel: 'vrijverval',
    diameterMm: 125,
    beheerder: 'Gemeente Noordoostpolder',
    diepte: -1.0,
    parallelAan: 'Markerwaardweg',
    coordinates: traceAlongWeg('weg-markerwaardweg', -7.2, -1.0, 2200, 2350).map(([x, y]) => [x, y, -1.0]),
  },
];

export function getRioleringForBbox(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}) {
  return DEMO_RIOLERING.filter((leiding) =>
    leiding.coordinates.some(
      ([x, y]) =>
        x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
    )
  );
}
