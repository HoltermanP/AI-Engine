import type { CalcInput, CalcResult } from './types';
import { spanningsvalMsPct } from './formulas';

export function calcElektraMs(input: CalcInput): CalcResult[] {
  const spanningKV = input.spanningKV ?? 20;
  const stroom = 180;
  const sectie = input.sectieMm2 ?? 300;
  const spanningsvalPct = spanningsvalMsPct(input.lengteM, stroom, sectie, spanningKV);
  const belastbaarheid = 420;

  return [
    {
      type: 'spanningsval',
      discipline: 'elektra_ms',
      normReferentie: 'NEN-EN 50443 / netbeheerder eisen',
      invoer: {
        spanningKV,
        lengteM: input.lengteM,
        stroomA: stroom,
        sectieMm2: sectie,
        netType: input.netType,
      },
      resultaat: {
        spanningsvalPct: Math.round(spanningsvalPct * 100) / 100,
        voldoet: spanningsvalPct <= 5,
      },
      aannames: [`XLPE ${sectie} mm² ${spanningKV} kV`, 'Belasting 180 A', 'cos φ = 0,9'],
      conclusie: spanningsvalPct <= 5
        ? `Spanningsval ${spanningsvalPct.toFixed(2)}% — binnen norm ≤5%`
        : `Spanningsval ${spanningsvalPct.toFixed(2)}% — overschrijdt 5%`,
    },
    {
      type: 'kabelbelastbaarheid',
      discipline: 'elektra_ms',
      normReferentie: 'IEC 60287 / NEN 7171',
      invoer: { stroomA: stroom, belastbaarheidA: belastbaarheid },
      resultaat: {
        benuttingPct: Math.round((stroom / belastbaarheid) * 100),
        voldoet: stroom <= belastbaarheid,
      },
      aannames: ['Open ontgraving', 'Rijafstand 0,3 m', 'Grondresistiviteit 1,0 K·m/W'],
      conclusie: `Stroombelasting ${stroom} A — benutting ${Math.round((stroom / belastbaarheid) * 100)}%`,
    },
    {
      type: 'netberekening',
      discipline: 'elektra_ms',
      normReferentie: 'Indicatief ringnet',
      invoer: { lengteM: input.lengteM, knooppuntBelastingKVA: 3500 },
      resultaat: {
        belastingKVA: 3500,
        reservePct: 22,
        ringSluiting: 'open',
        voldoet: true,
      },
      aannames: ['Ringstructuur 20kV', 'N-1 criterion indicatief'],
      conclusie: 'Knooppuntbelasting 3,5 MVA — 22% reserve beschikbaar (indicatief)',
    },
  ];
}
