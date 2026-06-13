import { describe, expect, it } from 'vitest';
import { segmentIntersectsPolygon } from '@/lib/geo';
import { planAutomaticTrace, buildRoutingContext } from './plan';
import type { MapLayerData } from '@/components/trace-map';
import type { TraceRoutingInput, TraceWaypoint } from './types';

/**
 * Offline end-to-end toetsen voor de automatische tracébepaling.
 *
 * Het synthetische wegennet ligt bewust ver (±60 km) van de demo-data rond
 * Noordoostpolder (x≈179.000, y≈524.000), zodat DEMO_WEGEN/DEMO_PERCELEN/
 * DEMO_BELEMMERINGEN buiten de zoek-bbox vallen en de graaf alleen uit onze
 * eigen lagen wordt opgebouwd. Zo zijn de uitkomsten deterministisch.
 */
const OX = 120_000;
const OY = 480_000;

type Road = { naam: string; type: string; coordinates: [number, number][] };

function makeLayerData(overrides: Partial<MapLayerData> = {}): MapLayerData {
  return {
    coordinateSystem: 'EPSG:28992',
    nwb: [],
    bgt: [],
    percelen: [],
    watergangen: [],
    bomen: [],
    belemmeringen: [],
    natura2000: [],
    vervuildeGrond: [],
    ...overrides,
  };
}

function makeInput(
  waypoints: TraceWaypoint[],
  roads: Road[],
  layerOverrides: Partial<MapLayerData> = {},
  inputOverrides: Partial<TraceRoutingInput> = {}
): TraceRoutingInput {
  return {
    waypoints,
    discipline: 'elektra_ls',
    projectId: 'demo-project-001',
    vereisteDekking: 0.6,
    layerData: makeLayerData({ nwb: roads, ...layerOverrides }),
    ...inputOverrides,
  };
}

/** Telt segmenten van de uiteindelijke route die een pandpolygoon doorsnijden. */
function pandDoorsnijdingen(
  coords: [number, number, number][],
  panden: [number, number][][]
): number {
  let hits = 0;
  for (let i = 1; i < coords.length; i++) {
    for (const pand of panden) {
      if (
        segmentIntersectsPolygon(
          coords[i - 1][0],
          coords[i - 1][1],
          coords[i][0],
          coords[i][1],
          pand
        )
      ) {
        hits++;
      }
    }
  }
  return hits;
}

/** Aandeel routepunten dat binnen `tol` meter van een wegcenterline ligt. */
function wegVolgPct(coords: [number, number, number][], roads: Road[], tol = 12): number {
  if (!coords.length) return 0;
  let bij = 0;
  for (const [x, y] of coords) {
    let minD = Infinity;
    for (const weg of roads) {
      for (let i = 1; i < weg.coordinates.length; i++) {
        const [x1, y1] = weg.coordinates[i - 1];
        const [x2, y2] = weg.coordinates[i];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
        minD = Math.min(minD, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
        if (minD < tol) break;
      }
      if (minD < tol) break;
    }
    if (minD < tol) bij++;
  }
  return Math.round((100 * bij) / coords.length);
}

function rechthoek(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): [number, number][] {
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
}

describe('planAutomaticTrace — invoervalidatie', () => {
  it('vraagt om minimaal 2 punten', () => {
    const res = planAutomaticTrace(
      makeInput([{ x: OX, y: OY }], [
        { naam: 'Hoofdstraat', type: 'G', coordinates: [[OX, OY], [OX + 500, OY]] },
      ])
    );
    expect(res.waarschuwingen.join(' ')).toContain('Minimaal 2 punten');
    expect(res.totaleLengteM).toBe(0);
    expect(res.normReferenties.length).toBeGreaterThan(0);
  });

  it('meldt het ontbreken van een wegennet', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        []
      )
    );
    expect(res.blokkades.join(' ')).toContain('Geen NWB/BGT wegen');
    expect(res.alternatieven).toHaveLength(0);
  });

  it('meldt het wanneer waypoints te ver van elk wegennet liggen', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX + 20_000, y: OY + 20_000 },
          { x: OX + 21_000, y: OY + 20_000 },
        ],
        [{ naam: 'Hoofdstraat', type: 'G', coordinates: [[OX, OY], [OX + 500, OY]] }]
      )
    );
    expect(res.alternatieven ?? []).toHaveLength(0);
    expect(res.waarschuwingen.join(' ')).toMatch(/Geen route|wegennet/i);
  });
});

