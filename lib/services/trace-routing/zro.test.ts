import { describe, expect, it } from 'vitest';
import { computeZroOverzicht, verrijkZroOverzicht } from './zro';
import type { RoutingContext } from './types';

const OX = 120_000;
const OY = 480_000;

function rechthoek(minX: number, minY: number, maxX: number, maxY: number): [number, number][] {
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
}

function baseCtx(overrides: Partial<RoutingContext> = {}): RoutingContext {
  return {
    discipline: 'elektra_ls',
    projectId: 'test',
    gemeente: 'Noordoostpolder',
    vereisteDekking: 0.6,
    offsetM: 0,
    diepteNap: -0.65,
    normReferenties: [],
    roadCenterlines: [],
    pandPolygonen: [],
    begroeidPolygonen: [],
    percelen: [],
    watergangen: [],
    belemmeringen: [],
    bestaandNet: [],
    bomen: [],
    referentieTraces: [],
    risicoZones: [],
    panddekkingOnzeker: false,
    ...overrides,
  };
}

/** Een rechte tracélijn (één segment) langs de x-as op diepte -0.65. */
function lijn(x1: number, x2: number, y = OY): [number, number, number][] {
  return [
    [x1, y, -0.65],
    [x2, y, -0.65],
  ];
}

describe('computeZroOverzicht', () => {
  it('accumuleert lengte per particulier perceel en sluit publieke percelen uit', () => {
    const ctx = baseCtx({
      percelen: [
        // Particulier perceel van x=100..200 rond de tracélijn
        { id: 'p1', perceelnummer: 'A 101', polygon: rechthoek(OX + 100, OY - 10, OX + 200, OY + 10) },
        // Publiek perceel van x=300..400 — moet worden uitgesloten
        {
          id: 'p2',
          perceelnummer: 'A 102',
          polygon: rechthoek(OX + 300, OY - 10, OX + 400, OY + 10),
          publiek: true,
        },
      ],
    });

    const overzicht = computeZroOverzicht([lijn(OX, OX + 500)], ctx);

    expect(overzicht.percelen).toHaveLength(1);
    const perceel = overzicht.percelen[0];
    expect(perceel.perceelnummer).toBe('A 101');
    // Ongeveer 100 m door het perceel (densificatie ~25 m stappen)
    expect(perceel.lengteDoorPerceelM).toBeGreaterThan(80);
    expect(perceel.lengteDoorPerceelM).toBeLessThan(120);
    expect(perceel.segmentVolgorde).toEqual([1]);
    // Zonder eigenaardata: onbekend
    expect(perceel.eigenaarType).toBe('onbekend');
    expect(perceel.status).toBe('eigenaar_onbekend');
    expect(overzicht.totaalPrivaatM).toBe(perceel.lengteDoorPerceelM);
  });

  it('geeft een leeg overzicht wanneer alleen publieke percelen worden geraakt', () => {
    const ctx = baseCtx({
      percelen: [
        {
          id: 'p1',
          perceelnummer: 'A 101',
          polygon: rechthoek(OX + 100, OY - 10, OX + 200, OY + 10),
          publiek: true,
        },
      ],
    });
    const overzicht = computeZroOverzicht([lijn(OX, OX + 500)], ctx);
    expect(overzicht.percelen).toHaveLength(0);
    expect(overzicht.totaalPrivaatM).toBe(0);
  });
});

describe('verrijkZroOverzicht', () => {
  const ctx = baseCtx({
    percelen: [
      { id: 'p1', perceelnummer: 'A 101', polygon: rechthoek(OX + 100, OY - 10, OX + 200, OY + 10) },
    ],
  });
  const overzicht = computeZroOverzicht([lijn(OX, OX + 500)], ctx);

  it('vult eigenaar en status in bij een match en upgrade naar live', () => {
    const verrijkt = verrijkZroOverzicht(
      overzicht,
      [{ perceelnummer: 'A 101', eigenaarType: 'particulier', zakelijkRecht: 'eigendom' }],
      'live'
    );
    expect(verrijkt.percelen[0].eigenaarType).toBe('particulier');
    expect(verrijkt.percelen[0].status).toBe('zakelijk_recht_vereist');
    expect(verrijkt.bron).toBe('live');
  });

  it('laat percelen onbekend bij geen match (gracieuze degradatie)', () => {
    const verrijkt = verrijkZroOverzicht(
      overzicht,
      [{ perceelnummer: 'Z 999', eigenaarType: 'bedrijf' }],
      'live'
    );
    expect(verrijkt.percelen[0].eigenaarType).toBe('onbekend');
    expect(verrijkt.percelen[0].status).toBe('eigenaar_onbekend');
    // Geen match → bron blijft demo
    expect(verrijkt.bron).toBe('demo');
  });
});
