import { describe, expect, it } from 'vitest';
import type { BodemTraceKruising } from '@/lib/services/bodem-risico/types';
import {
  OPHOGING_DREMPEL_M,
  signaalBodemkwaliteit,
  signalenArchiefGat,
  signalenOphogingDemping,
  signalenVanKruisingen,
  type HoogteSample,
} from './signals';
import { genereerNen5725Rapport } from './nen5725-rapport';

const DATUM = '2026-06-27T00:00:00.000Z';

function kruising(overrides: Partial<BodemTraceKruising>): BodemTraceKruising {
  return {
    locatieId: 'FR000000001',
    naam: 'voldoende onderzocht',
    bron: 'bodemloket-wbb',
    risicoklasse: 'hoog',
    gebiedType: 'bodemlocatie',
    relatie: 'nabij',
    afstandTraceM: 20,
    x: 206000,
    y: 611000,
    ...overrides,
  };
}

describe('signalenVanKruisingen (bekende verontreiniging)', () => {
  it('maakt kritische, automatiseerbare signalen zonder handmatige verificatie', () => {
    const signalen = signalenVanKruisingen([kruising({})], DATUM);
    expect(signalen).toHaveLength(1);
    expect(signalen[0].type).toBe('bekende_verontreiniging');
    expect(signalen[0].ernst).toBe('kritisch');
    expect(signalen[0].automatiseerbaar).toBe(true);
    expect(signalen[0].handmatigeVerificatie).toBe(false);
    expect(signalen[0].bronDatum).toBe(DATUM);
    expect(signalen[0].locatiecode).toBe('FR000000001');
  });

  it('onderscheidt doorschreden van nabij in de titel', () => {
    const [door] = signalenVanKruisingen([kruising({ relatie: 'doorschreden', afstandTraceM: 0 })], DATUM);
    const [nabij] = signalenVanKruisingen([kruising({ relatie: 'nabij', afstandTraceM: 35 })], DATUM);
    expect(door.titel).toMatch(/doorsnijdt/i);
    expect(nabij.titel).toMatch(/nabij/i);
    expect(nabij.afstandM).toBe(35);
  });
});

describe('signalenOphogingDemping (AHN-anomalie)', () => {
  const vlak: HoogteSample[] = Array.from({ length: 9 }, (_, i) => ({
    chainage: i * 10,
    hoogteNap: -0.2,
  }));

  it('geeft geen signaal bij een vlak profiel', () => {
    expect(signalenOphogingDemping(vlak, DATUM)).toHaveLength(0);
  });

  it('detecteert een ophooglaag boven de drempel en vereist handmatige check', () => {
    const samples = vlak.map((s, i) => (i === 4 ? { ...s, hoogteNap: -0.2 + 1.2 } : s));
    const signalen = signalenOphogingDemping(samples, DATUM);
    expect(signalen).toHaveLength(1);
    expect(signalen[0].type).toBe('ophoging_demping');
    expect(signalen[0].ernst).toBe('let_op');
    expect(signalen[0].handmatigeVerificatie).toBe(true);
    expect(signalen[0].automatiseerbaar).toBe(false);
    expect(signalen[0].titel).toMatch(/ophooglaag/i);
  });

  it('detecteert een demping (negatieve afwijking) als gedempte laagte', () => {
    const samples = vlak.map((s, i) => (i === 4 ? { ...s, hoogteNap: -0.2 - 1.0 } : s));
    const [signaal] = signalenOphogingDemping(samples, DATUM);
    expect(signaal.titel).toMatch(/gedempte/i);
  });

  it('negeert afwijkingen onder de drempel', () => {
    const samples = vlak.map((s, i) => (i === 4 ? { ...s, hoogteNap: -0.2 + OPHOGING_DREMPEL_M - 0.05 } : s));
    expect(signalenOphogingDemping(samples, DATUM)).toHaveLength(0);
  });

  it('geeft niets terug bij te weinig samples', () => {
    expect(signalenOphogingDemping(vlak.slice(0, 4), DATUM)).toHaveLength(0);
  });
});

describe('signaalBodemkwaliteit', () => {
  it('is info en altijd handmatig te verifiëren', () => {
    const s = signaalBodemkwaliteit(DATUM);
    expect(s.type).toBe('bodemkwaliteitsklasse');
    expect(s.ernst).toBe('info');
    expect(s.handmatigeVerificatie).toBe(true);
  });
});

describe('signalenArchiefGat (altijd-signaal)', () => {
  it('geeft altijd de verplichte mens-werk-signalen, ongeacht data', () => {
    const signalen = signalenArchiefGat(DATUM);
    expect(signalen.length).toBeGreaterThanOrEqual(4);
    expect(signalen.every((s) => s.type === 'archief_gat')).toBe(true);
    expect(signalen.every((s) => s.handmatigeVerificatie === true)).toBe(true);
    expect(signalen.every((s) => s.automatiseerbaar === false)).toBe(true);
    // De kerncomponenten van het mens-werk moeten benoemd zijn.
    const tekst = signalen.map((s) => s.titel.toLowerCase()).join(' | ');
    expect(tekst).toMatch(/archief/);
    expect(tekst).toMatch(/locatiebezoek/);
    expect(tekst).toMatch(/luchtfoto/);
  });
});

describe('genereerNen5725Rapport', () => {
  const signalen = [
    ...signalenVanKruisingen([kruising({ relatie: 'doorschreden', afstandTraceM: 0 })], DATUM),
    signaalBodemkwaliteit(DATUM),
    ...signalenArchiefGat(DATUM),
  ];

  it('produceert de NEN 5725-hoofdstukstructuur met status concept', () => {
    const r = genereerNen5725Rapport(signalen, {
      gebiedOmschrijving: 'Testtracé',
      heeftTrace: true,
      gegenereerdOp: DATUM,
    });
    expect(r.status).toBe('concept');
    const nummers = r.secties.map((s) => s.nummer);
    expect(nummers).toEqual(expect.arrayContaining(['1', '2', '3.1', '3.2', '3.5', '3.6', '4', '5']));
  });

  it('markeert mens-vereiste secties met handmatige verificatie', () => {
    const r = genereerNen5725Rapport(signalen, { gebiedOmschrijving: 'X', heeftTrace: true, gegenereerdOp: DATUM });
    const archiefSectie = r.secties.find((s) => s.nummer === '3.5');
    const locatieSectie = r.secties.find((s) => s.nummer === '3.6');
    expect(archiefSectie?.handmatigeVerificatie).toBe(true);
    expect(locatieSectie?.handmatigeVerificatie).toBe(true);
    expect(r.markdown).toContain('⚠');
  });

  it('claimt NERGENS dat het vooronderzoek compleet of conform is', () => {
    const r = genereerNen5725Rapport(signalen, { gebiedOmschrijving: 'X', heeftTrace: true, gegenereerdOp: DATUM });
    const md = r.markdown.toLowerCase();
    expect(md).not.toMatch(/vooronderzoek is (compleet|conform|volledig|afgerond)/);
    expect(md).toContain('geen volledig en geen conform');
  });
});
