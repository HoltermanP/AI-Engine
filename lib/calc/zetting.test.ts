import { describe, expect, it } from 'vitest';
import { berekenZetting } from './zetting';

describe('zetting (Koppejan/NEN-Bjerrum vereenvoudigd)', () => {
  it('veenlaag: handberekening s = CR·H·log10(σ′v1/σ′v0)', () => {
    // 2 m veen, gws 0,5 m −mv, laagmidden z = 1,0 m:
    //   σ'_v0 = 0,5·10,5 (droog) + 0,5·(11−10) (nat) = 5,25 + 0,5 = 5,75 kPa
    //   σ'_v1 = 5,75 + 20 = 25,75 kPa
    //   s = 0,20·2·log10(25,75/5,75) = 0,4·0,65111 = 0,26044 m = 260,4 mm → rood
    const res = berekenZetting({
      lagen: [{ dikteM: 2, grondsoort: 'veen' }],
      extraBelastingKPa: 20,
      grondwaterstandM: 0.5,
    });
    expect(res.lagen[0].sigmaV0KPa).toBeCloseTo(5.75, 2);
    expect(res.lagen[0].sigmaV1KPa).toBeCloseTo(25.75, 2);
    expect(res.totaalMm).toBeCloseTo(260.4, 1);
    expect(res.stoplicht).toBe('rood');
    expect(res.conclusie).toContain('rood');
  });

  it('alleen-zand-pakket: zetting verwaarloosbaar (~0 mm) en stoplicht groen', () => {
    const res = berekenZetting({
      lagen: [{ dikteM: 3, grondsoort: 'zand' }],
      extraBelastingKPa: 20,
    });
    expect(res.totaalMm).toBeLessThan(2);
    expect(res.stoplicht).toBe('groen');
  });

  it('meerlaags pakket: zetting per laag en totaal (klei + veen)', () => {
    // Laag 1: 1 m klei, midden 0,5 m (droog): σ'_v0 = 0,5·16,5 = 8,25 kPa
    //   s1 = 0,075·1·log10(38,25/8,25) = 0,075·0,66618 = 49,96 mm
    // Laag 2: 3 m veen, midden 2,5 m:
    //   σ'_v0 = 0,5·16,5 + 0,5·(17−10) + 1,5·(11−10) = 8,25 + 3,5 + 1,5 = 13,25 kPa
    //   s2 = 0,20·3·log10(43,25/13,25) = 0,6·0,51375 = 308,25 mm
    const res = berekenZetting({
      lagen: [
        { dikteM: 1, grondsoort: 'klei' },
        { dikteM: 3, grondsoort: 'veen' },
      ],
      extraBelastingKPa: 30,
      grondwaterstandM: 0.5,
    });
    expect(res.lagen).toHaveLength(2);
    expect(res.lagen[0].zettingMm).toBeCloseTo(49.96, 1);
    expect(res.lagen[1].zettingMm).toBeCloseTo(308.26, 1);
    expect(res.totaalMm).toBeCloseTo(358.2, 1);
    expect(res.stoplicht).toBe('rood');
  });

  it('stoplichtgrenzen: < 30 mm groen, 30–100 mm oranje', () => {
    // Groen: 0,5 m klei, 10 kPa, gws 0,5: σ'_v0 = 0,25·16,5 = 4,125 kPa
    //   s = 0,075·0,5·log10(14,125/4,125) = 0,0375·0,53465 = 20,0 mm → groen
    const groen = berekenZetting({
      lagen: [{ dikteM: 0.5, grondsoort: 'klei' }],
      extraBelastingKPa: 10,
      grondwaterstandM: 0.5,
    });
    expect(groen.totaalMm).toBeCloseTo(20.0, 1);
    expect(groen.stoplicht).toBe('groen');

    // Oranje: 1 m klei, 30 kPa, gws 0,5 → 49,96 mm (zie meerlaagse test, laag 1)
    const oranje = berekenZetting({
      lagen: [{ dikteM: 1, grondsoort: 'klei' }],
      extraBelastingKPa: 30,
      grondwaterstandM: 0.5,
    });
    expect(oranje.totaalMm).toBeCloseTo(49.96, 1);
    expect(oranje.stoplicht).toBe('oranje');
    expect(oranje.conclusie).toContain('oranje');
  });

  it('diepere grondwaterstand verhoogt σ′v0 en verlaagt de zetting', () => {
    // 2 m veen, 20 kPa. Gws 2,0 m (laag volledig droog), midden 1,0 m:
    //   σ'_v0 = 1,0·10,5 = 10,5 kPa
    //   s = 0,20·2·log10(30,5/10,5) = 0,4·0,46311 = 185,2 mm (< 260,4 bij gws 0,5)
    const hoog = berekenZetting({
      lagen: [{ dikteM: 2, grondsoort: 'veen' }],
      extraBelastingKPa: 20,
      grondwaterstandM: 0.5,
    });
    const laag = berekenZetting({
      lagen: [{ dikteM: 2, grondsoort: 'veen' }],
      extraBelastingKPa: 20,
      grondwaterstandM: 2.0,
    });
    expect(laag.lagen[0].sigmaV0KPa).toBeCloseTo(10.5, 2);
    expect(laag.totaalMm).toBeCloseTo(185.24, 1);
    expect(laag.totaalMm).toBeLessThan(hoog.totaalMm);
  });
});
