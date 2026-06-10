import { describe, expect, it } from 'vitest';
import { berekenVergunningDoorlooptijd, deriveVergunningen } from './vergunningen';

const geen = {
  kruistWater: false,
  kruistPrimaireWaterkering: false,
  kruistSpoor: false,
  kruistRijksweg: false,
  inNatura2000: false,
  inArcheologischVerwachtingsgebied: false,
  privaatTerrein: false,
  openbareGrondGemeente: false,
};

describe('vergunningenplanning (Omgevingswet)', () => {
  it('eenvoudig tracé in openbare grond → alleen AVOI-instemming, regulier 8 weken', () => {
    const items = deriveVergunningen({ ...geen, openbareGrondGemeente: true });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('avoi_instemming');
    expect(items[0].termijnWeken).toBe(8);
    expect(items[0].procedure).toBe('regulier');
  });

  it('primaire waterkering → uitgebreide procedure 26 weken', () => {
    const items = deriveVergunningen({ ...geen, kruistPrimaireWaterkering: true });
    expect(items[0].procedure).toBe('uitgebreid');
    expect(items[0].termijnWeken).toBe(26);
    expect(items[0].grondslag).toContain('NEN 3651');
  });

  it('gewone watergang → reguliere watervergunning 8 weken', () => {
    const items = deriveVergunningen({ ...geen, kruistWater: true });
    expect(items[0].procedure).toBe('regulier');
    expect(items[0].termijnWeken).toBe(8);
  });

  it('Natura 2000 → uitgebreid met stikstof/AERIUS-signalering', () => {
    const items = deriveVergunningen({ ...geen, inNatura2000: true });
    expect(items[0].termijnWeken).toBe(26);
    expect(items[0].grondslag).toContain('AERIUS');
  });

  it('doorlooptijd: maatgevend is langste voorbereiding + termijn', () => {
    const items = deriveVergunningen({
      ...geen,
      openbareGrondGemeente: true, // 2 + 8 = 10
      kruistSpoor: true, // 12 + 26 = 38
      kruistWater: true, // 4 + 8 = 12
    });
    const resultaat = berekenVergunningDoorlooptijd(items);
    expect(resultaat.kritiekeDoorlooptijdWeken).toBe(38);
    expect(resultaat.maatgevend?.id).toBe('prorail');
  });

  it('zonder triggers geen vergunningen en doorlooptijd 0', () => {
    const resultaat = berekenVergunningDoorlooptijd(deriveVergunningen(geen));
    expect(resultaat.items).toHaveLength(0);
    expect(resultaat.kritiekeDoorlooptijdWeken).toBe(0);
    expect(resultaat.maatgevend).toBeNull();
  });
});
