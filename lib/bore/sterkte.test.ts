import { describe, expect, it } from 'vitest';
import {
  berekenSterkte,
  buigspanningMpa,
  externeDrukIntrekkenKpa,
  kritischeBuckdrukKpa,
  wandOppervlakM2,
} from './sterkte';

describe('sterkte — buckling', () => {
  it('kritische externe druk SDR 11 (handberekening)', () => {
    // Handberekening: p_cr = 2·E/(1-nu²) · (1/(SDR-1))³
    //   = 2·1100/(1-0,16) · (1/10)³ = 2619,05·0,001 MPa ≈ 2,619 MPa = 2619 kPa
    expect(kritischeBuckdrukKpa(1100, 0.4, 11)).toBeCloseTo(2619.05, 1);
  });

  it('externe druk tijdens intrekken = mudkolom + circulatietoeslag', () => {
    // Handberekening: z = 6 m, rho = 1100 kg/m³:
    //   p_ext = 1100·9,81·6/1000 + 10 = 64,75 + 10 = 74,75 kPa
    expect(externeDrukIntrekkenKpa(6, 1100, 10)).toBeCloseTo(74.75, 1);
  });

  it('hoge SDR op grote diepte zakt onder veiligheidsfactor 2,0', () => {
    // Handberekening SDR 26: p_cr = 2619,05/(25/10)³... beter direct:
    //   p_cr = 2·1100/0,84 · (1/25)³ = 2619,05/15,625 kPa-schaal = 167,6 kPa
    //   z = 12 m: p_ext = 1100·9,81·12/1000 + 10 = 139,5 kPa
    //   SF = 167,6/139,5 = 1,20 < 2,0 → buckling voldoet niet
    const res = berekenSterkte({
      buisDiameterMm: 400,
      sdr: 26,
      trekkrachtKN: 50,
      boogstraalM: 300,
      diepteM: 12,
      grondwaterDiepteM: 1,
    });
    expect(res.pCrKpa).toBeCloseTo(167.6, 0);
    expect(res.bucklingSF).toBeCloseTo(1.2, 1);
    expect(res.bucklingVoldoet).toBe(false);
    expect(res.voldoet).toBe(false);
  });
});

describe('sterkte — axiaal + buiging', () => {
  it('wanddoorsnede en trekspanning D400 SDR11 (handberekening)', () => {
    // Handberekening: t = 400/11 = 36,36 mm
    //   A = pi·t·(D-t) = pi·0,036364·(0,4-0,036364) = 0,041542 m²
    //   F = 300 kN → sigma = 300/0,041542/1000 = 7,22 MPa
    expect(wandOppervlakM2(400, 11)).toBeCloseTo(0.041542, 5);
    const res = berekenSterkte({
      buisDiameterMm: 400,
      trekkrachtKN: 300,
      boogstraalM: 300,
      diepteM: 6,
      grondwaterDiepteM: 1,
    });
    expect(res.sigmaTrekMpa).toBeCloseTo(7.22, 2);
  });

  it('buigspanning in de boog (handberekening)', () => {
    // Handberekening: sigma_b = E·D/(2R) = 1100·0,4/(2·300) = 0,733 MPa
    expect(buigspanningMpa(1100, 400, 300)).toBeCloseTo(0.733, 3);
  });

  it('combinatiecheck D400 SDR11, F = 300 kN, R = 300 m voldoet', () => {
    // Handberekening: UC = (7,22 + 0,733)/12 = 0,66 <= 1,0
    const res = berekenSterkte({
      buisDiameterMm: 400,
      trekkrachtKN: 300,
      boogstraalM: 300,
      diepteM: 6,
      grondwaterDiepteM: 1,
    });
    expect(res.unityCheck).toBeCloseTo(0.66, 2);
    expect(res.unityVoldoet).toBe(true);
    expect(res.bucklingVoldoet).toBe(true);
    expect(res.voldoet).toBe(true);
    expect(res.conclusie).toContain('voldoet');
  });

  it('te hoge trekkracht op kleine buis faalt op unity check', () => {
    // Handberekening: D = 200, t = 18,18 mm, A = pi·0,018182·0,181818 = 0,010386 m²
    //   sigma = 600/0,010386/1000 = 57,8 MPa; sigma_b = 1100·0,2/300 = 0,733 MPa
    //   UC = (57,8 + 0,733)/12 = 4,88 > 1,0 → voldoet niet
    const res = berekenSterkte({
      buisDiameterMm: 200,
      trekkrachtKN: 600,
      boogstraalM: 150,
      diepteM: 6,
      grondwaterDiepteM: 1,
    });
    expect(res.unityCheck).toBeCloseTo(4.88, 1);
    expect(res.unityVoldoet).toBe(false);
    expect(res.voldoet).toBe(false);
  });
});
