import { describe, expect, it } from 'vitest';
import { buildMateriaalLijst } from './materiaal';
import { bandbreedteVoorTotaal, niveauVoorFase } from './niveau';
import type { DemoTrace } from '@/demo/traces';

function maakTrace(overrides: Partial<DemoTrace>): DemoTrace {
  return {
    id: 't1',
    projectId: 'p1',
    code: 'TR-01',
    naam: 'Test',
    discipline: 'elektra_ms',
    netType: '3x1x240 Al 10kV',
    fase: 'VO',
    vereisteDekking: 1.0,
    coordinates: [],
    traceLines: [],
    kleur: '#000',
    wegnaam: 'Testweg',
    leglocatie: 'berm',
    segmenten: [],
    omschrijving: '',
    ...overrides,
  } as DemoTrace;
}

function segment(legtechniek: string, lengteM: number) {
  return {
    volgorde: 1,
    wegnaam: 'Testweg',
    leglocatie: 'berm',
    legtechniek,
    lengteM,
  } as DemoTrace['segmenten'][number];
}

describe('materiaallijst', () => {
  it('MS-kabel 2300 m → 3 haspels à 1000 m en 2 verbindingsmoffen', () => {
    // bruto = 2300 × 1.05 + 10 = 2425 m → ceil(2425/1000) = 3 haspels
    const lijst = buildMateriaalLijst(
      maakTrace({ segmenten: [segment('open_ontgraving', 2300)] })
    );
    const kabel = lijst.regels.find((r) => r.artikel === 'KAB-MS')!;
    expect(kabel.hoeveelheidNetto).toBe(2300);
    expect(kabel.hoeveelheidBruto).toBe(3000);
    const mof = lijst.regels.find((r) => r.artikel === 'MOF-MS')!;
    expect(mof.hoeveelheidNetto).toBe(2);
    const eind = lijst.regels.find((r) => r.artikel === 'EIND-MS')!;
    expect(eind.hoeveelheidNetto).toBe(2);
  });

  it('voegt mantelbuis toe bij boringen, met diameter ≥ 1,5× product', () => {
    const lijst = buildMateriaalLijst(
      maakTrace({
        discipline: 'water',
        netType: 'PE Ø160',
        segmenten: [segment('open_ontgraving', 500), segment('hdd', 80)],
      })
    );
    const mantel = lijst.regels.find((r) => r.artikel.startsWith('MANTEL-'))!;
    expect(mantel).toBeDefined();
    // 160 × 1.5 = 240 mm
    expect(mantel.artikel).toBe('MANTEL-240');
    expect(mantel.hoeveelheidNetto).toBe(80);
  });

  it('rekent zandbed en markeringslint alleen over open ontgraving', () => {
    const lijst = buildMateriaalLijst(
      maakTrace({ segmenten: [segment('open_ontgraving', 1000), segment('hdd', 200)] })
    );
    const zand = lijst.regels.find((r) => r.artikel === 'ZAND-BED')!;
    expect(zand.hoeveelheidNetto).toBe(200); // 1000 m × 0,2 m³/m
    const lint = lijst.regels.find((r) => r.artikel === 'LINT')!;
    expect(lint.hoeveelheidNetto).toBe(4); // 1000/250
  });

  it('MS-tracé krijgt afdekplaten, LS niet', () => {
    const ms = buildMateriaalLijst(maakTrace({ segmenten: [segment('open_ontgraving', 100)] }));
    expect(ms.regels.some((r) => r.artikel === 'AFDEK')).toBe(true);
    const ls = buildMateriaalLijst(
      maakTrace({ discipline: 'elektra_ls', netType: '4x150 Al', segmenten: [segment('open_ontgraving', 100)] })
    );
    expect(ls.regels.some((r) => r.artikel === 'AFDEK')).toBe(false);
  });
});

describe('calculatieniveau per fase', () => {
  it('VO → raming ±30%, DO → budget ±15%, UO → inschrijfbegroting ±5%', () => {
    expect(niveauVoorFase('vo').id).toBe('raming');
    expect(niveauVoorFase('do').id).toBe('budget');
    expect(niveauVoorFase('uo').id).toBe('inschrijfbegroting');
    expect(niveauVoorFase('werkvoorbereiding').id).toBe('inschrijfbegroting');
  });

  it('berekent bandbreedte rond het totaal', () => {
    const band = bandbreedteVoorTotaal(100000, 'do');
    expect(band.ondergrens).toBe(85000);
    expect(band.bovengrens).toBe(115000);
  });
});
