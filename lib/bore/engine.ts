import type {
  BoreCalcResult,
  BoreEngineeringResult,
  BorePlan,
  BoreSegmentInput,
  BoreSegmentResult,
} from './types';
import type { DemoTrace } from '@/demo/traces';
import { buildBoreSegmentInput, sleuflozeSegmenten } from '@/demo/bore-data';
import { normVermelding } from '@/lib/normen';
import { BORE_METHODE_LABELS } from './types';
import {
  boormediumVolumeM3,
  hddTrekkrachtKN,
  kroonDekkingM,
  maxToelaatbareKrachtKN,
  minBoogstraalM,
  persingDuwkrachtKN,
  sleufloosKrachtKN,
} from './formulas';
import { berekenMudspanning } from './mud';
import { berekenSterkte } from './sterkte';
import { berekenZetting } from './zetting';

/** Boorgatdiameter incl. overcut (mm) — consistent met boormediumberekening. */
function boorgatDiameterMm(input: BoreSegmentInput): number {
  return input.buisDiameterMm + 75;
}

/** Diepte boorhart onder maaiveld (m) op het diepste punt. */
function maxDiepteOnderMvM(input: BoreSegmentInput): number {
  return Math.max(0, input.maaiveldNap - input.trajectory.maxDiepteNap);
}

/** Grondwaterstand onder maaiveld (m). */
function grondwaterDiepteM(input: BoreSegmentInput): number {
  return Math.max(0, input.maaiveldNap - input.grondwaterNap);
}

function calcTrajectory(input: BoreSegmentInput): BoreCalcResult {
  const minR = minBoogstraalM(input.buisDiameterMm, input.methode);
  const voldoet = input.trajectory.boogstraalM >= minR;
  const kroon = input.trajectory.maxDiepteNap - input.buisDiameterMm / 2000;
  const dekking = kroonDekkingM(input.maaiveldNap, kroon);

  return {
    type: 'boogtraject',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: input.methode === 'hdd' ? 'NEN 3650 / ASTM F1962' : 'CUR 116 / NEN 3650',
    invoer: {
      lengteM: input.lengteM,
      boogstraalM: input.trajectory.boogstraalM,
      minBoogstraalM: minR,
      entryAngleDeg: input.trajectory.entryAngleDeg,
      exitAngleDeg: input.trajectory.exitAngleDeg,
      maxDiepteNap: input.trajectory.maxDiepteNap,
    },
    resultaat: {
      voldoet,
      kroonDekkingM: Math.round(dekking * 100) / 100,
      dekkingVoldoet: dekking >= input.vereisteDekking,
    },
    aannames: [
      `Boogstraal ${input.trajectory.boogstraalM.toFixed(1)} m (min. ${minR.toFixed(1)} m)`,
      `Insteek ${input.trajectory.entryAngleDeg}° / uittrek ${input.trajectory.exitAngleDeg}°`,
    ],
    conclusie: voldoet && dekking >= input.vereisteDekking
      ? `Boogtraject voldoet — kroondekking ${dekking.toFixed(2)} m`
      : `Boogtraject controleren — ${!voldoet ? 'boogstraal te klein' : 'dekking onvoldoende'}`,
  };
}

function calcKracht(input: BoreSegmentInput): BoreCalcResult {
  const kracht =
    input.methode === 'hdd'
      ? hddTrekkrachtKN(input)
      : input.methode === 'persing'
        ? persingDuwkrachtKN(input)
        : sleufloosKrachtKN(input);
  const max = maxToelaatbareKrachtKN(input.methode, input.buisDiameterMm);
  const voldoet = kracht <= max;

  return {
    type: input.methode === 'persing' ? 'duwkracht' : 'trekkracht',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: input.methode === 'hdd' ? 'ASTM F1962 / Delft boormethodiek' : 'CUR 116',
    invoer: {
      lengteM: input.lengteM,
      buisDiameterMm: input.buisDiameterMm,
      grondFactor: input.grondFactor,
      dominantGrondsoort: input.dominantGrondsoort,
    },
    resultaat: {
      krachtKN: kracht,
      maxToelaatbaarKN: max,
      voldoet,
      benuttingPct: Math.round((kracht / max) * 100),
    },
    aannames: [
      `Grond: ${input.dominantGrondsoort} (factor ${input.grondFactor})`,
      `${input.sonderingen.length} CPT(s) gekoppeld`,
    ],
    conclusie: voldoet
      ? `${input.methode === 'persing' ? 'Duw' : 'Trek'}kracht ${kracht} kN — binnen machinecapaciteit (${max} kN)`
      : `Kracht ${kracht} kN overschrijdt indicatieve limiet ${max} kN — traject of diameter herzien`,
  };
}

