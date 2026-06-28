import { describe, expect, it } from 'vitest';
import { segmentIntersectsPolygon } from '@/lib/geo';
import { detectCrossings } from './plan';
import type { RoutingContext } from './types';

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

describe('segmentIntersectsPolygon', () => {
  const vierkant: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it('detecteert een segment dat alleen een hoek van een pand doorsnijdt', () => {
    // Beide eindpunten en het middelpunt liggen buiten het vierkant,
    // maar het segment snijdt de hoek bij (0,10)–(10,10)/(0,0)-(0,10)
    expect(segmentIntersectsPolygon(-2, 8, 8, 12, vierkant)).toBe(true);
  });

  it('detecteert een segment dwars door het pand', () => {
    expect(segmentIntersectsPolygon(-5, 5, 15, 5, vierkant)).toBe(true);
  });

  it('laat een segment dat langs het pand loopt met rust', () => {
    expect(segmentIntersectsPolygon(-5, 12, 15, 12, vierkant)).toBe(false);
  });
});

describe('detectCrossings', () => {
  it('detecteert een haakse waterkruising met techniek naar echte breedte', () => {
    const ctx = baseCtx({
      watergangen: [
        // Brede vaart (12 m uit BGT-waterdeel) die de route haaks kruist
        {
          naam: 'Hoofdvaart',
          breedteM: 12,
          coordinates: [
            [50, -20],
            [50, 20],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [25, 0],
      [75, 0],
      [100, 0],
    ];
    const crossings = detectCrossings(route, ctx);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].type).toBe('water');
    expect(crossings[0].legtechniek).toBe('hdd');
    expect(crossings[0].normReferentie).toContain('NEN 3650');
    expect(crossings[0].normReferentie).toContain('waterschap');
  });

  it('waterkruising zonder bekende breedte krijgt middencategorie + verificatie-opmerking', () => {
    const ctx = baseCtx({
      watergangen: [
        {
          naam: 'Sloot',
          coordinates: [
            [50, -20],
            [50, 20],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [25, 0],
      [75, 0],
      [100, 0],
    ];
    const crossings = detectCrossings(route, ctx);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].methode).toBe('gestuurde_boring');
    expect(crossings[0].afweging?.join(' ')).toContain('Breedte onbekend');
  });

  it('telt parallel lopen langs een weg niet als kruising', () => {
    const ctx = baseCtx({
      roadCenterlines: [
        {
          id: 'w1',
          naam: 'Parallelweg',
          type: 'gemeenteweg',
          centerline: [
            [0, 1],
            [100, 1],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [50, 0],
      [100, 0],
    ];
    expect(detectCrossings(route, ctx)).toHaveLength(0);
  });

  it('detecteert een haakse wegkruising — provinciale weg krijgt gesloten front', () => {
    const ctx = baseCtx({
      roadCenterlines: [
        {
          id: 'n50',
          naam: 'N50',
          type: 'provincialeweg',
          centerline: [
            [50, -30],
            [50, 30],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [25, 0],
      [75, 0],
      [100, 0],
    ];
    const crossings = detectCrossings(route, ctx, 'Kuinderweg');
    expect(crossings).toHaveLength(1);
    expect(crossings[0].legtechniek).toBe('persing');
    expect(crossings[0].methode).toBe('persing');
    expect(crossings[0].beheerder).toContain('Provincie');
    expect(crossings[0].afweging?.join(' ')).toContain('Asfaltzagen afgewezen');
    expect(crossings[0].x).toBeCloseTo(50, 0);
  });

  it('kruist eigen gevolgde weg niet', () => {
    const ctx = baseCtx({
      roadCenterlines: [
        {
          id: 'k1',
          naam: 'Kuinderweg',
          type: 'gemeenteweg',
          centerline: [
            [50, -30],
            [50, 30],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [25, 0],
      [75, 0],
      [100, 0],
    ];
    expect(detectCrossings(route, ctx, 'Kuinderweg')).toHaveLength(0);
  });

  it('spoorkruising krijgt altijd boring/persing met ProRail-verwijzing', () => {
    const ctx = baseCtx({
      belemmeringen: [
        {
          id: 'spoor-1',
          categorie: 'spoor',
          naam: 'Spoorlijn Lelystad',
          coordinates: [
            [50, -30],
            [50, 30],
          ],
        },
      ],
    });
    const route: [number, number][] = [
      [0, 0],
      [25, 0],
      [75, 0],
      [100, 0],
    ];
    const crossings = detectCrossings(route, ctx);
    expect(crossings).toHaveLength(1);
    expect(crossings[0].type).toBe('spoor');
    expect(crossings[0].legtechniek).toBe('persing');
    expect(crossings[0].normReferentie).toContain('ProRail');
  });
});
