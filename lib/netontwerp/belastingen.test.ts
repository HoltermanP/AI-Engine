import { describe, expect, it } from 'vitest';
import {
  belastingKVA,
  maxStrengLengteLsM,
  stroomUitKVA,
  totaalBelastingKVA,
} from './belastingen';
import type { Aansluiting } from './types';

const woningen: Aansluiting = {
  id: 'a1',
  naam: 'Woningen',
  type: 'woning',
  aantal: 48,
  kVAPerStuk: 4,
  gelijktijdigheid: 0.4,
  x: 0,
  y: 0,
  netvlak: 'LS',
};

describe('belastingen', () => {
  it('berekent belasting met gelijktijdigheid', () => {
    // 48 × 4 kVA × 0.4 = 76.8 kVA
    expect(belastingKVA(woningen)).toBeCloseTo(76.8, 3);
  });

  it('past de groeifactor toe en filtert op netvlak', () => {
    const msAansluiting: Aansluiting = { ...woningen, id: 'a2', netvlak: 'MS' };
    const totaalLs = totaalBelastingKVA([woningen, msAansluiting], {
      netvlak: 'LS',
      groeifactor: 1.3,
    });
    expect(totaalLs).toBeCloseTo(76.8 * 1.3, 3);
  });

  it('rekent kVA om naar stroom (LS 400 V)', () => {
    // 100 kVA / (√3 · 400) ≈ 144.3 A
    expect(stroomUitKVA(100, 'LS')).toBeCloseTo(144.3, 0);
  });

  it('berekent de maximale stranglengte uit de spanningsvalgrens', () => {
    const lengte = maxStrengLengteLsM(144, 240, 5, 'Al');
    // L = 0.05·400·240 / (√3·144·0.028·0.9) ≈ 764 m
    expect(lengte).toBeGreaterThan(700);
    expect(lengte).toBeLessThan(850);
  });
});
