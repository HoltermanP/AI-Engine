import type { CalcInput, CalcResult } from './types';

export function calcStations(input: CalcInput): CalcResult[] {
  return [
    {
      type: 'trafo_capaciteit',
      discipline: 'stations',
      normReferentie: 'NEN-EN 50522 / netbeheerder',
      invoer: { huidigeMVA: 2.5, nieuweBelastingMVA: 3.2, spanningKV: 20 },
      resultaat: {
        benodigdeMVA: 4.0,
        trafoType: '2x 2 MVA',
        voldoet: true,
      },
      aannames: ['N-1 redundantie', 'Belastingstoename 28%'],
      conclusie: 'Verzwaring met 2x 2 MVA transformatoren aanbevolen',
    },
    {
      type: 'ruimtebeslag',
      discipline: 'stations',
      normReferentie: 'NEN 7171 / Liander richtlijn',
      invoer: { msRuimteM2: 45, transformatoren: 2, schakelvelden: 4 },
      resultaat: { totaalM2: 72, vrijeRuimteM2: 12, voldoet: true },
      aannames: ['MS-ruimte bestaand 45 m²', 'Uitbreiding 27 m²'],
      conclusie: 'Stationruimte uitbreidbaar — 12 m² vrije ruimte na verzwaring',
    },
    {
      type: 'verzwaringsadvies',
      discipline: 'stations',
      normReferentie: 'Indicatief',
      invoer: { lengteM: input.lengteM, aansluitvermogenKVA: 3200 },
      resultaat: { advies: 'MS-ruimte uitbreiden + 2e trafo', investering: 'indicatief' },
      aannames: ['Aansluiting op bestaand distributiestation Oost'],
      conclusie: 'Verzwaringsadvies: uitbreiding MS-ruimte met tweede transformator',
    },
  ];
}
