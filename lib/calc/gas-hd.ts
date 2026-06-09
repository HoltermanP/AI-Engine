import type { CalcInput, CalcResult } from './types';
import { gasSnelheidMs, weymouthDrukverliesBar } from './formulas';

/** Barlow: t = (P·D) / (2·S·E·F) — vereenvoudigd toelaatbare druk */
function toelaatbareDrukBar(diameterMm: number, wanddikteMm: number, SMYS = 450): number {
  const E = 0.72;
  const F = 0.9;
  return (2 * SMYS * wanddikteMm * E * F) / diameterMm;
}

export function calcGasHd(input: CalcInput): CalcResult[] {
  const diameter = input.diameterMm ?? 400;
  const wanddikte = diameter >= 400 ? 11.0 : 8.8;
  const druk = 40;
  const debiet = 50000;
  const lengteKm = input.lengteM / 1000;

  const toelaatbaar = toelaatbareDrukBar(diameter, wanddikte);
  const drukverlies = weymouthDrukverliesBar(lengteKm, diameter, debiet);
  const maxDebiet = 85000;
  const snelheid = gasSnelheidMs(debiet, diameter);

  return [
    {
      type: 'wanddikte_sterkte',
      discipline: 'gas_hd',
      normReferentie: 'NEN 3650 / NEN 3651',
      invoer: {
        diameterMm: diameter,
        wanddikteMm: wanddikte,
        drukBar: druk,
        SMYS: 450,
        netType: input.netType,
      },
      resultaat: {
        toelaatbareDrukBar: Math.round(toelaatbaar * 10) / 10,
        voldoet: toelaatbaar >= druk * 1.1,
        materiaal: 'L360NB',
      },
      aannames: ['SMYS 450 MPa', 'Ontwerpfactor 0,72', 'Staal L360NB'],
      conclusie: toelaatbaar >= druk * 1.1
        ? `Wanddikte ${wanddikte} mm bij DN${diameter} — toelaatbaar tot ${toelaatbaar.toFixed(1)} bar (NEN 3650)`
        : `Wanddikte ${wanddikte} mm onvoldoend voor ontwerpdruk ${druk} bar`,
    },
    {
      type: 'drukverlies',
      discipline: 'gas_hd',
      normReferentie: 'NEN 3650 Bijlage D (Weymouth)',
      invoer: { lengteKm, diameterMm: diameter, debietM3h: debiet, drukBar: druk },
      resultaat: {
        drukverliesBar: Math.round(drukverlies * 1000) / 1000,
        voldoet: drukverlies < 0.5,
      },
      aannames: [`Debiet ${debiet.toLocaleString('nl-NL')} m³/h`, 'Ruwheid 0,045 mm', 'Aardgas G = 0,6'],
      conclusie: drukverlies < 0.5
        ? `Drukverlies ${drukverlies.toFixed(3)} bar over ${input.lengteM} m — binnen norm`
        : `Drukverlies ${drukverlies.toFixed(3)} bar — te hoog voor ontwerp`,
    },
    {
      type: 'capaciteit',
      discipline: 'gas_hd',
      normReferentie: 'NEN 3650',
      invoer: { diameterMm: diameter, drukBar: druk, debietM3h: debiet },
      resultaat: {
        maxDebietM3h: maxDebiet,
        benuttingPct: Math.round((debiet / maxDebiet) * 100),
        snelheidMs: Math.round(snelheid * 100) / 100,
        voldoet: snelheid <= 15,
      },
      aannames: ['Max. stroomsnelheid 15 m/s'],
      conclusie: `Capaciteit ${maxDebiet.toLocaleString('nl-NL')} m³/h — benutting ${Math.round((debiet / maxDebiet) * 100)}%, snelheid ${snelheid.toFixed(1)} m/s`,
    },
    {
      type: 'kruising',
      discipline: 'gas_hd',
      normReferentie: 'NEN 3651',
      invoer: {
        mantelbuisDN: Math.ceil(diameter * 1.5 / 50) * 50,
        kruisingsdiepteM: Math.max(input.vereisteDekking, 2.0),
        bescherming: 'mantelbuis + PE-coating',
      },
      resultaat: {
        voldoet: input.vereisteDekking >= 1.0,
        minAfstandM: 1.0,
      },
      aannames: ['Kruising onder infrastructuur', 'Mantelbuis conform NEN 3651'],
      conclusie: input.vereisteDekking >= 1.0
        ? 'Kruisingsconstructie conform NEN 3651 — mantelbuis en dekking voldoende'
        : 'Kruisingsdiepte/dekking controleren — mogelijk mantelbuis vereist',
    },
  ];
}
