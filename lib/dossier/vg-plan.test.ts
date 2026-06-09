import { describe, expect, it } from 'vitest';
import { genereerVgPlan } from './vg-plan';

describe('V&G-plan ontwerpfase', () => {
  const basis = {
    projectNaam: 'Netverzwaring NOP',
    projectCode: 'NOP01',
    traceNaam: 'MS-tracé Espel',
    traceCode: 'TR-01',
    discipline: 'elektra_ms' as const,
    lengteM: 970,
    signalen: [],
    aantalBoringen: 0,
    nabijWater: false,
    datum: '2026-06-09',
  };

  it('bevat altijd de basisrisico\'s (graafschade, aanrijdgevaar, sleufstabiliteit)', () => {
    const plan = genereerVgPlan(basis);
    const themas = plan.risicos.map((r) => r.thema);
    expect(themas).toContain('Graafschade');
    expect(themas).toContain('Aanrijdgevaar');
    expect(themas).toContain('Sleufstabiliteit');
  });

  it('MS-discipline voegt BEI-signalering toe zonder werkinstructie te vervangen', () => {
    const plan = genereerVgPlan(basis);
    expect(plan.risicos.some((r) => r.thema.includes('Elektrische veiligheid'))).toBe(true);
    expect(plan.markdown).toContain('vervangt geen werkinstructie');
  });

  it('vult risico\'s aan op basis van quick-scan-signalen', () => {
    const plan = genereerVgPlan({
      ...basis,
      signalen: ['Verdachte bodemverontreiniging nabij chainage 400', 'NGE-risicogebied WO2'],
      aantalBoringen: 2,
      nabijWater: true,
    });
    const themas = plan.risicos.map((r) => r.thema);
    expect(themas).toContain('Verontreinigde grond');
    expect(themas).toContain('Niet-gesprongen explosieven');
    expect(themas).toContain('Boorwerkzaamheden (HDD)');
    expect(themas).toContain('Werken nabij water');
  });

  it('genereert documentcode in WVB-fase', () => {
    expect(genereerVgPlan(basis).docCode).toBe('NOP01-WVB-VGP-001-v1.0');
  });
});
