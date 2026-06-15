import { describe, expect, it } from 'vitest';
import { bematingenSvg } from './bemating-render';
import { generateTraceDxf } from './dxf';
import type { Bemating } from '@/lib/map/bemating';

const lineair: Bemating = {
  id: 'd1',
  type: 'lineair',
  punten: [
    [0, 0],
    [100, 0],
  ],
  offsetM: 4,
};
const hoek: Bemating = {
  id: 'a1',
  type: 'hoek',
  punten: [
    [10, 0],
    [0, 0],
    [0, 10],
  ],
  radiusM: 5,
};

describe('bematingenSvg', () => {
  const tx = (x: number) => x;
  const ty = (y: number) => 200 - y; // y-flip zoals in de tekening

  it('rendert een lineaire maatlijn met label en pijlen', () => {
    const svg = bematingenSvg([lineair], tx, ty);
    expect(svg).toContain('100.00 m');
    expect(svg).toContain('<polygon'); // pijlpunt
    expect(svg).toContain('<text');
  });

  it('rendert een hoekbemating met booglijn en gradenlabel', () => {
    const svg = bematingenSvg([hoek], tx, ty);
    expect(svg).toContain('90.0°');
    expect(svg).toContain('<polyline');
  });

  it('geeft lege string zonder bematingen', () => {
    expect(bematingenSvg([], tx, ty)).toBe('');
    expect(bematingenSvg(undefined, tx, ty)).toBe('');
  });
});

describe('generateTraceDxf met bemating', () => {
  it('schrijft de bematinglabels naar de DXF', () => {
    const dxf = generateTraceDxf({
      naam: 'TST',
      centerline: [
        [0, 0],
        [100, 0],
      ],
      bematingen: [lineair, hoek],
    });
    expect(dxf).toContain('100.00 m');
    expect(dxf).toContain('90.0');
    expect(dxf).toContain('KR-NIEUW WERK-ANNOTATIE');
  });
});
