import { describe, expect, it } from 'vitest';
import {
  berekenZetting,
  defaultVolumeVerlies,
  trogbreedteFactor,
} from './zetting';

describe('zetting — parameters per grondsoort', () => {
  it('trogbreedtefactor K en default volumeverlies', () => {
    expect(trogbreedteFactor('zand')).toBe(0.5);
    expect(trogbreedteFactor('klei')).toBe(0.7);
    expect(trogbreedteFactor('veen')).toBe(0.7);
    expect(defaultVolumeVerlies('zand')).toBe(0.01);
    expect(defaultVolumeVerlies('klei')).toBe(0.02);
    expect(defaultVolumeVerlies('veen')).toBe(0.03);
  });
});

describe('zetting — volumeverlies-methode', () => {
  it('diepe boring in zand: verwaarloosbare zetting (handberekening)', () => {
    // Handberekening: boorgat 475 mm → R = 0,2375 m; z0 = 6 m, zand:
    //   K = 0,5 → i = 0,5·6 = 3 m
    //   S_max = V·pi·R²/(sqrt(2·pi)·i)
    //         = 0,01·pi·0,2375²/(2,50663·3)
    //         = 0,0017721/7,51988 = 2,357e-4 m ≈ 0,24 mm → groen
    const res = berekenZetting({
      boorgatDiameterMm: 475,
      diepteAsM: 6,
      dominantGrondsoort: 'zand',
    });
    expect(res.iM).toBeCloseTo(3, 2);
    expect(res.sMaxMm).toBeCloseTo(0.2, 1);
    expect(res.trogBreedteM).toBeCloseTo(15, 1); // 5·i
    expect(res.beoordeling).toBe('groen');
    expect(res.voldoet).toBe(true);
  });

  it('klei gebruikt K = 0,7 en 2% volumeverlies (handberekening)', () => {
    // Handberekening: boorgat 600 mm → R = 0,3 m; z0 = 4 m, klei:
    //   i = 0,7·4 = 2,8 m
    //   S_max = 0,02·pi·0,09/(2,50663·2,8) = 0,0056549/7,01857 = 8,06e-4 m ≈ 0,8 mm
    const res = berekenZetting({
      boorgatDiameterMm: 600,
      diepteAsM: 4,
      dominantGrondsoort: 'klei',
    });
    expect(res.iM).toBeCloseTo(2.8, 2);
    expect(res.sMaxMm).toBeCloseTo(0.8, 1);
    expect(res.beoordeling).toBe('groen');
  });

  it('ondiepe grote boring met hoog volumeverlies: oranje (handberekening)', () => {
    // Handberekening: boorgat 1000 mm → R = 0,5 m; z0 = 2 m, zand → i = 1 m
    //   V = 5%: S_max = 0,05·pi·0,25/(2,50663·1) = 0,0392699/2,50663
    //         = 0,015667 m ≈ 15,7 mm → oranje (10–25 mm)
    const res = berekenZetting({
      boorgatDiameterMm: 1000,
      diepteAsM: 2,
      dominantGrondsoort: 'zand',
      volumeVerliesFractie: 0.05,
    });
    expect(res.sMaxMm).toBeCloseTo(15.7, 1);
    expect(res.beoordeling).toBe('oranje');
    expect(res.voldoet).toBe(true);
    expect(res.conclusie).toContain('monitoring');
  });

  it('extreem volumeverlies: rood en voldoet = false (handberekening)', () => {
    // Handberekening: zelfde geometrie, V = 9%:
    //   S_max = 0,09·pi·0,25/(2,50663·1) = 0,070686/2,50663 = 0,0282 m ≈ 28,2 mm → rood
    const res = berekenZetting({
      boorgatDiameterMm: 1000,
      diepteAsM: 2,
      dominantGrondsoort: 'zand',
      volumeVerliesFractie: 0.09,
    });
    expect(res.sMaxMm).toBeCloseTo(28.2, 1);
    expect(res.beoordeling).toBe('rood');
    expect(res.voldoet).toBe(false);
    expect(res.conclusie).toContain('ontoelaatbaar');
  });
});
