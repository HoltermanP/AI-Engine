import { describe, expect, it } from 'vitest';
import {
  berekenMudspanning,
  diepteProfiel,
  effectieveSpanningKpa,
  grondParametersUitGrondsoort,
  maxToelaatbareMuddrukKpa,
  minimaleMuddrukKpa,
  waterspanningKpa,
} from './mud';

describe('mud — spanningsopbouw', () => {
  it('waterspanning en effectieve spanning in zand', () => {
    // Handberekening: z = 6 m, grondwater op 1 m -mv, zand (gamma 18/20 kN/m³)
    //   u        = 9,81 · (6 - 1)            = 49,05 kPa
    //   sigma_v  = 18·1 + 20·5               = 118 kPa
    //   sigma'_v = 118 - 49,05               = 68,95 kPa
    const zand = grondParametersUitGrondsoort('zand');
    expect(waterspanningKpa(6, 1)).toBeCloseTo(49.05, 2);
    expect(effectieveSpanningKpa(6, 1, zand)).toBeCloseTo(68.95, 2);
  });

  it('minimale muddruk = statische kolom + circulatieverlies', () => {
    // Handberekening: z = 6 m, afstand 50 m, rho_mud = 1100 kg/m³:
    //   p_stat = 1100 · 9,81 · 6 / 1000 = 64,75 kPa
    //   p_min  = 64,75 + 10 (basis) + 0,05·50 (= 2,5) = 77,25 kPa
    expect(minimaleMuddrukKpa(6, 50)).toBeCloseTo(77.25, 1);
  });
});

describe('mud — maximaal toelaatbare druk (Luger & Hergarden)', () => {
  it('zand zonder cohesie, z = 6 m', () => {
    // Handberekening (zand: phi = 32,5°, c = 0, E = 25 MPa, nu = 0,33):
    //   u        = 49,05 kPa; sigma'_v = 68,95 kPa
    //   G        = 25000 / (2·1,33)                = 9398,5 kPa
    //   Q        = 68,95·sin(32,5°) / 9398,5       = 0,003942
    //   R0       = 0,475/2 = 0,2375 m; Rp,max = 0,5·6 = 3 m
    //   ratio    = (0,2375/3)² + Q = 0,006267 + 0,003942 = 0,010209
    //   exponent = -sin/(1+sin) = -0,5373/1,5373    = -0,34951
    //   factor   = 0,010209^-0,34951                = 4,9645
    //   p'_max   = 68,95 · 4,9645                   = 342,3 kPa
    //   p_max    = 49,05 + 342,3                    = 391,4 kPa
    const pMax = maxToelaatbareMuddrukKpa({
      diepteM: 6,
      grondwaterDiepteM: 1,
      grond: grondParametersUitGrondsoort('zand'),
      boorgatDiameterMm: 475,
    });
    expect(pMax).toBeCloseTo(391.4, 0);
  });

  it('klei met cohesie, z = 8 m', () => {
    // Handberekening (klei: phi = 22,5°, c = 10 kPa, E = 7 MPa):
    //   u        = 9,81·7 = 68,67 kPa
    //   sigma_v  = 16·1 + 17·7 = 135; sigma'_v = 66,33 kPa
    //   c·cot    = 10·2,41421 = 24,142 kPa
    //   G        = 7000/2,66 = 2631,6 kPa
    //   Q        = (66,33·0,38268 + 10·0,92388)/2631,6 = 0,013157
    //   Rp,max   = 4 m; ratio = (0,2375/4)² + Q = 0,003525 + 0,013157 = 0,016682
    //   exponent = -0,38268/1,38268 = -0,27677
    //   factor   = 0,016682^-0,27677 = 3,1048
    //   p'_max   = (66,33 + 24,142)·3,1048 - 24,142 = 256,8 kPa
    //   p_max    = 68,67 + 256,8 = 325,4 kPa
    const pMax = maxToelaatbareMuddrukKpa({
      diepteM: 8,
      grondwaterDiepteM: 1,
      grond: grondParametersUitGrondsoort('klei'),
      boorgatDiameterMm: 475,
    });
    expect(pMax).toBeCloseTo(325.4, 0);
  });

  it('zonder dekking is alleen waterspanning toelaatbaar', () => {
    const pMax = maxToelaatbareMuddrukKpa({
      diepteM: 0,
      grondwaterDiepteM: 1,
      grond: grondParametersUitGrondsoort('zand'),
      boorgatDiameterMm: 475,
    });
    expect(pMax).toBe(0);
  });
});