describe('planAutomaticTrace — rechte verbinding', () => {
  const roads: Road[] = [
    { naam: 'Hoofdstraat', type: 'G', coordinates: [[OX, OY], [OX + 250, OY], [OX + 500, OY]] },
  ];

  it('routeert langs één rechte weg met realistische lengte', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads
      )
    );
    expect(res.alternatieven!.length).toBeGreaterThanOrEqual(1);
    expect(res.totaleLengteM).toBeGreaterThan(480);
    expect(res.totaleLengteM).toBeLessThan(560);
    expect(res.segmenten.length).toBe(1);
    expect(res.score).toBeGreaterThan(50);
    expect(wegVolgPct(res.coordinates, roads)).toBeGreaterThanOrEqual(90);
  });

  it('legt de juiste legdiepte vast per discipline', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads
      )
    );
    expect(res.coordinates.every(([, , z]) => z === -0.65)).toBe(true);

    const gas = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads,
        {},
        { discipline: 'gas_ld' }
      )
    );
    expect(gas.coordinates.every(([, , z]) => z === -0.8)).toBe(true);
  });

  it('vermeldt normreferenties voor de discipline', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads
      )
    );
    expect(res.normReferenties).toContain('NEN 7171');
    expect(res.normReferenties.some((n) => n.startsWith('AVOI'))).toBe(true);
  });
});

describe('planAutomaticTrace — netwerk met meerdere routes', () => {
  // Rechthoekig stratennet: zuid- en noordrand 500 m, twee verbindingen van 100 m.
  const roads: Road[] = [
    { naam: 'Zuidstraat', type: 'G', coordinates: [[OX, OY], [OX + 250, OY], [OX + 500, OY]] },
    { naam: 'Noordstraat', type: 'G', coordinates: [[OX, OY + 100], [OX + 250, OY + 100], [OX + 500, OY + 100]] },
    { naam: 'Westlaan', type: 'G', coordinates: [[OX, OY], [OX, OY + 100]] },
    { naam: 'Oostlaan', type: 'G', coordinates: [[OX + 500, OY], [OX + 500, OY + 100]] },
  ];

  it('kiest de kortste route (zuidrand) en biedt een afwijkend alternatief', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads
      )
    );
    // Kortste = recht over de zuidrand (~500 m)
    expect(res.totaleLengteM).toBeGreaterThan(480);
    expect(res.totaleLengteM).toBeLessThan(560);
    expect(res.alternatieven!.length).toBeGreaterThanOrEqual(2);
    // De alternatieven moeten daadwerkelijk verschillen (lengte of wegnamen)
    const lengtes = new Set(res.alternatieven!.map((a) => a.totaleLengteM));
    const wegcombinaties = new Set(
      res.alternatieven!.map((a) => a.segmenten.map((s) => s.wegnaam).join('|'))
    );
    expect(lengtes.size + wegcombinaties.size).toBeGreaterThan(2);
  });

  it('routeert via de hoek bij een L-vormige verbinding', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY + 100 },
        ],
        roads
      )
    );
    expect(res.alternatieven!.length).toBeGreaterThanOrEqual(1);
    expect(res.totaleLengteM).toBeGreaterThan(580);
    expect(wegVolgPct(res.coordinates, roads)).toBeGreaterThanOrEqual(90);
  });
});

describe('planAutomaticTrace — bebouwing wordt nooit doorsneden', () => {
  // Rechthoekig net; een pand blokkeert het midden van de zuidrand.
  const roads: Road[] = [
    { naam: 'Zuidstraat', type: 'G', coordinates: [[OX, OY], [OX + 500, OY]] },
    { naam: 'Noordstraat', type: 'G', coordinates: [[OX, OY + 100], [OX + 500, OY + 100]] },
    { naam: 'Westlaan', type: 'G', coordinates: [[OX, OY], [OX, OY + 100]] },
    { naam: 'Oostlaan', type: 'G', coordinates: [[OX + 500, OY], [OX + 500, OY + 100]] },
  ];
  const pand = rechthoek(OX + 240, OY - 4, OX + 260, OY + 4);

  it('wijkt uit naar de noordrand en raakt het pand niet', () => {
    const input = makeInput(
      [
        { x: OX, y: OY },
        { x: OX + 500, y: OY },
      ],
      roads,
      {
        bgt: [
          {
            type: 'pand',
            label: 'Woning 1',
            geometry: { type: 'Polygon', coordinates: [pand] },
          },
        ],
      }
    );
    const res = planAutomaticTrace(input);
    const ctx = buildRoutingContext(input);
    expect(res.alternatieven!.length).toBeGreaterThanOrEqual(1);
    expect(ctx.pandPolygonen.length).toBeGreaterThan(0);
    expect(pandDoorsnijdingen(res.coordinates, ctx.pandPolygonen)).toBe(0);
    // Omweg via het noorden is langer dan de geblokkeerde directe lijn
    expect(res.totaleLengteM).toBeGreaterThan(650);
  });

  it('geeft geen route wanneer bebouwing elke verbinding blokkeert', () => {
    // Alleen een rechte weg, volledig overdekt door een pand
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        [{ naam: 'Zuidstraat', type: 'G', coordinates: [[OX, OY], [OX + 500, OY]] }],
        {
          bgt: [
            {
              type: 'pand',
              label: 'Blok',
              geometry: { type: 'Polygon', coordinates: [rechthoek(OX - 10, OY - 10, OX + 510, OY + 10)] },
            },
          ],
        }
      )
    );
    expect(res.alternatieven ?? []).toHaveLength(0);
    expect(res.blokkades.join(' ')).toMatch(/pand|bebouwing/i);
  });
});

