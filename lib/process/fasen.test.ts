import { describe, expect, it } from 'vitest';
import {
  PROJECT_FASEN,
  berekenFaseVoortgang,
  bepaalActieveFase,
  traceFaseNaarProjectFase,
} from './fasen';
import { formatDocCode } from '@/lib/dossier/doc-code';

describe('projectfasen', () => {
  it('kent 6 fasen in de juiste volgorde', () => {
    expect(PROJECT_FASEN.map((f) => f.id)).toEqual([
      'verkenning',
      'vo',
      'do',
      'uo',
      'werkvoorbereiding',
      'uitvoering',
    ]);
    expect(PROJECT_FASEN.map((f) => f.nummer)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('elke fase heeft minimaal 2 deliverables met unieke ids', () => {
    for (const fase of PROJECT_FASEN) {
      expect(fase.deliverables.length).toBeGreaterThanOrEqual(2);
      const ids = fase.deliverables.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('berekent voortgang met ontbrekende records als "ontbreekt"', () => {
    const voortgang = berekenFaseVoortgang([
      { faseId: 'verkenning', deliverableId: 'quickscans', status: 'definitief' },
      { faseId: 'verkenning', deliverableId: 'tracestudie', status: 'concept' },
    ]);
    const verkenning = voortgang[0];
    expect(verkenning.totaal).toBe(3);
    expect(verkenning.definitief).toBe(1);
    expect(verkenning.concept).toBe(1);
    expect(verkenning.ontbreekt).toBe(1);
  });

  it('bepaalt actieve fase als eerste niet-afgeronde fase', () => {
    expect(bepaalActieveFase([])).toBe('verkenning');
    const verkenningKlaar = PROJECT_FASEN[0].deliverables.map((d) => ({
      faseId: 'verkenning' as const,
      deliverableId: d.id,
      status: 'definitief' as const,
    }));
    expect(bepaalActieveFase(verkenningKlaar)).toBe('vo');
  });

  it('mapt bestaande tracé-fasen naar projectfasen', () => {
    expect(traceFaseNaarProjectFase('VO')).toBe('vo');
    expect(traceFaseNaarProjectFase('as_built')).toBe('uitvoering');
    expect(traceFaseNaarProjectFase('onbekend')).toBe('verkenning');
  });
});

describe('documentcodering', () => {
  it('formatteert [PROJECT]-[FASE]-[TYPE]-[VOLGNR]-[VERSIE]', () => {
    expect(
      formatDocCode({
        projectCode: 'NOP-01',
        fase: 'do',
        type: 'RAP',
        volgnummer: 3,
        versie: { major: 1, minor: 2 },
      })
    ).toBe('NOP01-DO-RAP-003-v1.2');
  });

  it('gebruikt defaults voor versie en lege projectcode', () => {
    expect(
      formatDocCode({ projectCode: '', fase: 'werkvoorbereiding', type: 'PLN', volgnummer: 12 })
    ).toBe('PROJ-WVB-PLN-012-v1.0');
  });
});