describe('mud — dieptelijnprofiel', () => {
  it('discretiseert met tangenten en horizontaal middendeel', () => {
    // tan(12°) = 0,21256 → op s = 5 m: diepte = 1,06 m; midden: maxdiepte 5 m
    const profiel = diepteProfiel(100, 5, 12, 12, 21);
    expect(profiel).toHaveLength(21);
    expect(profiel[0].diepteM).toBe(0);
    expect(profiel[20].diepteM).toBe(0);
    expect(profiel[1].diepteM).toBeCloseTo(1.06, 2); // s = 5 m
    expect(profiel[10].diepteM).toBe(5); // s = 50 m, geplafonneerd op maxdiepte
  });
});

describe('mud — volledige blow-out check', () => {
  it('diepe boring in zand voldoet', () => {
    const res = berekenMudspanning({
      lengteM: 200,
      maxDiepteOnderMvM: 8,
      entryAngleDeg: 12,
      exitAngleDeg: 12,
      grondwaterDiepteM: 1,
      dominantGrondsoort: 'zand',
      boorgatDiameterMm: 475,
    });
    expect(res.punten).toHaveLength(21);
    expect(res.voldoet).toBe(true);
    expect(res.minimaleMarge).toBeGreaterThanOrEqual(1);
    expect(res.kritischPunt).not.toBeNull();
    // intredepunt (diepte 0) ligt in de niet-getoetste in-/uittredezone
    expect(res.punten[0].getoetst).toBe(false);
    expect(res.conclusie).toContain('voldoet');
  });

  it('ondiepe boring in veen geeft blow-out risico (marge < 1, voldoet = false)', () => {
    // Handberekening kritisch punt (z = 1,5 m, veen: phi = 15°, c = 5 kPa, E = 2 MPa,
    // grondwater 0,5 m -mv):
    //   u        = 9,81·1,0 = 9,81 kPa
    //   sigma_v  = 11·0,5 + 12·1,0 = 17,5; sigma'_v = 7,69 kPa
    //   c·cot    = 5·3,73205 = 18,66 kPa; G = 2000/2,66 = 751,9 kPa
    //   Q        = (7,69·0,25882 + 5·0,96593)/751,9 = 0,009071
    //   Rp,max   = 0,75 m; ratio = (0,2375/0,75)² + Q = 0,10028 + 0,00907 = 0,10935
    //   exponent = -0,25882/1,25882 = -0,20560
    //   factor   = 0,10935^-0,20560 = 1,5763
    //   p_max    = 9,81 + (7,69+18,66)·1,5763 - 18,66 = 32,7 kPa
    //   p_max,d  = 32,7/1,5 = 21,8 kPa
    //   p_min (s = 30 m) = 1100·9,81·1,5/1000 + 10 + 0,05·30 = 27,7 kPa
    //   marge = 21,8/27,7 = 0,79 < 1,0 → voldoet niet
    const pMax = maxToelaatbareMuddrukKpa({
      diepteM: 1.5,
      grondwaterDiepteM: 0.5,
      grond: grondParametersUitGrondsoort('veen'),
      boorgatDiameterMm: 475,
    });
    expect(pMax).toBeCloseTo(32.7, 0);

    const res = berekenMudspanning({
      lengteM: 60,
      maxDiepteOnderMvM: 1.5,
      entryAngleDeg: 10,
      exitAngleDeg: 10,
      grondwaterDiepteM: 0.5,
      dominantGrondsoort: 'veen',
      boorgatDiameterMm: 475,
    });
    expect(res.voldoet).toBe(false);
    expect(res.minimaleMarge).toBeLessThan(1);
    expect(res.kritischPunt?.voldoet).toBe(false);
    expect(res.conclusie).toContain('Blow-out risico');
  });
});