function calcGrond(input: BoreSegmentInput): BoreCalcResult {
  const gw = input.grondwaterNap;
  const dieperDanGw = input.trajectory.maxDiepteNap < gw;
  const qcGem =
    input.sonderingen.reduce((s, x) => s + x.qc, 0) / Math.max(input.sonderingen.length, 1);

  return {
    type: 'grondmechanisch',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: 'NEN-EN-ISO 22476-1 / BRO CPT',
    invoer: {
      sonderingCount: input.sonderingen.length,
      gemQc: Math.round(qcGem * 10) / 10,
      grondwaterNap: gw,
      maxDiepteNap: input.trajectory.maxDiepteNap,
    },
    resultaat: {
      geschikt: qcGem >= 5 && !input.dominantGrondsoort.includes('veen'),
      grondwaterRisico: dieperDanGw,
      voldoet: qcGem >= 5,
    },
    aannames: input.sonderingen.map((s) => `${s.id}: qc=${s.qc} MPa`),
    conclusie:
      qcGem >= 5
        ? `Grond geschikt voor ${BORE_METHODE_LABELS[input.methode]} — gem. qc ${qcGem.toFixed(1)} MPa`
        : `Zwakke grondlaag — aanvullend sonderonderzoek of grondverbetering overwegen`,
  };
}

function calcBoormedium(input: BoreSegmentInput): BoreCalcResult | null {
  if (input.methode !== 'hdd') return null;
  const boorgatD = input.buisDiameterMm + 75;
  const volume = boormediumVolumeM3(input.lengteM, boorgatD);

  return {
    type: 'boormedium',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: 'IGEM/TD/1 / milieuregels',
    invoer: { boorgatDiameterMm: boorgatD, lengteM: input.lengteM },
    resultaat: { volumeM3: volume, voldoet: true },
    aannames: ['Bentoniet suspensie', '15% extra voor verlies'],
    conclusie: `Boormedium ${volume} m³ bentoniet — afvoer en depot conform milieuregels plannen`,
  };
}

/** Mudspanning + blow-out check (Delftse methode, alleen HDD). */
function calcMudspanning(input: BoreSegmentInput): BoreCalcResult | null {
  if (input.methode !== 'hdd') return null;
  const res = berekenMudspanning({
    lengteM: input.lengteM,
    maxDiepteOnderMvM: maxDiepteOnderMvM(input),
    entryAngleDeg: input.trajectory.entryAngleDeg,
    exitAngleDeg: input.trajectory.exitAngleDeg,
    grondwaterDiepteM: grondwaterDiepteM(input),
    dominantGrondsoort: input.dominantGrondsoort,
    boorgatDiameterMm: boorgatDiameterMm(input),
  });
  const krit = res.kritischPunt;

  return {
    type: 'mudspanning',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: `${normVermelding('nen3650')} (Delftse methode) / ${normVermelding('nen3651')}`,
    invoer: {
      lengteM: input.lengteM,
      maxDiepteOnderMvM: Math.round(maxDiepteOnderMvM(input) * 100) / 100,
      boorgatDiameterMm: boorgatDiameterMm(input),
      grondwaterDiepteM: Math.round(grondwaterDiepteM(input) * 100) / 100,
      dominantGrondsoort: input.dominantGrondsoort,
    },
    resultaat: {
      voldoet: res.voldoet,
      minimaleMarge: Number.isFinite(res.minimaleMarge) ? res.minimaleMarge : -1,
      kritischeAfstandM: krit?.afstandM ?? -1,
      kritischeDiepteM: krit?.diepteM ?? -1,
      pMinKritiekKpa: krit?.pMinKpa ?? -1,
      pMaxKritiekKpa: krit?.pMaxKpa ?? -1,
      aantalPunten: res.punten.length,
    },
    aannames: res.aannames,
    conclusie: res.conclusie,
  };
}

