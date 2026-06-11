import { describe, expect, it } from 'vitest';
import { KABEL_CATALOGUS, vindKabelAdvies } from './kabel-catalogus';
import { parseNetType } from '@/lib/calc/parse';

describe('kabel-catalogus', () => {
  it('labels zijn parse.ts-compatibel (sectie + materiaal herleidbaar)', () => {
    for (const kabel of KABEL_CATALOGUS) {
      const discipline = kabel.netvlak === 'LS' ? 'elektra_ls' : 'elektra_ms';
      const parsed = parseNetType(kabel.label, discipline);
      expect(parsed.sectieMm2, kabel.label).toBe(kabel.sectieMm2);
    }
  });

  it('adviseert 240 Al voor 48 woningen over 400 m binnen 5% spanningsval', () => {
    // 48 woningen × 4 kVA × g=0.4 × groei 1.3 ≈ 100 kVA → ≈ 144 A
    const advies = vindKabelAdvies({
      netvlak: 'LS',
      belastingA: 144,
      lengteM: 400,
      maxSpanningsvalPct: 5,
    });
    expect(advies.voldoet).toBe(true);
    expect(advies.advies.sectieMm2).toBeLessThanOrEqual(240);
    expect(advies.spanningsvalPct).toBeLessThanOrEqual(5);
    expect(advies.belastingsgraadPct).toBeLessThanOrEqual(80);
  });

  it('adviseert een zwaardere kabel bij lange strengen', () => {
    const kort = vindKabelAdvies({ netvlak: 'LS', belastingA: 144, lengteM: 100, maxSpanningsvalPct: 5 });
    const lang = vindKabelAdvies({ netvlak: 'LS', belastingA: 144, lengteM: 700, maxSpanningsvalPct: 5 });
    expect(lang.advies.sectieMm2).toBeGreaterThanOrEqual(kort.advies.sectieMm2);
  });

  it('waarschuwt wanneer geen kabel voldoet', () => {
    const advies = vindKabelAdvies({
      netvlak: 'LS',
      belastingA: 800,
      lengteM: 1500,
      maxSpanningsvalPct: 5,
    });
    expect(advies.voldoet).toBe(false);
    expect(advies.motivatie).toContain('extra');
  });

  it('filtert MS-kabels op spanningsniveau', () => {
    const advies = vindKabelAdvies({
      netvlak: 'MS',
      belastingA: 180,
      lengteM: 2000,
      maxSpanningsvalPct: 5,
      spanningKV: 20,
    });
    expect(advies.advies.label.startsWith('20kV')).toBe(true);
  });
});
