import { describe, expect, it } from 'vitest';
import { boreProfilePoints } from './bore-profile';
import { generateBoreDrawings } from './bore-index';
import { maxDiepteNap, minBoogstraalM } from '@/lib/bore/formulas';
import { runBoreEngineering, heeftSleuflozeSegmenten } from '@/lib/bore';
import { DEMO_TRACES } from '@/demo/traces';
import type { BoreTrajectory } from '@/lib/bore/types';

function trajectory(maaiveldNap: number, dekking: number): BoreTrajectory {
  const R = minBoogstraalM(125, 'hdd');
  return {
    entryAngleDeg: 12,
    exitAngleDeg: 12,
    maxDiepteNap: maxDiepteNap(maaiveldNap, -0.75, R, 12, dekking, 125, 'hdd'),
    boogstraalM: R,
    booglengteM: 0,
    entryPutL: 12,
    exitPutL: 12,
    entryPutB: 5,
    exitPutB: 5,
    entryPutD: 2.6,
    exitPutD: 2.6,
  };
}

describe('maxDiepteNap', () => {
  it('volgt uit vereiste dekking + marge, niet uit een willekeurige R-fractie', () => {
    const diepte = maxDiepteNap(-0.18, -0.75, 93.75, 12, 0.8, 125, 'hdd');
    // 0.8 dekking + 1.2 marge + 0.125 buis = 2.125 m onder mv, maar boogdrop
    // R(1−cos 12°) ≈ 2.05 m is kleiner → diepte ≈ −0.18 − 2.13 = −2.31 m NAP
    expect(diepte).toBeLessThan(-2);
    expect(diepte).toBeGreaterThan(-3);
  });

  it('gaat nooit naar −7 m voor een standaard LS-boring', () => {
    const diepte = maxDiepteNap(-0.18, -0.75, 93.75, 12, 0.6, 125, 'hdd');
    expect(diepte).toBeGreaterThan(-4);
  });
});

describe('volledige boortekeningen-pijplijn (regressie validator)', () => {
  it('genereert geldige tekeningen voor alle demo-tracés met sleufloze segmenten', () => {
    const boorTraces = DEMO_TRACES.filter((t) => heeftSleuflozeSegmenten(t));
    expect(boorTraces.length).toBeGreaterThan(0);
    for (const trace of boorTraces) {
      const engineering = runBoreEngineering(trace);
      // generateBoreDrawings draait valideerTekening en gooit bij ontbrekende
      // verplichte elementen (zoals "Boogtraject") — mag dus nooit throwen
      const tekeningen = generateBoreDrawings(trace, engineering);
      expect(tekeningen.length, trace.code).toBeGreaterThan(0);
    }
  });
});

describe('boreProfilePoints', () => {
  it('heeft een horizontaal deel op ontwerpdiepte (geen V-vorm)', () => {
    const maaiveld = -0.18;
    const traj = trajectory(maaiveld, 0.8);
    const punten = boreProfilePoints(traj, 300, maaiveld);

    const opDiepte = punten.filter(([, z]) => Math.abs(z - traj.maxDiepteNap) < 0.05);
    expect(opDiepte.length).toBeGreaterThanOrEqual(2);
    // Het vlakke deel beslaat een substantieel horizontaal bereik
    const chainages = opDiepte.map(([s]) => s);
    expect(Math.max(...chainages) - Math.min(...chainages)).toBeGreaterThan(100);
  });

  it('begint en eindigt op maaiveld over de volledige lengte', () => {
    const maaiveld = -0.18;
    const traj = trajectory(maaiveld, 0.8);
    const punten = boreProfilePoints(traj, 300, maaiveld);
    expect(punten[0]).toEqual([0, maaiveld]);
    expect(punten[punten.length - 1][0]).toBeCloseTo(300, 1);
    expect(punten[punten.length - 1][1]).toBeCloseTo(maaiveld, 2);
  });

  it('gaat nergens dieper dan de ontwerpdiepte', () => {
    const maaiveld = -0.18;
    const traj = trajectory(maaiveld, 0.8);
    const punten = boreProfilePoints(traj, 500, maaiveld);
    for (const [, z] of punten) {
      expect(z).toBeGreaterThanOrEqual(traj.maxDiepteNap - 0.01);
      expect(z).toBeLessThanOrEqual(maaiveld + 0.01);
    }
  });

  it('schaalt de diepte terug bij korte boringen zonder knikken', () => {
    const maaiveld = -0.18;
    const traj = trajectory(maaiveld, 0.8);
    const punten = boreProfilePoints(traj, 20, maaiveld);
    expect(punten[0]).toEqual([0, maaiveld]);
    expect(punten[punten.length - 1][0]).toBeCloseTo(20, 1);
    // monotone chainage
    for (let i = 1; i < punten.length; i++) {
      expect(punten[i][0]).toBeGreaterThanOrEqual(punten[i - 1][0] - 0.01);
    }
  });
});
