import type { CalcInput, CalcResult } from './types';

export interface StationsCalcOpties {
  /** Werkelijke ontwerpbelasting (kVA); zonder opgave gelden demo-waarden */
  totaalBelastingKVA?: number;
  aantalStations?: number;
  trafoKVAPerStation?: number;
  spanningKV?: number;
  nMin1?: boolean;
}

export function calcStations(input: CalcInput, opties: StationsCalcOpties = {}): CalcResult[] {
  // Zonder echte belastingdata: bestaand demo-voorbeeld (backwards-compatibel)
  if (!opties.totaalBelastingKVA) {
    return calcStationsDemo(input);
  }

  const belastingKVA = opties.totaalBelastingKVA;
  const trafoKVA = opties.trafoKVAPerStation ?? 630;
  const spanningKV = opties.spanningKV ?? 10;
  const nMin1 = opties.nMin1 ?? false;
  const benodigd = Math.max(1, Math.ceil(belastingKVA / (trafoKVA * 0.8)));
  const aantal = opties.aantalStations ?? benodigd + (nMin1 ? 1 : 0);
  const bezetting = (belastingKVA / (aantal * trafoKVA)) * 100;
  const voldoet = bezetting <= 80 || (nMin1 && (belastingKVA / ((aantal - 1) * trafoKVA)) * 100 <= 100);

  // Ruimtebeslag-indicatie per compact transformatorstation
  const m2PerStation = trafoKVA > 630 ? 16 : 12;

  return [
    {
      type: 'trafo_capaciteit',
      discipline: 'stations',
      normReferentie: 'NEN-EN 50522 / netbeheerder',
      invoer: {
        belastingKVA: Math.round(belastingKVA),
        trafoKVA,
        aantalStations: aantal,
        spanningKV,
        nMin1,
      },
      resultaat: {
        bezettingPct: Math.round(bezetting),
        benodigdAantal: benodigd + (nMin1 ? 1 : 0),
        voldoet,
      },
      aannames: [
        'Max. 80% ontwerpbezetting per trafo',
        nMin1 ? 'N-1 redundantie: één station extra' : 'Geen N-1-eis',
      ],
      conclusie: voldoet
        ? `${aantal}× ${trafoKVA} kVA dekt ${belastingKVA.toFixed(0)} kVA bij ${bezetting.toFixed(0)}% bezetting`
        : `Capaciteit onvoldoende — ${benodigd + (nMin1 ? 1 : 0)} stations van ${trafoKVA} kVA nodig`,
    },
    {
      type: 'ruimtebeslag',
      discipline: 'stations',
      normReferentie: 'NEN 7171 / Liander richtlijn',
      invoer: { aantalStations: aantal, m2PerStation },
      resultaat: { totaalM2: aantal * m2PerStation, voldoet: true },
      aannames: [`Compactstation ≈ ${m2PerStation} m² incl. werkruimte`],
      conclusie: `Ruimtereservering ${aantal * m2PerStation} m² totaal (${aantal} locaties)`,
    },
    {
      type: 'verzwaringsadvies',
      discipline: 'stations',
      normReferentie: 'Indicatief',
      invoer: { lengteM: input.lengteM, aansluitvermogenKVA: Math.round(belastingKVA) },
      resultaat: {
        advies: `${aantal}× transformatorstation ${trafoKVA} kVA`,
        investering: 'indicatief',
      },
      aannames: ['Posities uit belastingclusters (netontwerp)'],
      conclusie: `Plaats ${aantal} station${aantal > 1 ? 's' : ''} van ${trafoKVA} kVA langs het MS-tracé`,
    },
  ];
}

function calcStationsDemo(input: CalcInput): CalcResult[] {
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
