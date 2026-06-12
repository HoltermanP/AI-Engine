import { describe, expect, it } from 'vitest';
import {
  meetLengteM,
  offsetPolyline,
  orthoPunt,
  puntOpAfstand,
  segmentMaat,
  snapPunt,
} from './teken-gereedschap';
import type { TraceLine } from '@/lib/trace-edit';

const lijn: TraceLine = [
  [0, 0, -0.65],
  [100, 0, -0.65],
  [100, 100, -0.65],
];

describe('snapPunt (OSNAP)', () => {
  it('snapt op een eindpunt vóór een lijn-snap', () => {
    const snap = snapPunt(3, 2, [{ lines: [lijn] }]);
    expect(snap?.type).toBe('eindpunt');
    expect(snap?.x).toBe(0);
    expect(snap?.y).toBe(0);
  });

  it('snapt op het dichtstbijzijnde punt van een segment', () => {
    const snap = snapPunt(50, 4, [{ lines: [lijn] }]);
    expect(snap?.type).toBe('lijn');
    expect(snap?.x).toBeCloseTo(50, 5);
    expect(snap?.y).toBeCloseTo(0, 5);
  });

  it('geeft null buiten de tolerantie', () => {
    expect(snapPunt(50, 30, [{ lines: [lijn] }])).toBeNull();
  });

  it('markeert binnenliggende hoekpunten als vertex', () => {
    const snap = snapPunt(101, 2, [{ lines: [lijn] }]);
    expect(snap?.type).toBe('vertex');
  });
});

describe('orthoPunt', () => {
  it('dwingt het segment naar de dichtstbijzijnde 45°-richting', () => {
    const p = orthoPunt({ x: 0, y: 0 }, { x: 100, y: 8 });
    expect(p.y).toBeCloseTo(0, 5); // 4.6° → 0°
    const p45 = orthoPunt({ x: 0, y: 0 }, { x: 100, y: 80 });
    expect(p45.x).toBeCloseTo(p45.y, 5); // 38.7° → 45°
  });
});

describe('puntOpAfstand (maatinvoer)', () => {
  it('plaatst het punt op exact de getypte afstand in de cursorrichting', () => {
    const p = puntOpAfstand({ x: 0, y: 0 }, { x: 30, y: 40 }, 100);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(100, 6);
    expect(p.x).toBeCloseTo(60, 6);
    expect(p.y).toBeCloseTo(80, 6);
  });
});

describe('segmentMaat', () => {
  it('geeft kompasrichting (noord 0°, oost 90°)', () => {
    expect(segmentMaat({ x: 0, y: 0 }, { x: 0, y: 50 }).hoekDeg).toBeCloseTo(0, 5);
    expect(segmentMaat({ x: 0, y: 0 }, { x: 50, y: 0 }).hoekDeg).toBeCloseTo(90, 5);
    expect(segmentMaat({ x: 0, y: 0 }, { x: 0, y: -50 }).hoekDeg).toBeCloseTo(180, 5);
  });
});

describe('offsetPolyline', () => {
  it('legt een rechte lijn exact op offset-afstand', () => {
    const offset = offsetPolyline(
      [
        [0, 0, -0.65],
        [100, 0, -0.65],
      ],
      2,
    );
    expect(offset[0][1]).toBeCloseTo(-2, 5);
    expect(offset[1][1]).toBeCloseTo(-2, 5);
  });

  it('houdt bij een haakse hoek beide zijden op afstand (verstek)', () => {
    const offset = offsetPolyline(lijn, 2);
    // Eerste segment (oost): rechts = zuid → y ≈ −2
    expect(offset[0][1]).toBeCloseTo(-2, 4);
    // Tweede segment (noord): rechts = oost → x ≈ 102
    expect(offset[2][0]).toBeCloseTo(102, 4);
    // Hoekpunt ligt op afstand 2 van beide segmenten
    expect(offset[1][1]).toBeCloseTo(-2, 1);
    expect(offset[1][0]).toBeCloseTo(102, 1);
  });

  it('behoudt de z-waarde', () => {
    const offset = offsetPolyline(lijn, 3);
    expect(offset.every((c) => c[2] === -0.65)).toBe(true);
  });
});

describe('meetLengteM', () => {
  it('telt de meetlijn op', () => {
    expect(meetLengteM([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])).toBeCloseTo(150, 5);
  });
});
