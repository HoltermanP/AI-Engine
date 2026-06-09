import { DEMO_TRACES } from './traces';
import { traceAlongWeg } from './roads';

export interface DemoBestaandNet {
  id: string;
  thema: string;
  beheerder: string;
  spanningOfDiameter: string;
  materiaal: string;
  nauwkeurigheid: 'gemeten' | 'geschat' | 'maatvoering';
  diepte: number;
  vrijTeHoudenAfstand: number;
  coordinates: [number, number, number][];
  /** Weg waar net parallel aan ligt */
  parallelAan?: string;
}

/** Bestaand net parallel aan wegen — realistische locaties */
export const DEMO_BESTAAND_NET: DemoBestaandNet[] = [
  {
    id: 'klic-ms-liander-01',
    thema: 'elektra',
    beheerder: 'Liander',
    spanningOfDiameter: '10kV XLPE 1x240',
    materiaal: 'XLPE',
    nauwkeurigheid: 'gemeten',
    diepte: -1.1,
    vrijTeHoudenAfstand: 0.5,
    parallelAan: 'Provincialeweg N50',
    coordinates: traceAlongWeg('weg-provincialeweg', -6, -1.1, 400, 5800).map(([x, y]) => [x, y, -1.1]),
  },
  {
    id: 'klic-ls-enexis-01',
    thema: 'elektra',
    beheerder: 'Enexis',
    spanningOfDiameter: '400V GPLK 4x150',
    materiaal: 'Aluminium',
    nauwkeurigheid: 'geschat',
    diepte: -0.7,
    vrijTeHoudenAfstand: 0.3,
    parallelAan: 'Schokkerweg',
    coordinates: traceAlongWeg('weg-schokkerweg', -3, -0.7, 0, 412).map(([x, y]) => [x, y, -0.7]),
  },
  {
    id: 'klic-gas-hd-gts-01',
    thema: 'gas',
    beheerder: 'GTS',
    spanningOfDiameter: 'DN500 40bar',
    materiaal: 'Staal',
    nauwkeurigheid: 'gemeten',
    diepte: -1.85,
    vrijTeHoudenAfstand: 1.0,
    parallelAan: 'Provincialeweg N50 (noord)',
    coordinates: traceAlongWeg('weg-provincialeweg', 12, -1.85, 200, 6200).map(([x, y]) => [x, y, -1.85]),
  },
  {
    id: 'klic-gas-ld-01',
    thema: 'gas',
    beheerder: 'Gasunie Distributie',
    spanningOfDiameter: 'PE DN63 200mbar',
    materiaal: 'PE',
    nauwkeurigheid: 'maatvoering',
    diepte: -0.75,
    vrijTeHoudenAfstand: 0.35,
    parallelAan: 'Markerwaardweg',
    coordinates: traceAlongWeg('weg-markerwaardweg', -2.5, -0.75, 150, 4200).map(([x, y]) => [x, y, -0.75]),
  },
  {
    id: 'klic-water-01',
    thema: 'water',
    beheerder: 'Vitens',
    spanningOfDiameter: 'Ø250 PN16 (bestaand)',
    materiaal: 'Gietijzer',
    nauwkeurigheid: 'gemeten',
    diepte: -1.2,
    vrijTeHoudenAfstand: 0.5,
    parallelAan: 'Schokkerweg (noordberm)',
    coordinates: traceAlongWeg('weg-schokkerweg', 4.5, -1.2, 0, 412).map(([x, y]) => [x, y, -1.2]),
  },
  {
    id: 'klic-telecom-01',
    thema: 'telecom',
    beheerder: 'KPN',
    spanningOfDiameter: 'Microduct Ø40',
    materiaal: 'HDPE',
    nauwkeurigheid: 'geschat',
    diepte: -0.55,
    vrijTeHoudenAfstand: 0.25,
    parallelAan: 'Provincialeweg N50',
    coordinates: traceAlongWeg('weg-provincialeweg', -4, -0.55, 400, 5800).map(([x, y]) => [x, y, -0.55]),
  },
  {
    id: 'klic-warmte-01',
    thema: 'warmte',
    beheerder: 'Flevowarmte',
    spanningOfDiameter: 'DN150 pre-isolatie',
    materiaal: 'Staal',
    nauwkeurigheid: 'gemeten',
    diepte: -1.0,
    vrijTeHoudenAfstand: 0.4,
    parallelAan: 'Oosterringweg',
    coordinates: traceAlongWeg('weg-oosterringweg', -4, -1.0, 800, 4200).map(([x, y]) => [x, y, -1.0]),
  },
  {
    id: 'klic-ms-stedin-01',
    thema: 'elektra',
    beheerder: 'Stedin',
    spanningOfDiameter: '10kV XLPE 1x185',
    materiaal: 'XLPE',
    nauwkeurigheid: 'maatvoering',
    diepte: -1.0,
    vrijTeHoudenAfstand: 0.5,
    parallelAan: 'Markerwaardweg',
    coordinates: traceAlongWeg('weg-markerwaardweg', 4, -1.0, 400, 4000).map(([x, y]) => [x, y, -1.0]),
  },
  {
    id: 'klic-drinkwater-02',
    thema: 'water',
    beheerder: 'Vitens',
    spanningOfDiameter: 'Ø315 PN16 (nieuw)',
    materiaal: 'Gietijzer',
    nauwkeurigheid: 'gemeten',
    diepte: -1.3,
    vrijTeHoudenAfstand: 0.5,
    parallelAan: 'Schokkerweg (zuidberm)',
    coordinates: traceAlongWeg('weg-schokkerweg', -5, -1.3, 0, 412).map(([x, y]) => [x, y, -1.3]),
  },
  {
    id: 'klic-glasvezel-01',
    thema: 'telecom',
    beheerder: 'Eurofiber',
    spanningOfDiameter: 'Microduct Ø32 (4x)',
    materiaal: 'HDPE',
    nauwkeurigheid: 'geschat',
    diepte: -0.6,
    vrijTeHoudenAfstand: 0.25,
    parallelAan: 'Provincialeweg N50',
    coordinates: traceAlongWeg('weg-provincialeweg', -5.5, -0.6, 600, 5000).map(([x, y]) => [x, y, -0.6]),
  },
];

