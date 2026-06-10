import { describe, expect, it } from 'vitest';
import { genereerKabeltrekplan } from './kabeltrekplan';

const input = {
  projectCode: 'NOP01',
  projectNaam: 'Netverzwaring NOP',
  traceCode: 'TR-01',
  traceNaam: 'MS-tracé Espel',
  kabelOmschrijving: '3×1×240 Al 10 kV XLPE',
  kabel: {
    massaKgPerM: 3 * 2.8,
    diameterMm: 35,
    maxTrekkrachtKN: 30,
    maxSWPkNperM: 3,
  },
  datum: '2026-06-09',
  trekvakken: [
    {
      naam: 'TV-1',
      vanLocatie: 'Station Espel',
      totLocatie: 'Mof nabij Espelerweg 12',
      secties: [
        { type: 'recht' as const, lengteM: 400 },
        { type: 'bocht' as const, hoekDeg: 90, radiusM: 6 },
        { type: 'recht' as const, lengteM: 250 },
      ],
    },
  ],
};

describe('kabeltrekplan', () => {
  const plan = genereerKabeltrekplan(input);

  it('genereert documentcode WVB-PLN en één trekvak', () => {
    expect(plan.docCode).toBe('NOP01-WVB-PLN-002-v1.0');
    expect(plan.trekvakken).toHaveLength(1);
  });

  it('kiest haspel- en lierlocatie op basis van de adviesrichting', () => {
    const vak = plan.trekvakken[0];
    if (vak.berekening.adviesRichting === 'heen') {
      expect(vak.haspelLocatie).toBe('Station Espel');
      expect(vak.lierLocatie).toBe('Mof nabij Espelerweg 12');
    } else {
      expect(vak.haspelLocatie).toBe('Mof nabij Espelerweg 12');
      expect(vak.lierLocatie).toBe('Station Espel');
    }
  });

  it('maakt een rollenplan voor de bocht', () => {
    const vak = plan.trekvakken[0];
    expect(vak.rollenplan).toHaveLength(1);
    expect(vak.rollenplan[0]).toContain('hoekrollen');
    // Booglengte 90° R6 ≈ 9,4 m → 5 rollen
    expect(vak.rollenplan[0]).toContain('5 hoekrollen');
  });

  it('markdown bevat trekkrachttoets en communicatieplan', () => {
    expect(plan.markdown).toContain('F_max berekend');
    expect(plan.markdown).toContain('Communicatieplan');
    expect(plan.markdown).toContain('30 kN');
  });

  it('treklengte = som rechte stukken + booglengtes', () => {
    // 400 + 9,42 + 250 ≈ 659,4 m
    expect(plan.trekvakken[0].treklengteM).toBeCloseTo(659.4, 0);
  });
});
