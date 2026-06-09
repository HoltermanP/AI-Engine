import type { CalcInput, CalcResult } from './types';
import {
  belastbaarheidLsA,
  spanningsvalLsV,
  thermischKortsluitVoldoet,
} from './formulas';

function designStroomA(sectie: number, materiaal: 'Al' | 'Cu'): number {
  const ia = belastbaarheidLsA(sectie, materiaal);
  return Math.min(250, Math.round(ia * 0.75));
}

export function calcElektraLs(input: CalcInput): CalcResult[] {
  const sectie = input.sectieMm2 ?? 240;
  const materiaal = (input.materiaal === 'Cu' ? 'Cu' : 'Al') as 'Al' | 'Cu';
  const rho = materiaal === 'Cu' ? 0.0175 : 0.028;
  const stroom = designStroomA(sectie, materiaal);
  const cosPhi = 0.9;
  const spanning = 400;

  const spanningsval = spanningsvalLsV(input.lengteM, stroom, sectie, rho, cosPhi);
  const spanningsvalPct = (spanningsval / spanning) * 100;
  const belastbaarheid = belastbaarheidLsA(sectie, materiaal);
  const kortsluitA = 12000;
  const kortsluitTijdS = 0.4;
  const k = materiaal === 'Cu' ? 143 : 94;
  const thermischOk = thermischKortsluitVoldoet(kortsluitA, kortsluitTijdS, sectie, k);

  return [
    {
      type: 'spanningsval',
      discipline: 'elektra_ls',
      normReferentie: 'NEN 1010 / NEN-EN 50160',
      invoer: {
        lengteM: input.lengteM,
        stroomA: stroom,
        sectieMm2: sectie,
        spanningV: spanning,
        netType: input.netType,
      },
      resultaat: {
        spanningsvalV: Math.round(spanningsval * 10) / 10,
        spanningsvalPct: Math.round(spanningsvalPct * 100) / 100,
        voldoet: spanningsvalPct <= 3,
      },
      aannames: [
        `Ontwerpbelasting ${stroom} A (75% van Ia)`,
        `${input.netType}`,
        'cos φ = 0,9',
        'Temperatuur grond 20°C',
      ],
      conclusie: spanningsvalPct <= 3
        ? `Spanningsval ${spanningsval.toFixed(1)} V (${spanningsvalPct.toFixed(2)}%) — binnen norm ≤3%`
        : `Spanningsval ${spanningsval.toFixed(1)} V (${spanningsvalPct.toFixed(2)}%) — overschrijdt 3%`,
    },
    {
      type: 'kabelbelastbaarheid',
      discipline: 'elektra_ls',
      normReferentie: 'NEN 1010 Tabel 52C',
      invoer: {
        stroomA: stroom,
        belastbaarheidA: belastbaarheid,
        legtype: input.legtechniek ?? 'open_ontgraving',
      },
      resultaat: {
        benuttingPct: Math.round((stroom / belastbaarheid) * 100),
        voldoet: stroom <= belastbaarheid,
      },
      aannames: [
        input.legtechniek === 'hdd' ? 'HDD — thermische weerstand hoger dan open ontgraving' : 'Open ontgraving',
        'Geen bundeling',
        'Grondtemperatuur 20°C',
      ],
      conclusie: stroom <= belastbaarheid
        ? `Belasting ${stroom} A — benutting ${Math.round((stroom / belastbaarheid) * 100)}% van Ia = ${belastbaarheid} A`
        : `Belasting ${stroom} A overschrijdt Ia = ${belastbaarheid} A`,
    },
    {
      type: 'kortsluit',
      discipline: 'elektra_ls',
      normReferentie: 'NEN 1010 (adiabatisch)',
      invoer: {
        kortsluitA: kortsluitA,
        tijdS: kortsluitTijdS,
        sectieMm2: sectie,
        kConstant: k,
      },
      resultaat: {
        thermischVoldoet: thermischOk,
        i2t: Math.round(kortsluitA * kortsluitA * kortsluitTijdS),
        limietI2t: k * k * sectie * sectie,
      },
      aannames: ['Icc aan begin tracé 12 kA', 'Afschakeltijd 0,4 s', `Materiaal ${materiaal} XLPE/GPLK`],
      conclusie: thermischOk
        ? 'Kabel thermisch bestand bij kortsluitstroom (adiabatische check I²t ≤ k²S²)'
        : 'Thermische kortsluitweerstand onvoldoende — grotere sectie of snellere beveiliging',
    },
  ];
}
