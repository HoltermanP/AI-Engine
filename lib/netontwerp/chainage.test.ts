import { describe, expect, it } from 'vitest';
import {
  chainageVanPunt,
  lijnLengteM,
  puntOpChainage,
  snapNaarLijnen,
} from './chainage';
import type { TraceLine } from '@/lib/trace-edit';

const lijn: TraceLine = [
  [0, 0, -0.65],
  [100, 0, -0.65],
  [100, 50, -0.65],
];

describe('chainage', () => {
  it('berekent de lijnlengte', () => {
    expect(lijnLengteM(lijn)).toBeCloseTo(150, 5);
  });

  it('punt→chainage→punt is een round-trip (< 1 cm)', () => {
    const punt = puntOpChainage(lijn, 120);
    expect(punt).not.toBeNull();
    const terug = chainageVanPunt(lijn, punt!.x, punt!.y);
    expect(terug!.chainageM).toBeCloseTo(120, 2);
    expect(terug!.afstandM).toBeLessThan(0.01);
  });

  it('clampt chainage buiten de lijn', () => {
    expect(puntOpChainage(lijn, -10)!.x).toBeCloseTo(0, 5);
    const eind = puntOpChainage(lijn, 9999)!;
    expect(eind.x).toBeCloseTo(100, 5);
    expect(eind.y).toBeCloseTo(50, 5);
  });

  it('projecteert een vrij punt op het dichtstbijzijnde segment', () => {
    const hit = chainageVanPunt(lijn, 50, 10);
    expect(hit!.chainageM).toBeCloseTo(50, 2);
    expect(hit!.afstandM).toBeCloseTo(10, 2);
  });

  it('snapt naar de juiste lijn binnen de maximumafstand', () => {
    const lijnen = [lijn, [[0, 200, -0.65], [100, 200, -0.65]] as TraceLine];
    const snap = snapNaarLijnen(lijnen, 50, 190, 50);
    expect(snap!.lijnIndex).toBe(1);
    expect(snap!.y).toBeCloseTo(200, 5);
    expect(snapNaarLijnen(lijnen, 50, 120, 50)).toBeNull();
  });
});
