import { describe, expect, it } from 'vitest';
import { sectiesUitPolyline } from './trekvak-geometrie';

describe('sectiesUitPolyline', () => {
  it('zet een rechte lijn om in één rechte sectie', () => {
    const secties = sectiesUitPolyline([
      [0, 0],
      [100, 0],
      [250, 0],
    ]);
    expect(secties).toEqual([{ type: 'recht', lengteM: 250 }]);
  });

  it('herkent een haakse bocht met de werkelijke hoek', () => {
    const secties = sectiesUitPolyline([
      [0, 0],
      [100, 0],
      [100, 80],
    ]);
    expect(secties).toEqual([
      { type: 'recht', lengteM: 100 },
      { type: 'bocht', hoekDeg: 90, radiusM: 6 },
      { type: 'recht', lengteM: 80 },
    ]);
  });

  it('herkent een flauwe bocht (45°) en negeert mini-knikken < 15°', () => {
    const secties = sectiesUitPolyline([
      [0, 0],
      [100, 0],
      [200, 5], // ~2.9° — geen bocht
      [300, 105], // ~42° t.o.v. vorige heading — bocht
    ]);
    const bochten = secties.filter((s) => s.type === 'bocht');
    expect(bochten).toHaveLength(1);
    expect((bochten[0] as { hoekDeg: number }).hoekDeg).toBeGreaterThanOrEqual(40);
    expect((bochten[0] as { hoekDeg: number }).hoekDeg).toBeLessThanOrEqual(50);
  });

  it('voegt knikken binnen 2 m samen tot één bocht', () => {
    const secties = sectiesUitPolyline([
      [0, 0],
      [100, 0],
      [101, 1], // 45° knik, 1.4 m segment
      [101, 50], // nog eens 45° → samen 90°
    ]);
    const bochten = secties.filter((s) => s.type === 'bocht');
    expect(bochten).toHaveLength(1);
    expect((bochten[0] as { hoekDeg: number }).hoekDeg).toBe(90);
  });

  it('behoudt de kabelvolgorde recht → bocht → recht → bocht → recht', () => {
    const secties = sectiesUitPolyline([
      [0, 0],
      [100, 0],
      [100, 100],
      [200, 100],
    ]);
    expect(secties.map((s) => s.type)).toEqual(['recht', 'bocht', 'recht', 'bocht', 'recht']);
  });
});
