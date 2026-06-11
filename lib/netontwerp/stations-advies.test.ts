import { describe, expect, it } from 'vitest';
import { adviseerStations } from './stations-advies';
import { defaultUitgangspunten, type Aansluiting } from './types';

function aansluiting(id: string, x: number, y: number, kva: number): Aansluiting {
  return {
    id,
    naam: id,
    type: 'woning',
    aantal: 1,
    kVAPerStuk: kva,
    gelijktijdigheid: 1,
    x,
    y,
    netvlak: 'LS',
  };
}

describe('stations-advies', () => {
  it('levert 1 station bij een cluster onder 80% van 630 kVA', () => {
    const advies = adviseerStations({
      aansluitingen: [aansluiting('a', 0, 0, 200), aansluiting('b', 100, 0, 200)],
      uitgangspunten: { ...defaultUitgangspunten(), groeifactor: 1, nMin1: false },
    });
    expect(advies.aantalStations).toBe(1);
    expect(advies.suggesties[0].belastingKVA).toBe(400);
    // Belasting-gewogen zwaartepunt ligt tussen de aansluitingen
    expect(advies.suggesties[0].x).toBeGreaterThan(0);
    expect(advies.suggesties[0].x).toBeLessThan(100);
  });

  it('schaalt het aantal stations met de belasting en N-1', () => {
    const veel = Array.from({ length: 10 }, (_, i) =>
      aansluiting(`a${i}`, i * 200, 0, 200),
    );
    const advies = adviseerStations({
      aansluitingen: veel,
      uitgangspunten: { ...defaultUitgangspunten(), groeifactor: 1, nMin1: true },
    });
    // 2000 kVA / (630·0.8) = 4 stations + 1 (N-1) = 5
    expect(advies.aantalStations).toBe(5);
  });

  it('snapt stations op het MS-tracé', () => {
    const advies = adviseerStations({
      aansluitingen: [aansluiting('a', 0, 100, 200), aansluiting('b', 100, 100, 200)],
      uitgangspunten: { ...defaultUitgangspunten(), groeifactor: 1, nMin1: false },
      msTraceLines: [[[0, 0, -1], [200, 0, -1]]],
    });
    expect(advies.suggesties[0].y).toBeCloseTo(0, 1);
  });

  it('waarschuwt bij te lange strengen', () => {
    const advies = adviseerStations({
      aansluitingen: [aansluiting('a', 0, 0, 100), aansluiting('b', 2500, 0, 100)],
      uitgangspunten: { ...defaultUitgangspunten(), groeifactor: 1, nMin1: false },
      lsKabel: { sectieMm2: 150, materiaal: 'Al' },
    });
    const alleWaarschuwingen = advies.suggesties.flatMap((s) => s.waarschuwingen);
    expect(alleWaarschuwingen.join(' ')).toContain('stranglengte');
  });
});