/** Sterktecontrole productbuis (HDPE) — HDD en persing. */
function calcSterkteBuis(input: BoreSegmentInput): BoreCalcResult | null {
  if (input.methode !== 'hdd' && input.methode !== 'persing') return null;
  const kracht =
    input.methode === 'hdd' ? hddTrekkrachtKN(input) : persingDuwkrachtKN(input);
  const res = berekenSterkte({
    buisDiameterMm: input.buisDiameterMm,
    trekkrachtKN: kracht,
    boogstraalM: input.trajectory.boogstraalM,
    diepteM: maxDiepteOnderMvM(input),
    grondwaterDiepteM: grondwaterDiepteM(input),
  });

  return {
    type: 'sterkte_buis',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: `${normVermelding('nen3650')} / ${normVermelding('astmF1962')}`,
    invoer: {
      buisDiameterMm: input.buisDiameterMm,
      sdr: 11,
      krachtKN: kracht,
      boogstraalM: input.trajectory.boogstraalM,
      diepteM: Math.round(maxDiepteOnderMvM(input) * 100) / 100,
    },
    resultaat: {
      voldoet: res.voldoet,
      pCrKpa: res.pCrKpa,
      pExtKpa: res.pExtKpa,
      bucklingSF: res.bucklingSF,
      bucklingVoldoet: res.bucklingVoldoet,
      sigmaTrekMpa: res.sigmaTrekMpa,
      sigmaBuigMpa: res.sigmaBuigMpa,
      unityCheck: res.unityCheck,
      unityVoldoet: res.unityVoldoet,
    },
    aannames: [
      ...res.aannames,
      ...(input.methode === 'persing'
        ? ['Persing: duwkracht als axiale kracht getoetst (drukspanning, zelfde unity-benadering)']
        : []),
    ],
    conclusie: res.conclusie,
  };
}

/** Zettingsindicatie boven de boring (alleen HDD). */
function calcZetting(input: BoreSegmentInput): BoreCalcResult | null {
  if (input.methode !== 'hdd') return null;
  const res = berekenZetting({
    boorgatDiameterMm: boorgatDiameterMm(input),
    diepteAsM: maxDiepteOnderMvM(input),
    dominantGrondsoort: input.dominantGrondsoort,
  });

  return {
    type: 'zetting',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: `${normVermelding('nen3650')} / ${normVermelding('nen3651')}`,
    invoer: {
      boorgatDiameterMm: boorgatDiameterMm(input),
      diepteAsM: Math.round(maxDiepteOnderMvM(input) * 100) / 100,
      dominantGrondsoort: input.dominantGrondsoort,
    },
    resultaat: {
      voldoet: res.voldoet,
      sMaxMm: res.sMaxMm,
      iM: res.iM,
      trogBreedteM: res.trogBreedteM,
      beoordeling: res.beoordeling,
      volumeVerliesPct: Math.round(res.volumeVerliesFractie * 1000) / 10,
    },
    aannames: res.aannames,
    conclusie: res.conclusie,
  };
}

function calcPutten(input: BoreSegmentInput): BoreCalcResult {
  const t = input.trajectory;
  return {
    type: 'start_eind_put',
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    normReferentie: 'NEN 7171 / netbeheerder',
    invoer: { wegnaam: input.wegnaam },
    resultaat: {
      entryPut: `${t.entryPutL}×${t.entryPutB}×${t.entryPutD} m`,
      exitPut: `${t.exitPutL}×${t.exitPutB}×${t.exitPutD} m`,
      voldoet: true,
    },
    aannames: ['Putten buiten rijbaan', 'Funderingssysteem afhankelijk van grondwater'],
    conclusie: `Startput ${t.entryPutL}×${t.entryPutB} m, eindput ${t.exitPutL}×${t.exitPutB} m — ruimte reserveren in uitvoeringsplanning`,
  };
}

