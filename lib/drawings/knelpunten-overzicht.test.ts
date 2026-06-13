import { describe, expect, it } from 'vitest';
import type { DemoTrace } from '@/demo/traces';
import type { TraceKruising, TraceSegment } from '@/demo/roads';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { generateKnelpuntenOverzicht } from './knelpunten-overzicht';
import { valideerTekening } from './format';

function seg(volgorde: number, kruisingen: TraceKruising[], afwijkingen?: string[]): TraceSegment {
  return {
    volgorde,
    wegId: `w${volgorde}`,
    wegnaam: `Weg ${volgorde}`,
    leglocatie: 'berm',
    legtechniek: 'open_ontgraving',
    lengteM: 1500,
    kruisingen,
    afwijkingen,
  };
}

function trace(segmenten: TraceSegment[]): DemoTrace {
  const lijn: [number, number, number][] = [
    [0, 0, -0.65],
    [1500, 0, -0.65],
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

const conflict: DetectedConflict = {
  id: 'c1',
  traceId: 'trace-test',
  titel: 'Kruising elektra',
  type: 'onvoldoende_afstand',
  ernst: 'blokkerend',
  norm: 'NEN 7171',
  waardeGemeten: 0.2,
  waardeEis: 0.6,
  toelichting: 'Gemeten verticale ruimte 0,2 m, eis 0,6 m bij kruising bestaand net',
  x: 750,
  y: 5,
};

describe('generateKnelpuntenOverzicht', () => {
  it('genereert een geldige staat met boringen, kruisingen, afwijkingen en conflicten', () => {
    const t = trace([
      seg(
        1,
        [
          { type: 'water', naam: 'Hoofdvaart', breedteM: 14, legtechniek: 'hdd', methode: 'gestuurde_boring', methodeLabel: 'Gestuurde boring (HDD)', beheerder: 'Waterschap', vergunning: 'Watervergunning', normReferentie: 'NEN 3650', afweging: ['HDD gekozen: brede watergang'], x: 700, y: 0 },
          { type: 'weg', naam: 'Woonstraat', legtechniek: 'open_ontgraving', methode: 'bestrating_openen', methodeLabel: 'Bestrating openen', afweging: ['Bestrating herstraten'], x: 300, y: 0 },
        ],
        ['AVOI-bermligging plaatselijk niet haalbaar — ligging op hartlijn; reden: bebouwing langs de weg']
      ),
    ]);
    const bladen = generateKnelpuntenOverzicht(t, [conflict]);
    expect(bladen.length).toBeGreaterThanOrEqual(1);
    for (const blad of bladen) {
      const { geldig, fouten } = valideerTekening(blad.svg, 'knelpunten_overzicht');
      expect(fouten).toEqual([]);
      expect(geldig).toBe(true);
    }
    const alle = bladen.map((b) => b.svg).join('');
    expect(alle).toContain('B1'); // boring
    expect(alle).toContain('K1'); // overige kruising
    expect(alle).toContain('A1'); // afwijking
    expect(alle).toContain('C1'); // conflict
    expect(alle).toContain('Ernst'); // ernst-codering aanwezig (legenda)
    expect(alle).toContain('Gemeten 0.2 m'); // conflict-opmerking met waarde
  });

  it('pagineert bij veel knelpunten zonder af te kappen', () => {
    const veel: TraceKruising[] = Array.from({ length: 40 }, (_, i) => ({
      type: 'water' as const,
      naam: `Watergang ${i + 1} met een wat langere omschrijving voor wrap`,
      breedteM: 12,
      legtechniek: 'hdd' as const,
      methode: 'gestuurde_boring',
      methodeLabel: 'Gestuurde boring (HDD)',
      beheerder: 'Waterschap',
      vergunning: 'Watervergunning (keur/legger)',
      normReferentie: 'NEN 3650/3651 · keur waterschap',
      afweging: ['Gestuurde boring gekozen: brede watergang', 'Open kruising afgewezen: keur'],
      x: 100 + i * 30,
      y: 0,
    }));
    const t = trace([seg(1, veel)]);
    const bladen = generateKnelpuntenOverzicht(t);
    expect(bladen.length).toBeGreaterThan(1);
    // Alle 40 boringen verdeeld over de bladen
    const alle = bladen.map((b) => b.svg).join('');
    expect(alle).toContain('B40');
    for (const blad of bladen) {
      expect(valideerTekening(blad.svg, 'knelpunten_overzicht').geldig).toBe(true);
    }
  });

  it('geeft één blad bij een tracé zonder knelpunten', () => {
    const t = trace([seg(1, [])]);
    const bladen = generateKnelpuntenOverzicht(t);
    expect(bladen).toHaveLength(1);
    expect(valideerTekening(bladen[0].svg, 'knelpunten_overzicht').geldig).toBe(true);
  });
});
