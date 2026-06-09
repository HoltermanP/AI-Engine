import { DEMO_WEGEN } from './roads';

export interface DemoMaaiveld {
  chainage: number;
  x: number;
  y: number;
  hoogteNap: number;
}

export interface DemoPerceel {
  id: string;
  perceelnummer: string;
  oppervlakte: number;
  polygon: [number, number][];
}

export interface DemoNatura2000Gebied {
  id: string;
  naam: string;
  code: string;
  afstandM: number;
  polygon: [number, number][];
}

export function generateMaaiveldProfile(
  coordinates: [number, number, number?][]
): DemoMaaiveld[] {
  const profile: DemoMaaiveld[] = [];
  let chainage = 0;
  const baseHoogte = -0.18; // polder NAP

  for (let i = 0; i < coordinates.length; i++) {
    const [x, y] = coordinates[i];
    if (i > 0) {
      const [px, py] = coordinates[i - 1];
      chainage += Math.hypot(x - px, y - py);
    }
    // Subtiele poldervariatie + verharding bij wegen
    const variatie = Math.sin(chainage / 300) * 0.15 + Math.cos(chainage / 120) * 0.05;
    profile.push({
      chainage: Math.round(chainage),
      x,
      y,
      hoogteNap: Math.round((baseHoogte + variatie) * 100) / 100,
    });
  }
  return profile;
}

export const DEMO_PERCELEN: DemoPerceel[] = [
  {
    id: 'brk-p-001',
    perceelnummer: 'NOP-5247-G-0001',
    oppervlakte: 12400,
    polygon: [
      [179900, 524650], [180300, 524650], [180300, 524900], [179900, 524900], [179900, 524650],
    ],
  },
  {
    id: 'brk-p-002',
    perceelnummer: 'NOP-5247-G-0002',
    oppervlakte: 8900,
    polygon: [
      [180300, 524650], [180650, 524650], [180650, 524900], [180300, 524900], [180300, 524650],
    ],
  },
  {
    id: 'brk-p-003',
    perceelnummer: 'NOP-5264-L-0015',
    oppervlakte: 3200,
    polygon: [
      [179550, 526350], [179850, 526350], [179850, 526550], [179550, 526550], [179550, 526350],
    ],
  },
  {
    id: 'brk-p-004',
    perceelnummer: 'NOP-5264-L-0016',
    oppervlakte: 5600,
    polygon: [
      [179850, 526350], [180200, 526350], [180200, 526550], [179850, 526550], [179850, 526350],
    ],
  },
  {
    id: 'brk-p-005',
    perceelnummer: 'NOP-5264-L-0020',
    oppervlakte: 4100,
    polygon: [
      [180200, 526350], [180550, 526350], [180550, 526550], [180200, 526550], [180200, 526350],
    ],
  },
  {
    id: 'brk-p-006',
    perceelnummer: 'NOP-5247-G-0008',
    oppervlakte: 15200,
    polygon: [
      [180650, 524650], [181100, 524650], [181100, 524900], [180650, 524900], [180650, 524650],
    ],
  },
  {
    id: 'brk-p-007',
    perceelnummer: 'NOP-5265-K-0003',
    oppervlakte: 2800,
    polygon: [
      [181100, 526200], [181400, 526200], [181400, 526450], [181100, 526450], [181100, 526200],
    ],
  },
];

export const DEMO_WATERGANGEN = [
  {
    id: 'wg-prinsengracht-noord',
    naam: 'Prinsengracht Noord',
    type: 'sloot',
    coordinates: [
      [179750, 526100], [180050, 526100], [180350, 526100], [180650, 526100],
    ] as [number, number][],
  },
  {
    id: 'wg-espeler-sloot',
    naam: 'Espelerwegsingel',
    type: 'gracht',
    coordinates: [
      [180750, 524920], [180850, 524925], [180950, 524930],
    ] as [number, number][],
  },
  {
    id: 'wg-banter-gracht',
    naam: 'Banterdiep (gedeelte)',
    type: 'gracht',
    coordinates: [
      [181000, 526300], [181300, 526400], [181600, 526500],
    ] as [number, number][],
  },
];

export const DEMO_KUNSTWERKEN = [
  { id: 'kw-001', naam: 'Duiker Schokkerweg', type: 'duiker', x: 180150, y: 524820 },
  { id: 'kw-002', naam: 'Brug Banterweg', type: 'brug', x: 181250, y: 526380 },
  { id: 'kw-003', naam: 'Duiker Provincialeweg', type: 'duiker', x: 181800, y: 526200 },
  { id: 'kw-004', naam: 'Kolk Markerwaardweg', type: 'kolk', x: 177585, y: 526061 },
];

/** Natura2000 Wolderwijd Zuid — bufferzone op ~450m van tracé (zuidwest Emmeloord) */
export const DEMO_NATURA2000: DemoNatura2000Gebied = {
  id: 'n2000-wolderwijd',
  naam: 'Wolderwijd en Eemmeer (NL9803001)',
  code: 'NL9803001',
  afstandM: 450,
  polygon: [
    [178800, 524000], [180800, 524000], [180800, 524300], [178800, 524300], [178800, 524000],
  ],
};

export const DEMO_BELEMMERINGEN = [
  {
    id: 'bel-provincialeweg',
    categorie: 'weg' as const,
    beheerder: 'Provincie Flevoland',
    naam: 'Provincialeweg N50',
    kruisingRegime: 'parallel / onderdoor bij kruisingen',
    eisDekking: 1.0,
    coordinates: DEMO_WEGEN.find((w) => w.id === 'weg-provincialeweg')!.centerline,
  },
  {
    id: 'bel-schokkerweg',
    categorie: 'weg' as const,
    beheerder: 'Gemeente Noordoostpolder',
    naam: 'Schokkerweg',
    kruisingRegime: 'bermlegging',
    eisDekking: 0.8,
    coordinates: DEMO_WEGEN.find((w) => w.id === 'weg-schokkerweg')!.centerline,
  },
  {
    id: 'bel-water-01',
    categorie: 'watergang' as const,
    beheerder: 'Waterschap Zuiderzeeland',
    naam: 'Prinsengracht Noord (sloot)',
    kruisingRegime: 'onderdoor',
    eisDekking: 1.2,
    coordinates: [
      [179750, 526100], [180050, 526100],
    ] as [number, number][],
  },
  {
    id: 'bel-spoor-01',
    categorie: 'spoor' as const,
    beheerder: 'ProRail',
    naam: 'Niet van toepassing (geen spoor in gebied)',
    kruisingRegime: 'n.v.t.',
    eisDekking: 0,
    coordinates: [] as [number, number][],
  },
  {
    id: 'bel-natura2000',
    categorie: 'natuur' as const,
    beheerder: 'Provincie Flevoland',
    naam: 'Natura2000 Wolderwijd (bufferzone)',
    kruisingRegime: 'natuurtoets vereist',
    eisDekking: 0,
    coordinates: DEMO_NATURA2000.polygon.slice(0, -1),
  },
];