function buildBorePlan(input: BoreSegmentInput, berekeningen: BoreCalcResult[]): BorePlan {
  const krachtCalc = berekeningen.find((b) => b.type === 'trekkracht' || b.type === 'duwkracht');
  const grondCalc = berekeningen.find((b) => b.type === 'grondmechanisch');
  const risicos: string[] = [];
  const maatregelen: string[] = [];

  if (grondCalc?.resultaat.grondwaterRisico) {
    risicos.push('Boortraject onder grondwaterstand');
    maatregelen.push('Grondwaterverlaging of loodrechte startput met pomp');
  }
  if (input.dominantGrondsoort.includes('klei')) {
    risicos.push('Kleilagen — verhoogde wrijving');
    maatregelen.push('Boormedium samenstelling optimaliseren, hogere trekkracht reserveren');
  }
  if (krachtCalc && !krachtCalc.resultaat.voldoet) {
    risicos.push('Hoge trek-/duwkracht');
    maatregelen.push('Traject vereenvoudigen of grotere boogstraal');
  }

  return {
    segmentVolgorde: input.volgorde,
    methode: input.methode,
    label: `${BORE_METHODE_LABELS[input.methode]} — ${input.wegnaam}`,
    samenvatting: `${input.lengteM} m ${BORE_METHODE_LABELS[input.methode].toLowerCase()} onder ${input.wegnaam}, Ø${input.buisDiameterMm} mm mantelbuis, max. diepte ${input.trajectory.maxDiepteNap.toFixed(2)} m NAP.`,
    lengteM: input.lengteM,
    maaiveldNap: input.maaiveldNap,
    grondwaterNap: input.grondwaterNap,
    vereisteDekking: input.vereisteDekking,
    trajectory: input.trajectory,
    sonderingRefs: input.sonderingen.map((s) => s.id),
    risicos: risicos.length ? risicos : ['Geen bijzondere risico\'s geïdentificeerd'],
    maatregelen: maatregelen.length ? maatregelen : ['Standaard uitvoering conform netbeheerder'],
    uitvoeringsvolgorde: [
      '1. Start- en eindput ontgraven + fundering',
      '2. Boormachine positioneren en kalibratie',
      input.methode === 'hdd'
        ? '3. Pilotboring + vergraving + productleiding intrekken'
        : input.methode === 'persing'
          ? '3. Persing met jacking station + segmenten'
          : '3. Sleufloze kabeltrekking / gestuurde boring',
      '4. Aansluiting mantelbuis + afdichting putten',
      '5. As-built meting + revisie tekeningen',
    ],
  };
}

function runSegmentEngineering(input: BoreSegmentInput): BoreSegmentResult {
  const berekeningen: BoreCalcResult[] = [
    calcTrajectory(input),
    calcKracht(input),
    calcGrond(input),
    calcPutten(input),
  ];
  const medium = calcBoormedium(input);
  if (medium) berekeningen.push(medium);
  const mud = calcMudspanning(input);
  if (mud) berekeningen.push(mud);
  const sterkte = calcSterkteBuis(input);
  if (sterkte) berekeningen.push(sterkte);
  const zetting = calcZetting(input);
  if (zetting) berekeningen.push(zetting);

  return {
    volgorde: input.volgorde,
    methode: input.methode,
    label: `${BORE_METHODE_LABELS[input.methode]} — ${input.wegnaam} (${input.lengteM} m)`,
    berekeningen,
    boorplan: buildBorePlan(input, berekeningen),
    sonderingen: input.sonderingen,
  };
}

export function runBoreEngineering(
  trace: DemoTrace,
  selectedVolgordes?: number[],
): BoreEngineeringResult {
  const segments = sleuflozeSegmenten(trace);
  const selected = selectedVolgordes?.length
    ? segments.filter((s) => selectedVolgordes.includes(s.volgorde))
    : segments;

  const results: BoreSegmentResult[] = [];
  for (const seg of selected) {
    const input = buildBoreSegmentInput(trace, seg);
    if (input) results.push(runSegmentEngineering(input));
  }

  return {
    traceId: trace.id,
    traceCode: trace.code,
    segmenten: results,
  };
}

export function heeftSleuflozeSegmenten(trace: DemoTrace): boolean {
  return sleuflozeSegmenten(trace).length > 0;
}
