import { describe, expect, it } from 'vitest';
import { berekenAmpacity } from './thermisch';

describe('thermisch (IEC 60287 vereenvoudigd)', () => {
  it('referentie: 10 kV 3×1 Al 240 mm² XLPE driehoek, ρ=1,0, diepte 1,0 m → 400–450 A', () => {
    // Handberekening (IEC 60287-1-1 / 60287-2-1, vereenvoudigd):
    // R_dc20 = 0,125 Ω/km (IEC 60228); R_dc90 = 0,125e-3·(1+0,00403·70) = 1,60263e-4 Ω/m
    // Skin: xs² = 8π·50·1e-7/1,60263e-4 = 0,78414; ys = xs⁴/(192+0,8·xs⁴) = 0,003194
    // R_ac = 1,60263e-4·1,003194 = 1,60775e-4 Ω/m (= 0,1608 Ω/km)
    // Geometrie: dc = 2√(240/π) = 17,481 mm; t_iso = 3,4+1,0 = 4,4 mm;
    //   D_iso = 26,281 mm; D_scherm = 27,481 mm; De = 32,481 mm
    // T1 = (3,5/2π)·ln(1+8,8/17,481) = 0,55704·ln(1,50341) = 0,22713 K·m/W
    // T3 = 0,55704·ln(1+5/27,481) = 0,55704·ln(1,18194) = 0,09312 K·m/W
    // T4 eigen = (1,0/2π)·ln(4·1,0/0,032481) = 0,159155·4,81340 = 0,76608
    // T4 buren (2× rakend, s = De): 2·0,159155·ln(√(4+s²)/s) = 2·0,159155·4,12037 = 1,31156
    // T4 = 0,76608 + 1,31156 = 2,07764 K·m/W
    // I = √( (90−15) / (1,60775e-4·(0,22713+0,09312+2,07764)) )
    //   = √(75/3,8556e-4) = √194.522 = 441,0 A
    const res = berekenAmpacity({
      geleiderMm2: 240,
      materiaal: 'Al',
      legpatroon: 'driehoek',
      spanningKV: 10,
      rhoBodemKmPerW: 1.0,
      legdiepteM: 1.0,
    });
    expect(res.ampacityA).toBeGreaterThanOrEqual(400);
    expect(res.ampacityA).toBeLessThanOrEqual(450);
    expect(res.ampacityA).toBeCloseTo(441, 0);
    expect(res.normReferentie).toContain('IEC 60287');
  });

  it('tussenresultaten referentiegeval komen overeen met de handberekening', () => {
    const res = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'driehoek' });
    expect(res.rAcOhmPerKm).toBeCloseTo(0.161, 3); // 0,1608 Ω/km afgerond
    expect(res.t1).toBeCloseTo(0.22713, 4);
    expect(res.t2).toBe(0);
    expect(res.t3).toBeCloseTo(0.09312, 4);
    expect(res.t4).toBeCloseTo(2.07764, 4);
    expect(res.geometrie.deMm).toBeCloseTo(32.481, 2);
    // De bodem is veruit de grootste thermische weerstand
    expect(res.dominanteWeerstand).toBe('T4 (bodem)');
  });

  it('droge bodem (ρ=2,5) geeft duidelijk lagere ampacity dan natte (ρ=1,0)', () => {
    const nat = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'driehoek' });
    const droog = berekenAmpacity({
      geleiderMm2: 240,
      materiaal: 'Al',
      legpatroon: 'driehoek',
      rhoBodemKmPerW: 2.5,
    });
    expect(droog.ampacityA).toBeLessThan(nat.ampacityA);
    // T4 schaalt lineair met ρ; ampacity zakt van 441 naar ca. 291 A
    expect(droog.ampacityA).toBeCloseTo(291, 0);
  });

  it('vlakke ligging (0,25 m hart-op-hart) koelt beter dan rakend driehoek', () => {
    const driehoek = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'driehoek' });
    const vlak = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'vlak' });
    // Grotere fase-afstand → kleinere onderlinge verwarming → hogere ampacity
    expect(vlak.ampacityA).toBeGreaterThan(driehoek.ampacityA);
  });

  it('bundeling: >2 circuits geeft derating-percentage en signalering', () => {
    const twee = berekenAmpacity({
      geleiderMm2: 240,
      materiaal: 'Al',
      legpatroon: 'driehoek',
      aantalCircuits: 2,
    });
    const drie = berekenAmpacity({
      geleiderMm2: 240,
      materiaal: 'Al',
      legpatroon: 'driehoek',
      aantalCircuits: 3,
    });
    expect(twee.deratingPct).toBeGreaterThan(0);
    expect(twee.bundelSignalering).toBeUndefined(); // signalering pas bij > 2 circuits
    expect(drie.deratingPct).toBeGreaterThan(twee.deratingPct ?? 0);
    expect(drie.bundelSignalering).toContain('derating');
    expect(drie.ampacityA).toBeLessThan(twee.ampacityA);
  });

  it('Cu heeft hogere ampacity dan Al; > 20 kV valt buiten geldigheid (W_d = 0)', () => {
    const al = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'driehoek' });
    const cu = berekenAmpacity({ geleiderMm2: 240, materiaal: 'Cu', legpatroon: 'driehoek' });
    // R_dc20 Cu 0,0754 vs Al 0,125 Ω/km → ca. √(verhouding) hogere stroom
    expect(cu.ampacityA).toBeGreaterThan(al.ampacityA);
    expect(() =>
      berekenAmpacity({ geleiderMm2: 240, materiaal: 'Al', legpatroon: 'driehoek', spanningKV: 30 })
    ).toThrow(/20 kV/);
  });
});
