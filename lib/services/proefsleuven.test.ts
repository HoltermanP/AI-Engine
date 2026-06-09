import { describe, expect, it } from 'vitest';
import { genereerProefsleuvenPlan } from './proefsleuven';

const traceInput = {
  traceId: 't1',
  traceCode: 'TR-01',
  traceNaam: 'Test-tracé',
  projectCode: 'NOP01',
  // Recht oost-west tracé van 1000 m
  coordinates: [
    [180000, 520000, 0],
    [181000, 520000, 0],
  ] as [number, number, number?][],
};

describe('proefsleuvenplan', () => {
  it('stelt proefsleuf voor bij elke kruising met bestaand net', () => {
    const plan = genereerProefsleuvenPlan(traceInput, [
      {
        id: 'n1',
        thema: 'gas lage druk',
        beheerder: 'Liander',
        nauwkeurigheid: 'gemeten',
        // Noord-zuid leiding die het tracé kruist op x=180500
        coordinates: [
          [180500, 519900],
          [180500, 520100],
        ],
      },
    ]);
    expect(plan.locaties).toHaveLength(1);
    expect(plan.locaties[0].reden).toBe('kruising');
    expect(plan.locaties[0].prioriteit).toBe('hoog');
    expect(plan.locaties[0].chainageM).toBe(500);
  });

  it('stelt proefsleuf voor bij parallelligging binnen de zorgvuldigheidszone', () => {
    const plan = genereerProefsleuvenPlan(traceInput, [
      {
        id: 'n2',
        thema: 'water',
        beheerder: 'Vitens',
        nauwkeurigheid: 'geschat',
        // Parallel net op 2 m afstand (zone = 1.5 + 1.5 = 3.0 m)
        coordinates: [
          [180200, 520002],
          [180800, 520002],
        ],
      },
    ]);
    expect(plan.locaties).toHaveLength(1);
    expect(plan.locaties[0].reden).toBe('parallelligging');
    expect(plan.locaties[0].prioriteit).toBe('hoog'); // geschat → hoog
  });

  it('negeert netten ruim buiten de zone', () => {
    const plan = genereerProefsleuvenPlan(traceInput, [
      {
        id: 'n3',
        thema: 'telecom',
        beheerder: 'KPN',
        nauwkeurigheid: 'gemeten',
        coordinates: [
          [180200, 520050],
          [180800, 520050],
        ],
      },
    ]);
    expect(plan.locaties).toHaveLength(0);
    expect(plan.samenvatting).toContain('Geen proefsleuven');
  });

  it('voegt nabijgelegen locaties samen en neemt boringspunten mee', () => {
    const plan = genereerProefsleuvenPlan(
      {
        ...traceInput,
        boringen: [{ wegnaam: 'Provinciale weg', startRd: [180495, 520000], eindRd: [180600, 520000] }],
      },
      [
        {
          id: 'n1',
          thema: 'gas lage druk',
          beheerder: 'Liander',
          nauwkeurigheid: 'gemeten',
          coordinates: [
            [180500, 519900],
            [180500, 520100],
          ],
        },
      ]
    );
    // Kruising op 500 en intredepunt op 495 liggen < 25 m uit elkaar → samengevoegd
    const chainages = plan.locaties.map((l) => l.chainageM);
    expect(plan.locaties.length).toBe(2);
    expect(Math.min(...chainages)).toBeLessThanOrEqual(500);
    expect(plan.markdown).toContain('CROW 500');
    expect(plan.docCode).toBe('NOP01-WVB-PLN-001-v1.0');
  });
});
