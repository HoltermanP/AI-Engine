import type { CalcInput, CalcResult } from './types';
import { gasSnelheidMs, renouardDrukverliesMbar } from './formulas';

/** Max. debiet DN110 PE SDR11 bij 6 m/s (m³/h) */
function maxDebietM3h(diameterMm: number, maxSnelheidMs = 6): number {
  const dM = diameterMm / 1000;
  const qM3s = (Math.PI * dM * dM * maxSnelheidMs) / 4;
  return Math.round(qM3s * 3600);
}

export function calcGasLd(input: CalcInput): CalcResult[] {
  const diameter = input.diameterMm ?? 110;
  const druk = 200;
  const maxDebiet = maxDebietM3h(diameter);
  const debiet = Math.min(150, Math.round(maxDebiet * 0.55));

  const drukverliesMbar = renouardDrukverliesMbar(input.lengteM, diameter, debiet);
  const snelheid = gasSnelheidMs(debiet, diameter);
  const benutting = Math.round((debiet / maxDebiet) * 100);

  return [
    {
      type: 'drukverlies',
      discipline: 'gas_ld',
      normReferentie: 'NEN 7240 (Renouard)',
      invoer: {
        lengteM: input.lengteM,
        diameterMm: diameter,
        debietM3h: debiet,
        drukMbar: druk,
        netType: input.netType,
      },
      resultaat: {
        drukverliesMbar: Math.round(drukverliesMbar * 100) / 100,
        voldoet: drukverliesMbar < 1.0,
      },
      aannames: ['PE100 SDR11', `Ontwerpdebiet ${debiet} m³/h`, 'Aardgas G = 0,6'],
      conclusie: drukverliesMbar < 1.0
        ? `Drukverlies ${drukverliesMbar.toFixed(2)} mbar — binnen max 1,0 mbar (NEN 7240)`
        : `Drukverlies ${drukverliesMbar.toFixed(2)} mbar — overschrijdt 1,0 mbar`,
    },
    {
      type: 'diameterkeuze',
      discipline: 'gas_ld',
      normReferentie: 'NEN 7240',
      invoer: { benodigdDebietM3h: debiet, gekozenDiameterMm: diameter },
      resultaat: {
        voldoet: snelheid <= 6,
        maxDebietM3h: maxDebiet,
        snelheidMs: Math.round(snelheid * 100) / 100,
      },
      aannames: ['Max. stroomsnelheid 6 m/s in PE', `DN${diameter} PE`],
      conclusie: snelheid <= 6
        ? `DN${diameter} voldoet — stroomsnelheid ${snelheid.toFixed(2)} m/s`
        : `Stroomsnelheid ${snelheid.toFixed(2)} m/s te hoog — grotere diameter vereist`,
    },
    {
      type: 'capaciteit',
      discipline: 'gas_ld',
      normReferentie: 'NEN 7240',
      invoer: { diameterMm: diameter, drukMbar: druk, debietM3h: debiet },
      resultaat: { maxDebietM3h: maxDebiet, benuttingPct: benutting, voldoet: benutting <= 80 },
      aannames: ['Max. stroomsnelheid 6 m/s'],
      conclusie: `Capaciteitsbenutting ${benutting}% bij ontwerpdebiet ${debiet} m³/h`,
    },
  ];
}