describe('planAutomaticTrace — kruisingen worden gedetecteerd', () => {
  const roads: Road[] = [
    { naam: 'Hoofdstraat', type: 'G', coordinates: [[OX, OY], [OX + 250, OY], [OX + 500, OY]] },
  ];

  it('detecteert een brede waterkruising met HDD', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads,
        {
          watergangen: [
            {
              naam: 'Hoofdvaart',
              type: 'water',
              breedteM: 14,
              coordinates: [[OX + 260, OY - 40], [OX + 260, OY + 40]],
            },
          ],
        }
      )
    );
    const kruisingen = res.segmenten.flatMap((s) => s.kruisingen);
    const water = kruisingen.find((k) => k.type === 'water');
    expect(water).toBeDefined();
    expect(water!.legtechniek).toBe('hdd');
    expect(res.segmenten.some((s) => s.legtechniek === 'hdd')).toBe(true);
  });

  it('detecteert een spoorkruising met persing en ProRail-referentie', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads,
        {
          belemmeringen: [
            {
              id: 'spoor-1',
              categorie: 'spoor',
              beheerder: 'ProRail',
              coordinates: [[OX + 260, OY - 40], [OX + 260, OY + 40]],
            },
          ],
        }
      )
    );
    const spoor = res.segmenten.flatMap((s) => s.kruisingen).find((k) => k.type === 'spoor');
    expect(spoor).toBeDefined();
    expect(spoor!.legtechniek).toBe('persing');
    expect(spoor!.normReferentie).toContain('ProRail');
  });
});

describe('planAutomaticTrace — risicozones en bomen beïnvloeden de score', () => {
  const roads: Road[] = [
    { naam: 'Hoofdstraat', type: 'G', coordinates: [[OX, OY], [OX + 250, OY], [OX + 500, OY]] },
  ];

  function schoonResultaat() {
    return planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads
      )
    );
  }

  it('verlaagt de score en motiveert de afwijking bij doorkruising van verontreinigde grond', () => {
    const schoon = schoonResultaat();
    const vervuild = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads,
        {
          vervuildeGrond: [
            {
              id: 'vg-1',
              bron: 'test',
              naam: 'Oude tankstation',
              status: 'verdacht',
              risicoklasse: 'hoog',
              polygon: rechthoek(OX + 200, OY - 30, OX + 320, OY + 30),
            },
          ],
        }
      )
    );
    const afwijkingen = vervuild.segmenten.flatMap((s) => s.afwijkingen ?? []);
    expect(afwijkingen.join(' ')).toMatch(/bodem|verontrein/i);
    expect(vervuild.score).toBeLessThan(schoon.score);
  });

  it('signaleert bomen kort langs het tracé', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
        ],
        roads,
        {
          bomen: [
            { id: 'b1', x: OX + 250, y: OY + 1 },
            { id: 'b2', x: OX + 300, y: OY - 1 },
          ],
        }
      )
    );
    const opmerkingen = res.segmenten.flatMap((s) => s.opmerkingen);
    expect(opmerkingen.join(' ')).toMatch(/boom|bomen/i);
  });
});

describe('planAutomaticTrace — meerdere waypoints', () => {
  const roads: Road[] = [
    { naam: 'Zuidstraat', type: 'G', coordinates: [[OX, OY], [OX + 250, OY], [OX + 500, OY]] },
    { naam: 'Oostlaan', type: 'G', coordinates: [[OX + 500, OY], [OX + 500, OY + 100], [OX + 500, OY + 250]] },
  ];

  it('verbindt drie waypoints tot één doorlopend tracé', () => {
    const res = planAutomaticTrace(
      makeInput(
        [
          { x: OX, y: OY },
          { x: OX + 500, y: OY },
          { x: OX + 500, y: OY + 250 },
        ],
        roads
      )
    );
    expect(res.segmenten.length).toBe(2);
    expect(res.totaleLengteM).toBeGreaterThan(720);
    expect(wegVolgPct(res.coordinates, roads)).toBeGreaterThanOrEqual(85);
    // Doorlopend: geen gaten groter dan ~40 m tussen opeenvolgende punten
    const coords = res.coordinates;
    for (let i = 1; i < coords.length; i++) {
      const gap = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
      expect(gap).toBeLessThan(60);
    }
  });
});
