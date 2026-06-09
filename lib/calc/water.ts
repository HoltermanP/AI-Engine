import type { CalcInput, CalcResult } from './types';
import { hazenWilliamsVerliesM, waterSnelheidMs, peWanddikteMm } from './formulas';

function maxDebietLs(diameterMm: number, maxSnelheidMs = 2.0): number {
  const dM = diameterMm / 1000;
  const qM3s = (Math.PI * dM * dM * maxSnelheidMs) / 4;
  return Math.round(qM3s * 1000);
}

export function calcWater(input: CalcInput): CalcResult[] {
  const diameter = input.diameterMm ?? 315;
  const diameterM = diameter / 1000;
  const maxDebiet = maxDebietLs(diameter);
  const debietLs = Math.min(50, Math.round(maxDebiet * 0.5));
  const debietM3s = debietLs / 1000;
  const C = input.materiaal === 'PE' ? 150 : 130;

  const drukverlies = hazenWilliamsVerliesM(input.lengteM, diameterM, debietM3s, C);
  const snelheid = waterSnelheidMs(debietM3s, diameterM);
  const wanddikte = input.materiaal === 'PE' ? peWanddikteMm(diameter, 16) : undefined;

  const results: CalcResult[] = [
    {
      type: 'hydraulisch',
      discipline: 'water',
      normReferentie: 'Hazen-Williams / NEN-EN 805',
      invoer: {
        lengteM: input.lengteM,
        diameterMm: diameter,
        debietLs,
        Cfactor: C,
        netType: input.netType,
      },
      resultaat: {
        drukverliesMwk: Math.round(drukverlies * 100) / 100,
        voldoet: drukverlies < 5,
      },
      aannames: [
        `${input.netType || `Ø${diameter}`}`,
        `C = ${C}`,
        `Ontwerpdebiet ${debietLs} l/s (${debietM3s} m³/s)`,
      ],
      conclusie: drukverlies < 5
        ? `Drukverlies ${drukverlies.toFixed(2)} mwk over ${input.lengteM} m — binnen norm`
        : `Drukverlies ${drukverlies.toFixed(2)} mwk — te hoog, diameter of debiet herzien`,
    },
    {
      type: 'diameterkeuze',
      discipline: 'water',
      normReferentie: 'NEN-EN 805',
      invoer: { benodigdDebietLs: debietLs, gekozenDiameterMm: diameter },
      resultaat: {
        voldoet: snelheid >= 0.3 && snelheid <= 2.0,
        snelheidMs: Math.round(snelheid * 1000) / 1000,
        maxDebietLs: maxDebiet,
      },
      aannames: ['Min. snelheid 0,3 m/s (stagnatie)', 'Max. snelheid 2,0 m/s (erosie)'],
      conclusie:
        snelheid >= 0.3 && snelheid <= 2.0
          ? `Ø${diameter} voldoet — stroomsnelheid ${snelheid.toFixed(2)} m/s`
          : `Stroomsnelheid ${snelheid.toFixed(2)} m/s buiten bandbreedte 0,3–2,0 m/s`,
    },
    {
      type: 'capaciteit',
      discipline: 'water',
      normReferentie: 'NEN-EN 805',
      invoer: { diameterMm: diameter, debietLs },
      resultaat: {
        maxDebietLs: maxDebiet,
        benuttingPct: Math.round((debietLs / maxDebiet) * 100),
        voldoet: debietLs <= maxDebiet,
      },
      aannames: ['Transportleiding', 'PN16'],
      conclusie: `Capaciteitsbenutting ${Math.round((debietLs / maxDebiet) * 100)}% bij ontwerpdebiet ${debietLs} l/s`,
    },
  ];

  if (wanddikte !== undefined) {
    results.push({
      type: 'wanddikte',
      discipline: 'water',
      normReferentie: 'NEN-EN 12201',
      invoer: { diameterMm: diameter, drukBar: 16 },
      resultaat: { wanddikteMm: Math.round(wanddikte * 10) / 10, voldoet: wanddikte >= 6.2 },
      aannames: ['PE100 SDR11 benadering', 'Ontwerpdruk 16 bar'],
      conclusie: `Berekende wanddikte ${wanddikte.toFixed(1)} mm voor PE Ø${diameter}`,
    });
  }

  return results;
}