export function getKlicForBbox(bbox: {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}) {
  return DEMO_BESTAAND_NET.filter((net) =>
    net.coordinates.some(
      ([x, y]) =>
        x >= bbox.minX && x <= bbox.maxX && y >= bbox.minY && y <= bbox.maxY
    )
  );
}

function offsetTraceLine(
  coords: [number, number, number][],
  offsetM: number
): [number, number, number][] {
  if (coords.length < 2) return coords;
  return coords.map(([x, y, z], i) => {
    const prev = coords[Math.max(0, i - 1)];
    const next = coords[Math.min(coords.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    return [
      Math.round((x + nx * offsetM) * 10) / 10,
      Math.round((y + ny * offsetM) * 10) / 10,
      z,
    ];
  });
}

/** KLIC-netten parallel aan het actieve tracé (niet uit andere straten in de buurt). */
export function getKlicForTrace(traceId: string): DemoBestaandNet[] {
  const trace = DEMO_TRACES.find((t) => t.id === traceId);
  if (!trace || trace.coordinates.length < 2) return DEMO_BESTAAND_NET;

  const templates: (Omit<DemoBestaandNet, 'coordinates'> & { offsetM: number })[] = [
    {
      id: 'klic-trace-elektra-01',
      thema: 'elektra',
      beheerder: 'Liander',
      spanningOfDiameter: '400V GPLK 4x150',
      materiaal: 'Aluminium',
      nauwkeurigheid: 'geschat',
      diepte: -0.7,
      vrijTeHoudenAfstand: 0.3,
      parallelAan: trace.wegnaam,
      offsetM: -3.5,
    },
    {
      id: 'klic-trace-elektra-02',
      thema: 'elektra',
      beheerder: 'Stedin',
      spanningOfDiameter: '10kV XLPE 1x185',
      materiaal: 'XLPE',
      nauwkeurigheid: 'maatvoering',
      diepte: -1.0,
      vrijTeHoudenAfstand: 0.5,
      parallelAan: trace.wegnaam,
      offsetM: 3.5,
    },
    {
      id: 'klic-trace-gas-01',
      thema: 'gas',
      beheerder: 'Gasunie Distributie',
      spanningOfDiameter: 'PE DN63 200mbar',
      materiaal: 'PE',
      nauwkeurigheid: 'maatvoering',
      diepte: -0.75,
      vrijTeHoudenAfstand: 0.35,
      parallelAan: trace.wegnaam,
      offsetM: -5.5,
    },
    {
      id: 'klic-trace-water-01',
      thema: 'water',
      beheerder: 'Vitens',
      spanningOfDiameter: 'Ø250 PN16',
      materiaal: 'Gietijzer',
      nauwkeurigheid: 'gemeten',
      diepte: -1.2,
      vrijTeHoudenAfstand: 0.5,
      parallelAan: trace.wegnaam,
      offsetM: 5.0,
    },
    {
      id: 'klic-trace-telecom-01',
      thema: 'telecom',
      beheerder: 'KPN',
      spanningOfDiameter: 'Microduct Ø40',
      materiaal: 'HDPE',
      nauwkeurigheid: 'geschat',
      diepte: -0.55,
      vrijTeHoudenAfstand: 0.25,
      parallelAan: trace.wegnaam,
      offsetM: -1.8,
    },
  ];

  return templates.map(({ offsetM, diepte, ...rest }) => ({
    ...rest,
    diepte,
    coordinates: offsetTraceLine(trace.coordinates, offsetM).map(([x, y]) => [
      x,
      y,
      diepte,
    ]),
  }));
}
