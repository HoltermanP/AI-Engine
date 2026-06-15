import { describe, expect, it } from 'vitest';
import {
  deleteVertex,
  reverseLine,
  breakLine,
  joinLines,
  type TraceLines,
} from './trace-edit';

const lijn: TraceLines = [
  [
    [0, 0, -0.65],
    [50, 0, -0.65],
    [100, 0, -0.65],
  ],
];

describe('deleteVertex', () => {
  it('verwijdert het aangewezen hoekpunt', () => {
    const res = deleteVertex(lijn, 0, 1);
    expect(res[0]).toHaveLength(2);
    expect(res[0].map((c) => c[0])).toEqual([0, 100]);
  });

  it('behoudt minimaal twee punten', () => {
    const twee: TraceLines = [[[0, 0, -0.65], [10, 0, -0.65]]];
    expect(deleteVertex(twee, 0, 0)).toEqual(twee);
  });
});

describe('reverseLine', () => {
  it('keert de richting van de lijn om', () => {
    const res = reverseLine(lijn, 0);
    expect(res[0].map((c) => c[0])).toEqual([100, 50, 0]);
  });
});

describe('breakLine', () => {
  it('splitst de lijn op een punt midden in een segment in twee delen', () => {
    const res = breakLine(lijn, 0, 25, 0);
    expect(res).toHaveLength(2);
    // Eerste deel eindigt op het breekpunt
    expect(res[0][res[0].length - 1][0]).toBeCloseTo(25, 5);
    // Tweede deel begint op het breekpunt
    expect(res[1][0][0]).toBeCloseTo(25, 5);
    // Samen dekken ze de hele lijn
    expect(res[0][0][0]).toBe(0);
    expect(res[1][res[1].length - 1][0]).toBe(100);
  });

  it('splitst op een bestaand hoekpunt zonder dubbel punt', () => {
    const res = breakLine(lijn, 0, 50, 0);
    expect(res).toHaveLength(2);
    expect(res[0].map((c) => c[0])).toEqual([0, 50]);
    expect(res[1].map((c) => c[0])).toEqual([50, 100]);
  });

  it('laat de lijn intact als een deel te kort zou worden', () => {
    // Breken vlak bij het eerste eindpunt → eerste deel zou 1 punt zijn
    const res = breakLine(lijn, 0, 0, 0);
    expect(res).toHaveLength(1);
  });
});

describe('joinLines', () => {
  it('voegt twee lijnen samen die op een uiteinde aansluiten', () => {
    const lines: TraceLines = [
      [[0, 0, -0.65], [50, 0, -0.65]],
      [[50, 0, -0.65], [50, 50, -0.65]],
    ];
    const res = joinLines(lines, 0, 1);
    expect(res).toHaveLength(1);
    expect(res[0].map((c) => `${c[0]},${c[1]}`)).toEqual(['0,0', '50,0', '50,50']);
  });

  it('oriënteert de tweede lijn correct (eind-op-eind)', () => {
    const lines: TraceLines = [
      [[0, 0, -0.65], [50, 0, -0.65]],
      [[50, 50, -0.65], [50, 0, -0.65]], // omgekeerd: eindigt op het verbindingspunt
    ];
    const res = joinLines(lines, 0, 1);
    expect(res).toHaveLength(1);
    expect(res[0].map((c) => `${c[0]},${c[1]}`)).toEqual(['0,0', '50,0', '50,50']);
  });

  it('voegt niet samen wanneer het gat groter is dan de tolerantie', () => {
    const lines: TraceLines = [
      [[0, 0, -0.65], [50, 0, -0.65]],
      [[80, 0, -0.65], [80, 50, -0.65]],
    ];
    expect(joinLines(lines, 0, 1, 5)).toHaveLength(2);
  });
});
