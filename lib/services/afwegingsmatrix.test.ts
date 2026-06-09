import { describe, expect, it } from 'vitest';
import { buildAfwegingsmatrix, AFWEGINGS_CRITERIA } from './afwegingsmatrix';
import type { TraceRouteAlternative } from '@/lib/services/trace-routing/types';

function maakAlternatief(
  overrides: Partial<TraceRouteAlternative> & { id: string }
): TraceRouteAlternative {
  return {
    label: overrides.id,
    beschrijving: '',
    traceLines: [],
    coordinates: [],
    segmenten: [],
    totaleLengteM: 1000,
    score: 80,
    waarschuwingen: [],
    blokkades: [],
    ...overrides,
  };
}

function segment(
  legtechniek: 'open_ontgraving' | 'hdd' | 'persing' | 'sleufloos',
  lengteM: number,
  opts: { kruisingen?: number; zakelijkRecht?: boolean; leglocatie?: string } = {}
) {
  return {
    volgorde: 1,
    wegnaam: 'Testweg',
    leglocatie: (opts.leglocatie ?? 'berm') as never,
    legtechniek,
    lengteM,
    kruisingen: Array.from({ length: opts.kruisingen ?? 0 }, (_, i) => ({
      type: 'weg' as const,
      naam: `Kruising ${i + 1}`,
      legtechniek,
    })),
    score: 80,
    opmerkingen: [],
    zakelijkRechtVereist: opts.zakelijkRecht,
  };
}

describe('afwegingsmatrix', () => {
  it('gewichten tellen op tot 100', () => {
    expect(AFWEGINGS_CRITERIA.reduce((s, c) => s + c.gewicht, 0)).toBe(100);
  });

  it('kort tracé zonder boringen wint van lang tracé met boringen', () => {
    const kort = maakAlternatief({
      id: 'kort',
      totaleLengteM: 800,
      segmenten: [segment('open_ontgraving', 800)],
    });
    const lang = maakAlternatief({
      id: 'lang',
      totaleLengteM: 1400,
      segmenten: [segment('open_ontgraving', 1200), segment('hdd', 200, { kruisingen: 2 })],
    });
    const matrix = buildAfwegingsmatrix([kort, lang]);
    expect(matrix.advies).toBe('kort');
    const kortTotaal = matrix.alternatieven.find((a) => a.alternatiefId === 'kort')!.totaal;
    const langTotaal = matrix.alternatieven.find((a) => a.alternatiefId === 'lang')!.totaal;
    expect(kortTotaal).toBeGreaterThan(langTotaal);
  });

  it('identieke alternatieven scoren beide maximaal (geen onderscheid)', () => {
    const a = maakAlternatief({ id: 'a', segmenten: [segment('open_ontgraving', 500)], totaleLengteM: 500 });
    const b = maakAlternatief({ id: 'b', segmenten: [segment('open_ontgraving', 500)], totaleLengteM: 500 });
    const matrix = buildAfwegingsmatrix([a, b]);
    expect(matrix.alternatieven[0].totaal).toBe(100);
    expect(matrix.alternatieven[1].totaal).toBe(100);
  });

  it('telt vergunningsignalen uit zakelijk recht en waarschuwingen', () => {
    const prive = maakAlternatief({
      id: 'prive',
      segmenten: [segment('open_ontgraving', 500, { zakelijkRecht: true })],
      waarschuwingen: ['Tracé raakt Natura 2000-gebied'],
    });
    const openbaar = maakAlternatief({
      id: 'openbaar',
      segmenten: [segment('open_ontgraving', 600)],
    });
    const matrix = buildAfwegingsmatrix([prive, openbaar]);
    const priveScore = matrix.alternatieven
      .find((a) => a.alternatiefId === 'prive')!
      .scores.find((s) => s.criterium === 'vergunningen')!;
    expect(priveScore.waarde).toBe(2);
    expect(priveScore.score).toBeLessThan(5);
  });

  it('kosten-indicatie rekent HDD zwaarder dan open ontgraving', () => {
    const metHdd = maakAlternatief({ id: 'hdd', segmenten: [segment('hdd', 100)] });
    const open = maakAlternatief({ id: 'open', segmenten: [segment('open_ontgraving', 100)] });
    const matrix = buildAfwegingsmatrix([metHdd, open]);
    const hddKosten = matrix.alternatieven
      .find((a) => a.alternatiefId === 'hdd')!
      .scores.find((s) => s.criterium === 'kosten')!.waarde;
    const openKosten = matrix.alternatieven
      .find((a) => a.alternatiefId === 'open')!
      .scores.find((s) => s.criterium === 'kosten')!.waarde;
    // 100 m HDD à €320/m = €32.000; 100 m open ontgraving à €85/m = €8.500
    expect(hddKosten).toBe(32000);
    expect(openKosten).toBe(8500);
  });

  it('vermeldt blokkades van het winnende alternatief in het advies', () => {
    const winnaar = maakAlternatief({
      id: 'win',
      totaleLengteM: 500,
      segmenten: [segment('open_ontgraving', 500)],
      blokkades: ['Kruising met primaire waterkering'],
    });
    const ander = maakAlternatief({
      id: 'ander',
      totaleLengteM: 2000,
      segmenten: [segment('hdd', 2000)],
    });
    const matrix = buildAfwegingsmatrix([winnaar, ander]);
    expect(matrix.advies).toBe('win');
    expect(matrix.adviesMotivatie).toContain('blokkade');
  });
});
