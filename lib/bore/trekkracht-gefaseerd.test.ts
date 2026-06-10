import { describe, expect, it } from 'vitest';
import { berekenGefaseerdeTrekkracht } from './trekkracht-gefaseerd';

describe('gefaseerde HDD-trekkracht (ASTM F1962)', () => {
  const basis = {
    boorLengteM: 200,
    buisDiameterMm: 250,
    sdr: 11,
    entryAngleDeg: 12,
    exitAngleDeg: 10,
    boogstraalM: 250,
  };

  it('trekkracht neemt monotoon toe over de boorfasen', () => {
    const r = berekenGefaseerdeTrekkracht(basis);
    const [f1, f2, f3, f4] = r.fasen.map((f) => f.trekkrachtKN);
    expect(f2).toBeGreaterThan(f1);
    expect(f3).toBeGreaterThanOrEqual(f2);
    expect(f4).toBeGreaterThan(f3);
    expect(r.maxTrekkrachtKN).toBe(f4);
  });

  it('lege PE-buis in mud is opdrijvend (negatief effectief gewicht)', () => {
    // Handberekening D=0.25, t=D/11=0.0227:
    // A_wand = π(D·t − t²) = π(0.005682 − 0.000516) = 0.016228 m²
    // gewicht = 0.016228 × 960 × 9.81 ≈ 152.8 N/m
    // opdrijving = π/4 × 0.0625 × 1100 × 9.81 ≈ 529.7 N/m
    // w_eff ≈ −376.9 N/m
    const r = berekenGefaseerdeTrekkracht(basis);
    expect(r.effectiefGewichtNPerM).toBeLessThan(0);
    expect(r.effectiefGewichtNPerM).toBeCloseTo(-376.9, 0);
  });

  it('zwaardere mud verhoogt opdrijving en daarmee de trekkracht', () => {
    const licht = berekenGefaseerdeTrekkracht({ ...basis, mudDichtheid: 1050 });
    const zwaar = berekenGefaseerdeTrekkracht({ ...basis, mudDichtheid: 1200 });
    expect(zwaar.maxTrekkrachtKN).toBeGreaterThan(licht.maxTrekkrachtKN);
  });

  it('langere boring geeft hogere maximale trekkracht', () => {
    const kort = berekenGefaseerdeTrekkracht(basis);
    const lang = berekenGefaseerdeTrekkracht({ ...basis, boorLengteM: 600 });
    expect(lang.maxTrekkrachtKN).toBeGreaterThan(kort.maxTrekkrachtKN);
  });

  it('fase-afstanden volgen de boorgeometrie (boog + recht + boog)', () => {
    const r = berekenGefaseerdeTrekkracht(basis);
    // boogIn = 250 × 12° in rad ≈ 52.4 m
    expect(r.fasen[1].afstandM).toBeCloseTo(52.4, 0);
    expect(r.fasen[3].afstandM).toBe(200);
  });
});
