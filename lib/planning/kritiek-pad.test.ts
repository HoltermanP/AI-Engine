import { describe, expect, it } from 'vitest';
import { berekenKritiekPad, markeerKritiekPad } from './kritiek-pad';
import type { PlanningActiviteit } from './types';

function act(
  id: string,
  start: string,
  eind: string,
  voorgangers: string[] = []
): PlanningActiviteit {
  return {
    id,
    titel: id,
    beschrijving: '',
    categorie: 'engineering',
    startDatum: start,
    eindDatum: eind,
    duurDagen: 1,
    voorgangers,
    deliverables: [],
    status: 'gepland',
    voortgangPct: 0,
  };
}

describe('kritiek pad (CPM)', () => {
  // Netwerk:  A(2d) → B(5d) → D(2d)
  //           A(2d) → C(1d) ↗ (C heeft 4 dagen speling)
  const activiteiten = [
    act('A', '2026-06-01', '2026-06-02'),
    act('B', '2026-06-03', '2026-06-07', ['A']),
    act('C', '2026-06-03', '2026-06-03', ['A']),
    act('D', '2026-06-08', '2026-06-09', ['B', 'C']),
  ];

  it('markeert het langste pad A→B→D als kritiek', () => {
    const { kritiekeIds } = berekenKritiekPad(activiteiten);
    expect(kritiekeIds.has('A')).toBe(true);
    expect(kritiekeIds.has('B')).toBe(true);
    expect(kritiekeIds.has('D')).toBe(true);
    expect(kritiekeIds.has('C')).toBe(false);
  });

  it('berekent de speling van het niet-kritieke pad', () => {
    const { spelingDagen } = berekenKritiekPad(activiteiten);
    // C mag uiterlijk 2026-06-07 klaar zijn (D start 06-08) → 4 dagen speling
    expect(spelingDagen.get('C')).toBe(4);
    expect(spelingDagen.get('B')).toBe(0);
  });

  it('markeerKritiekPad zet de vlag zonder de input te muteren', () => {
    const result = markeerKritiekPad(activiteiten);
    expect(result.find((a) => a.id === 'B')!.kritiekPad).toBe(true);
    expect(result.find((a) => a.id === 'C')!.kritiekPad).toBe(false);
    expect(activiteiten.find((a) => a.id === 'B')!.kritiekPad).toBeUndefined();
  });

  it('één activiteit is altijd kritiek', () => {
    const { kritiekeIds } = berekenKritiekPad([act('X', '2026-06-01', '2026-06-05')]);
    expect(kritiekeIds.has('X')).toBe(true);
  });
});
