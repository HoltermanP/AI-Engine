import { describe, expect, it } from 'vitest';
import { genereerUitgangspuntennotitie } from './uitgangspunten';
import type { TraceRoutingResult } from '@/lib/services/trace-routing/types';

const routing: TraceRoutingResult = {
  traceLines: [],
  coordinates: [],
  segmenten: [
    {
      volgorde: 1,
      wegnaam: 'Espelerweg',
      leglocatie: 'berm' as never,
      legtechniek: 'open_ontgraving',
      lengteM: 850,
      kruisingen: [],
      score: 90,
      opmerkingen: [],
    },
    {
      volgorde: 2,
      wegnaam: 'Urkervaart',
      leglocatie: 'berm' as never,
      legtechniek: 'hdd',
      lengteM: 120,
      kruisingen: [
        {
          type: 'water',
          naam: 'Urkervaart',
          breedteM: 30,
          legtechniek: 'hdd',
          normReferentie: 'NEN 3651',
        },
      ],
      score: 70,
      opmerkingen: [],
    },
  ],
  totaleLengteM: 970,
  score: 85,
  samenvatting: [],
  waarschuwingen: ['Keurzone waterschap van toepassing'],
  blokkades: [],
  normReferenties: [],
};

describe('uitgangspuntennotitie', () => {
  const notitie = genereerUitgangspuntennotitie({
    projectNaam: 'Netverzwaring NOP Oost',
    projectCode: 'NOP01',
    traceNaam: 'MS-verbinding Espel',
    traceCode: 'TR-MS-01',
    discipline: 'elektra_ms',
    netType: '10 kV',
    vereisteDekkingM: 1.0,
    diepteNapM: -1.0,
    routing,
    datum: '2026-06-09',
  });

  it('genereert documentcode in VO-fase', () => {
    expect(notitie.docCode).toBe('NOP01-VO-NOT-001-v1.0');
    expect(notitie.markdown).toContain('NOP01-VO-NOT-001-v1.0');
  });

  it('bevat de discipline-specifieke normen (MS → IEC 60287 en BEI)', () => {
    expect(notitie.markdown).toContain('IEC 60287');
    expect(notitie.markdown).toContain('BEI');
    expect(notitie.markdown).toContain('NEN 7171-1');
  });

  it('vermeldt dekking en kruisingsmethode uit het tracé', () => {
    expect(notitie.markdown).toContain('1.00 m');
    expect(notitie.markdown).toContain('Urkervaart');
    expect(notitie.markdown).toContain('Gestuurde boring (HDD)');
  });

  it('neemt waarschuwingen uit de tracétoets op als aandachtspunt', () => {
    expect(notitie.markdown).toContain('Keurzone waterschap');
  });

  it('werkt ook zonder routingresultaat', () => {
    const kaal = genereerUitgangspuntennotitie({
      projectNaam: 'P',
      projectCode: 'P1',
      traceNaam: 'T',
      traceCode: 'TR-1',
      discipline: 'water',
      vereisteDekkingM: 0.8,
      datum: '2026-06-09',
    });
    expect(kaal.markdown).toContain('Geen kruisingen');
    expect(kaal.docCode).toBe('P1-VO-NOT-001-v1.0');
  });
});
