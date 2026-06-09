import { describe, expect, it } from 'vitest';
import { berekenKabeltrek, MAX_SWP_MS_KN_PER_M, MU_ROLLEN } from './kabeltrek';

describe('kabeltrek', () => {
  it('recht stuk: ΔF = μ·w·g·L (handberekening)', () => {
    // F = 0,4 · 5 kg/m · 9,81 m/s² · 100 m = 1962 N = 1,962 kN
    const res = berekenKabeltrek({
      secties: [{ type: 'recht', lengteM: 100 }],
      kabel: { massaKgPerM: 5, diameterMm: 50, maxTrekkrachtKN: 12 },
    });
    expect(res.heen.secties[0].fInKN).toBe(0);
    expect(res.heen.secties[0].fUitKN).toBeCloseTo(1.962, 3);
    expect(res.voldoet).toBe(true);
    expect(res.maxTrekkrachtToelaatbaarKN).toBe(12);
  });

  it('bocht zonder voorspanning: alleen gewichtsbijdrage over de booglengte', () => {
    // F_in = 0 → capstanterm vervalt: F_uit = μ·w·g·L_boog
    // L_boog = (90°→π/2)·R = (π/2)·2 = π m; F_uit = 0,4·5·9,81·π = 61,64 N
    // SWP = F_uit/R = 0,0616/2 = 0,0308 kN/m (ruim onder 3 kN/m)
    const res = berekenKabeltrek({
      secties: [{ type: 'bocht', hoekDeg: 90, radiusM: 2 }],
      kabel: { massaKgPerM: 5, diameterMm: 50, maxTrekkrachtKN: 12 },
    });
    const s = res.heen.secties[0];
    expect(s.fUitKN).toBeCloseTo(0.06164, 4);
    expect(s.swpKNperM).toBeCloseTo(0.03082, 4);
    expect(s.voldoet).toBe(true);
  });

  it('capstan-vergelijking in bocht na recht stuk (handberekening)', () => {
    // Recht 200 m: F = 0,4·5·9,81·200 = 3924 N
    // Bocht 90° R=1: e^(0,4·π/2) = e^0,6283 = 1,87446
    //   F_uit = 3924·1,87446 + 0,4·5·9,81·(π/2·1) = 7355,4 + 30,8 = 7386,2 N
    //   SWP = 7,386/1 = 7,39 kN/m > 3 kN/m → sectie voldoet niet
    const res = berekenKabeltrek({
      secties: [
        { type: 'recht', lengteM: 200 },
        { type: 'bocht', hoekDeg: 90, radiusM: 1 },
      ],
      kabel: { massaKgPerM: 5, diameterMm: 50, maxTrekkrachtKN: 12 },
    });
    const bocht = res.heen.secties[1];
    expect(bocht.fUitKN).toBeCloseTo(7.3862, 3);
    expect(bocht.swpKNperM).toBeCloseTo(7.3862, 3);
    expect(bocht.voldoet).toBe(false);
    expect(res.heen.swpVoldoet).toBe(false);
    // In de terugrichting ligt de bocht aan het begin (F_in ≈ 0) → SWP wél ok
    expect(res.terug.swpVoldoet).toBe(true);
    expect(res.adviesRichting).toBe('terug');
    expect(res.voldoet).toBe(true);
  });

  it('te kleine radius midden in symmetrisch tracé: SWP-overschrijding in beide richtingen', () => {
    const res = berekenKabeltrek({
      secties: [
        { type: 'recht', lengteM: 200 },
        { type: 'bocht', hoekDeg: 90, radiusM: 1 },
        { type: 'recht', lengteM: 200 },
      ],
      kabel: { massaKgPerM: 5, diameterMm: 50, maxTrekkrachtKN: 12 },
    });
    expect(res.heen.swpVoldoet).toBe(false);
    expect(res.terug.swpVoldoet).toBe(false);
    expect(res.voldoet).toBe(false);
    expect(res.advies).toContain('zijwaartse druk');
    expect(res.advies).toContain('bochtstraal');
    expect(res.maxSWPToelaatbaarKNperM).toBe(MAX_SWP_MS_KN_PER_M);
  });

  it('adviseert de trekrichting met de laagste maximale trekkracht', () => {
    // Bocht aan het begin: capstan werkt op de lage voorspanning (1 kN).
    // Heen:  bocht eerst → F = 1000·1,87446 + 123,3 = 1997,7 N; + recht 300 m
    //        (5886 N) → max 7883,7 N
    // Terug: recht eerst → 6886 N de bocht in → 6886·1,87446 + 123,3 = 13030,8 N
    const res = berekenKabeltrek({
      secties: [
        { type: 'bocht', hoekDeg: 90, radiusM: 4 },
        { type: 'recht', lengteM: 300 },
      ],
      kabel: { massaKgPerM: 5, diameterMm: 50, maxTrekkrachtKN: 12 },
      voorspanningKN: 1,
    });
    expect(res.heen.maxTrekkrachtKN).toBeCloseTo(7.8837, 3);
    expect(res.terug.maxTrekkrachtKN).toBeCloseTo(13.0308, 3);
    expect(res.adviesRichting).toBe('heen');
    expect(res.terug.trekkrachtVoldoet).toBe(false);
    expect(res.voldoet).toBe(true);
  });

  it('bij overschrijding: locatie treklimiet en advies tussentrekput', () => {
    // Recht 1000 m, w = 8 kg/m, μ = 0,4 → F_eind = 0,4·8·9,81·1000 = 31392 N
    // Limiet 10 kN bereikt op s = 10000/(0,4·8·9,81) = 318,55 m
    const res = berekenKabeltrek({
      secties: [{ type: 'recht', lengteM: 1000 }],
      kabel: { massaKgPerM: 8, diameterMm: 60, maxTrekkrachtKN: 10 },
    });
    expect(res.voldoet).toBe(false);
    expect(res.heen.maxTrekkrachtKN).toBeCloseTo(31.392, 3);
    expect(res.heen.limietBereiktOpM).toBeCloseTo(318.55, 1);
    expect(res.advies).toContain('tussentrekput');
    expect(res.advies).toContain('319 m');
  });

  it('leidt de toelaatbare trekkracht af uit de geleiderdoorsnede (50 N/mm² Cu)', () => {
    // 240 mm² × 50 N/mm² = 12000 N = 12 kN
    const res = berekenKabeltrek({
      secties: [{ type: 'recht', lengteM: 50 }],
      kabel: { massaKgPerM: 5, diameterMm: 50, geleiderDoorsnedeMm2: 240 },
      mu: MU_ROLLEN,
    });
    expect(res.maxTrekkrachtToelaatbaarKN).toBe(12);
    // μ = 0,2 op rollen: F = 0,2·5·9,81·50 = 490,5 N
    expect(res.heen.secties[0].fUitKN).toBeCloseTo(0.4905, 4);

    expect(() =>
      berekenKabeltrek({
        secties: [{ type: 'recht', lengteM: 50 }],
        kabel: { massaKgPerM: 5, diameterMm: 50 },
      })
    ).toThrow(/maxTrekkrachtKN|geleiderDoorsnedeMm2/);
  });
});
