import { describe, expect, it } from 'vitest';
import type { DemoTrace } from '@/demo/traces';
import type { TraceKruising, TraceSegment } from '@/demo/roads';
import { bepaalBoringen, boringLengteVoorSegment, boreMethodeVoor } from './boringen';

function kruising(overrides: Partial<TraceKruising>): TraceKruising {
  return {
    type: 'water',
    naam: 'Vaart',
    legtechniek: 'hdd',
    x: 1000,
    y: 0,
    ...overrides,
  };
}

function segment(volgorde: number, kruisingen: TraceKruising[]): TraceSegment {
  return {
    volgorde,
    wegId: `w${volgorde}`,
    wegnaam: `Weg ${volgorde}`,
    leglocatie: 'berm',
    legtechniek: 'open_ontgraving',
    lengteM: 2000,
    kruisingen,
  };
}

function trace(segmenten: TraceSegment[]): DemoTrace {
  // Eén rechte tracélijn van (0,0) naar (2000,0) per segment
  const lijn: [number, number, number][] = [
    [0, 0, -0.65],
    [2000, 0, -0.65],
  ];
  return {
    id: 'trace-test',
    projectId: 'demo-project-001',
    code: 'TST-001',
    naam: 'Testtracé',
    discipline: 'elektra_ls',
    netType: 'LS 4x150 Al',
    fase: 'DO',
    vereisteDekking: 0.6,
    coordinates: lijn,
    traceLines: segmenten.map(() => lijn),
    kleur: '#cc0000',
    wegnaam: 'Weg 1',
    leglocatie: 'berm',
    segmenten,
    omschrijving: 'test',
  } as DemoTrace;
}

describe('boreMethodeVoor', () => {
  it('mapt fijnmazige methode naar boorrekenmethode', () => {
    expect(boreMethodeVoor('gestuurde_boring', 'hdd')).toBe('hdd');
    expect(boreMethodeVoor('persing', 'persing')).toBe('persing');
    expect(boreMethodeVoor('nanodrill', 'sleufloos')).toBe('sleufloos');
    expect(boreMethodeVoor(undefined, 'hdd')).toBe('hdd');
  });
});

describe('bepaalBoringen', () => {
  it('leidt een HDD-boring af uit een brede waterkruising met realistische lengte', () => {
    const t = trace([
      segment(1, [
        kruising({ type: 'water', naam: 'Hoofdvaart', breedteM: 14, legtechniek: 'hdd', methode: 'gestuurde_boring' }),
      ]),
    ]);
    const boringen = bepaalBoringen(t);
    expect(boringen).toHaveLength(1);
    const b = boringen[0];
    expect(b.id).toBe('B1');
    expect(b.obstakelBreedteM).toBe(14);
    // 14 m obstakel + 2× HDD-uitloop (12 m put) = 38 m, ruim boven minimum 30
    expect(b.lengteM).toBe(38);
    expect(b.lengteM).toBeGreaterThanOrEqual(30);
    expect(b.diepteNap).toBeLessThan(-0.6);
  });

  it('plaatst intrede en uittrede symmetrisch rond de kruising langs de tracérichting', () => {
    const t = trace([
      segment(1, [kruising({ breedteM: 10, x: 1000, y: 0, methode: 'gestuurde_boring', legtechniek: 'hdd' })]),
    ]);
    const b = bepaalBoringen(t)[0];
    // Tracé loopt langs x; intrede vóór, uittrede ná de kruising
    expect(b.intrede[0]).toBeLessThan(1000);
    expect(b.uittrede[0]).toBeGreaterThan(1000);
    expect(b.intrede[1]).toBeCloseTo(0, 1);
    expect(b.uittrede[1]).toBeCloseTo(0, 1);
    // Afstand intrede→uittrede ≈ lengteM
    const span = Math.hypot(b.uittrede[0] - b.intrede[0], b.uittrede[1] - b.intrede[1]);
    expect(span).toBeCloseTo(b.lengteM, 0);
  });

  it('negeert open ontgraving / bestrating (geen boring)', () => {
    const t = trace([
      segment(1, [
        kruising({ type: 'weg', naam: 'Woonstraat', legtechniek: 'open_ontgraving', methode: 'bestrating_openen' }),
        kruising({ type: 'weg', naam: 'Berm', legtechniek: 'open_ontgraving', methode: 'open_ontgraving', x: 1500 }),
      ]),
    ]);
    expect(bepaalBoringen(t)).toHaveLength(0);
  });

  it('telt persing onder een provinciale weg wél als boring', () => {
    const t = trace([
      segment(1, [
        kruising({ type: 'weg', naam: 'N50 provinciale weg', legtechniek: 'persing', methode: 'persing', breedteM: 12 }),
      ]),
    ]);
    const boringen = bepaalBoringen(t);
    expect(boringen).toHaveLength(1);
    expect(boringen[0].methode).toBe('persing');
    // 12 m weg + 2× persing-uitloop (8 m put) = 28 m
    expect(boringen[0].lengteM).toBe(28);
  });

  it('schat de wegbreedte wanneer breedteM ontbreekt', () => {
    const t = trace([
      segment(1, [kruising({ type: 'weg', naam: 'Fietspad langs de dijk', legtechniek: 'persing', methode: 'persing' })]),
    ]);
    const b = bepaalBoringen(t)[0];
    expect(b.obstakelBreedteM).toBe(4); // fietspad
  });

  it('nummert boringen doorlopend over meerdere segmenten en negeert kruisingen zonder locatie', () => {
    const t = trace([
      segment(1, [kruising({ naam: 'Vaart A', breedteM: 8, methode: 'gestuurde_boring', legtechniek: 'hdd' })]),
      segment(2, [
        kruising({ naam: 'Geen locatie', breedteM: 8, methode: 'gestuurde_boring', legtechniek: 'hdd', x: undefined, y: undefined }),
        kruising({ naam: 'Spoorlijn', type: 'spoor', legtechniek: 'persing', methode: 'persing', x: 1200 }),
      ]),
    ]);
    const boringen = bepaalBoringen(t);
    expect(boringen.map((b) => b.id)).toEqual(['B1', 'B2']);
    expect(boringen[1].segmentVolgorde).toBe(2);
    expect(boringen[1].kruisingType).toBe('spoor');
  });

  it('boringLengteVoorSegment sommeert de boringen per segment', () => {
    const t = trace([
      segment(1, [
        kruising({ naam: 'Vaart A', breedteM: 8, methode: 'gestuurde_boring', legtechniek: 'hdd', x: 500 }),
        kruising({ naam: 'Vaart B', breedteM: 8, methode: 'gestuurde_boring', legtechniek: 'hdd', x: 1500 }),
      ]),
    ]);
    const seg = t.segmenten[0];
    const totaal = boringLengteVoorSegment(t, seg);
    // 2× (8 + 2×12) = 2×32 = 64
    expect(totaal).toBe(64);
  });
});
