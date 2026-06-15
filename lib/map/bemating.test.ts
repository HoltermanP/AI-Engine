import { describe, expect, it } from 'vitest';
import { bematingGeometrie, bematingWaarde, type Bemating } from './bemating';

describe('lineaire bemating', () => {
  const b: Bemating = {
    id: 'd1',
    type: 'lineair',
    punten: [
      [0, 0],
      [100, 0],
    ],
    offsetM: 4,
  };

  it('meet de afstand tussen de twee punten', () => {
    expect(bematingWaarde(b)).toBeCloseTo(100, 5);
  });

  it('verschuift de maatlijn over de offset loodrecht op de meetrichting', () => {
    const geo = bematingGeometrie(b);
    expect(geo.type).toBe('lineair');
    if (geo.type !== 'lineair') return;
    // Richting oost → normaal noord (links): maatlijn op y = +4
    expect(geo.maatlijn[0][1]).toBeCloseTo(4, 5);
    expect(geo.maatlijn[1][1]).toBeCloseTo(4, 5);
    expect(geo.maatlijn[0][0]).toBeCloseTo(0, 5);
    expect(geo.maatlijn[1][0]).toBeCloseTo(100, 5);
    expect(geo.label).toBe('100.00 m');
  });

  it('plaatst het label in het midden van de maatlijn', () => {
    const geo = bematingGeometrie(b);
    if (geo.type !== 'lineair') return;
    expect(geo.tekstPos[0]).toBeCloseTo(50, 1);
  });

  it('respecteert een handmatig label', () => {
    const geo = bematingGeometrie({ ...b, tekst: 'L=100' });
    expect(geo.label).toBe('L=100');
  });
});

describe('hoekbemating', () => {
  const haaks: Bemating = {
    id: 'a1',
    type: 'hoek',
    punten: [
      [10, 0], // been 1 (oost)
      [0, 0], // hoekpunt
      [0, 10], // been 2 (noord)
    ],
    radiusM: 5,
  };

  it('meet een haakse hoek als 90°', () => {
    expect(bematingWaarde(haaks)).toBeCloseTo(90, 4);
  });

  it('meet een gestrekte hoek als 180°', () => {
    const gestrekt: Bemating = {
      id: 'a2',
      type: 'hoek',
      punten: [
        [10, 0],
        [0, 0],
        [-10, 0],
      ],
    };
    expect(bematingWaarde(gestrekt)).toBeCloseTo(180, 4);
  });

  it('produceert een boog op de gegeven straal rond het hoekpunt', () => {
    const geo = bematingGeometrie(haaks);
    if (geo.type !== 'hoek') return;
    for (const [x, y] of geo.boog) {
      expect(Math.hypot(x, y)).toBeCloseTo(5, 4);
    }
    expect(geo.label).toBe('90.0°');
  });
});
