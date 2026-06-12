'use server';

import { getDemoNetontwerp, saveDemoNetontwerp } from '@/lib/db/netontwerp-store';
import { addDemoTrace, getDemoTrace, getDemoTraces, saveDemoTraceOverride } from '@/lib/db/demo-store';
import { DEMO_TRACES, type DemoTrace } from '@/demo/traces';
import type { Netvlak } from '@/lib/netontwerp/types';
import type {
  Netontwerp,
  NetontwerpAsset,
  StationOntwerp,
} from '@/lib/netontwerp/types';
import { defaultUitgangspunten, legeStappenStatus } from '@/lib/netontwerp/types';
import {
  vindKabelAdvies,
  getKabelSpec,
  type KabelAdvies,
} from '@/lib/netontwerp/kabel-catalogus';
import { totaalBelastingKVA, stroomUitKVA } from '@/lib/netontwerp/belastingen';
import {
  adviseerStations,
  bepaalRingVolgorde,
  type StationsAdvies,
} from '@/lib/netontwerp/stations-advies';
import { planAutomaticTraceAction } from './trace-routing';
import { routingSegmentsToTraceSegmenten } from '@/lib/services/trace-routing/persist';
import { adviseerMoffen, adviseerMantelbuizen } from '@/lib/netontwerp/moffen-advies';
import { bouwStationOntwerp } from '@/lib/netontwerp/station-ontwerp';
import { lijnLengteM } from '@/lib/netontwerp/chainage';
import { calcElektraLs } from '@/lib/calc/elektra-ls';
import { calcElektraMs } from '@/lib/calc/elektra-ms';
import { berekenAmpacity, type GeleiderDoorsnede } from '@/lib/calc/thermisch';
import type { CalcResult } from '@/lib/calc/types';
import type { TraceLines } from '@/lib/trace-edit';
import { saveTekeningenToDossier } from '@/lib/dossier/store';
import { generateStationEenlijn } from '@/lib/drawings/station-eenlijn';
import { generateStationPlattegrond } from '@/lib/drawings/station-plattegrond';
import { generateWerktekening } from '@/lib/drawings/werktekening';
import type { DrawingResult } from '@/lib/drawings/types';

export async function getNetontwerpAction(projectId: string): Promise<Netontwerp> {
  const bestaand = getDemoNetontwerp(projectId);
  if (bestaand) return bestaand;
  return {
    id: `netontwerp-${projectId}`,
    projectId,
    naam: 'Nieuw netontwerp',
    uitgangspunten: defaultUitgangspunten(),
    aansluitingen: [],
    assets: [],
    kabelKeuzes: [],
    stationsOntwerpen: [],
    traceIds: [],
    stappenStatus: legeStappenStatus(),
    bijgewerktOp: new Date().toISOString(),
  };
}

export async function saveNetontwerpAction(ontwerp: Netontwerp): Promise<Netontwerp> {
  return saveDemoNetontwerp(ontwerp);
}

/** Verse tracédata (bijv. een zojuist gegenereerd ringtracé) voor de kaart. */
export async function getNetontwerpTracesAction(traceIds: string[]): Promise<DemoTrace[]> {
  return traceIds.map((id) => getDemoTrace(id)).filter((t): t is DemoTrace => t !== null);
}

/**
 * Nieuwe streng (LS of MS) aanmaken vanuit het netontwerp. Het tracé start
 * leeg en wordt in stap 2 op de kaart geschetst; daarna doet het mee in de
 * hele bestaande keten (berekeningen, tekeningen, calculatie).
 */
export async function maakNieuwTraceAction(
  ontwerp: Netontwerp,
  netvlak: Netvlak,
  naam?: string,
): Promise<{ ontwerp: Netontwerp; trace: DemoTrace }> {
  const discipline = netvlak === 'MS' ? 'elektra_ms' : 'elektra_ls';
  const bestaande = getDemoTraces(ontwerp.projectId).filter((t) => t.discipline === discipline);
  const volgnr = bestaande.length + 1;
  const code = `EL-${netvlak}-N${String(volgnr).padStart(2, '0')}`;
  const id = `trace-${netvlak.toLowerCase()}-nieuw-${ontwerp.projectId}-${volgnr}`;

  const trace: DemoTrace = {
    id,
    projectId: ontwerp.projectId,
    code,
    naam: naam ?? `Nieuwe ${netvlak}-streng ${volgnr}`,
    discipline,
    netType:
      netvlak === 'MS'
        ? `${ontwerp.uitgangspunten.spanningMsKV}kV XLPE 3x1x240 Al`
        : 'XLPE 4x240 Al',
    fase: 'VO',
    vereisteDekking: netvlak === 'MS' ? 1.0 : 0.6,
    kleur: netvlak === 'MS' ? '#c80000' : '#960000',
    wegnaam: '',
    leglocatie: 'berm',
    omschrijving: `Nieuwe ${netvlak}-streng uit netontwerp "${ontwerp.naam}"`,
    coordinates: [],
    traceLines: [[]],
    segmenten: [],
  };

  addDemoTrace(trace);
  const bijgewerkt = await saveDemoNetontwerp({
    ...ontwerp,
    traceIds: [...ontwerp.traceIds, id],
  });
  return { ontwerp: bijgewerkt, trace };
}

export interface KabelAdviesResultaat {
  traceId: string;
  traceNaam: string;
  lengteM: number;
  belastingKVA: number;
  belastingA: number;
  advies: KabelAdvies;
  berekeningen: CalcResult[];
}

/**
 * Kabeladvies per tracé van het ontwerp: ontwerpstroom uit de belastingen,
 * lichtste passende kabel uit de catalogus + onderbouwende NEN/IEC-berekeningen.
 */
export async function kabelAdviesAction(
  ontwerp: Netontwerp,
  traceId: string,
): Promise<KabelAdviesResultaat | null> {
  const trace = getDemoTrace(traceId);
  if (!trace) return null;

  const netvlak = trace.discipline === 'elektra_ms' ? 'MS' : 'LS';
  const kva = totaalBelastingKVA(ontwerp.aansluitingen, {
    netvlak,
    groeifactor: ontwerp.uitgangspunten.groeifactor,
  });
  // MS-voeding draagt ook de LS-belasting achter de stations
  const effectieveKva =
    netvlak === 'MS'
      ? kva +
        totaalBelastingKVA(ontwerp.aansluitingen, {
          netvlak: 'LS',
          groeifactor: ontwerp.uitgangspunten.groeifactor,
        })
      : kva;
  const stroomA = stroomUitKVA(effectieveKva, netvlak, ontwerp.uitgangspunten.spanningMsKV);

  const lijnen = (trace.traceLines.length ? trace.traceLines : [trace.coordinates]) as TraceLines;
  const lengteM = lijnen.reduce((s, l) => s + lijnLengteM(l), 0);

  const advies = vindKabelAdvies({
    netvlak,
    belastingA: Math.max(stroomA, 1),
    lengteM: Math.max(lengteM, 1),
    maxSpanningsvalPct:
      netvlak === 'LS'
        ? ontwerp.uitgangspunten.maxSpanningsvalLsPct
        : ontwerp.uitgangspunten.maxSpanningsvalMsPct,
    spanningKV: ontwerp.uitgangspunten.spanningMsKV,
  });

  const calcInput = {
    lengteM,
    netType: advies.advies.label,
    vereisteDekking: trace.vereisteDekking,
    discipline: trace.discipline,
    sectieMm2: advies.advies.sectieMm2,
    materiaal: advies.advies.materiaal,
    spanningKV: netvlak === 'MS' ? ontwerp.uitgangspunten.spanningMsKV : undefined,
  };
  const berekeningen = netvlak === 'MS' ? calcElektraMs(calcInput) : calcElektraLs(calcInput);

  // IEC 60287-ampacity (vol thermisch model) voor MS-keuzes met geldige doorsnede
  if (netvlak === 'MS' && [95, 150, 240, 400, 630].includes(advies.advies.sectieMm2)) {
    try {
      const thermisch = berekenAmpacity({
        geleiderMm2: advies.advies.sectieMm2 as GeleiderDoorsnede,
        materiaal: advies.advies.materiaal,
        legpatroon: 'driehoek',
        spanningKV: ontwerp.uitgangspunten.spanningMsKV,
        legdiepteM: Math.max(trace.vereisteDekking + 0.1, 0.6),
      });
      berekeningen.push({
        type: 'ampacity_iec60287',
        discipline: trace.discipline,
        categorie: 'elektra',
        normReferentie: 'IEC 60287-1-1 / IEC 60287-2-1',
        invoer: {
          sectieMm2: advies.advies.sectieMm2,
          materiaal: advies.advies.materiaal,
          legpatroon: 'driehoek',
          legdiepteM: Math.max(trace.vereisteDekking + 0.1, 0.6),
          rhoBodem: '1,0 K·m/W (NL nat)',
        },
        resultaat: {
          ampacityA: thermisch.ampacityA,
          ontwerpstroomA: Math.round(stroomA),
          benuttingPct: Math.round((stroomA / thermisch.ampacityA) * 100),
          dominanteWeerstand: thermisch.dominanteWeerstand,
          voldoet: stroomA <= thermisch.ampacityA * 0.8,
        },
        aannames: [
          'Bodemtemperatuur 15 °C, max. geleidertemperatuur 90 °C (XLPE)',
          'Eén circuit in driehoeksligging',
        ],
        conclusie:
          stroomA <= thermisch.ampacityA * 0.8
            ? `Thermisch ruim voldoende: ${Math.round(stroomA)} A ontwerp vs ${thermisch.ampacityA} A toelaatbaar (IEC 60287, ${thermisch.dominanteWeerstand} dominant)`
            : `Thermische benutting hoog (${Math.round((stroomA / thermisch.ampacityA) * 100)}%) — grotere doorsnede of gunstiger ligging overwegen`,
      });
    } catch {
      // >20 kV of onbekende sectie: vereenvoudigde berekening volstaat dan
    }
  }

  return {
    traceId,
    traceNaam: trace.naam,
    lengteM: Math.round(lengteM),
    belastingKVA: Math.round(effectieveKva),
    belastingA: Math.round(stroomA),
    advies,
    berekeningen,
  };
}

/** Kabelkeuze vastleggen: ook DemoTrace.netType bijwerken zodat de hele bestaande keten meegaat. */
export async function kiesKabelAction(
  ontwerp: Netontwerp,
  traceId: string,
  kabelId: string,
  bron: 'advies' | 'handmatig',
  motivatie?: string,
): Promise<Netontwerp> {
  const spec = getKabelSpec(kabelId);
  if (spec) {
    saveDemoTraceOverride(traceId, { netType: spec.label });
  }
  const keuzes = ontwerp.kabelKeuzes.filter((k) => k.traceId !== traceId);
  keuzes.push({ traceId, kabelId, bron, adviesMotivatie: motivatie });
  return saveDemoNetontwerp({ ...ontwerp, kabelKeuzes: keuzes });
}

export async function suggestStationsAction(ontwerp: Netontwerp): Promise<StationsAdvies> {
  const msTrace = ontwerp.traceIds
    .map((id) => getDemoTrace(id))
    .find((t) => t?.discipline === 'elektra_ms');
  const lsKeuze = ontwerp.kabelKeuzes
    .map((k) => getKabelSpec(k.kabelId))
    .find((k) => k?.netvlak === 'LS');

  return adviseerStations({
    aansluitingen: ontwerp.aansluitingen,
    uitgangspunten: ontwerp.uitgangspunten,
    msTraceLines: msTrace ? (msTrace.traceLines as TraceLines) : undefined,
    lsKabel: lsKeuze ? { sectieMm2: lsKeuze.sectieMm2, materiaal: lsKeuze.materiaal } : undefined,
  });
}

/** Auto-plaatsing moffen + mantelbuizen voor alle tracés met een kabelkeuze. */
export async function plaatsMoffenAction(ontwerp: Netontwerp): Promise<Netontwerp> {
  const handmatig = ontwerp.assets.filter(
    (a) => (a.type !== 'mof' && a.type !== 'mantelbuis') || a.bron === 'handmatig',
  );
  const nieuw: NetontwerpAsset[] = [];

  for (const keuze of ontwerp.kabelKeuzes) {
    const trace = getDemoTrace(keuze.traceId);
    const kabel = getKabelSpec(keuze.kabelId);
    if (!trace || !kabel) continue;
    const lijnen = (trace.traceLines.length ? trace.traceLines : [trace.coordinates]) as TraceLines;
    // GPLK-koppeling: het bestaande net (oorspronkelijk nettype vóór de
    // kabelkeuze-override) is GPLK terwijl de nieuwe kabel XLPE is
    const origineelNetType = DEMO_TRACES.find((t) => t.id === trace.id)?.netType ?? trace.netType;
    nieuw.push(
      ...adviseerMoffen({
        traceId: trace.id,
        traceLines: lijnen,
        kabel,
        koppeltAanGplk:
          origineelNetType.toUpperCase().includes('GPLK') && kabel.isolatie === 'XLPE',
      }),
      ...adviseerMantelbuizen({ trace, traceLines: lijnen, kabel }),
    );
  }

  return saveDemoNetontwerp({ ...ontwerp, assets: [...handmatig, ...nieuw] });
}

/** Genereer per stationsasset het eenlijn-/plattegrondontwerp. */
export async function genereerStationsontwerpenAction(
  ontwerp: Netontwerp,
): Promise<Netontwerp> {
  const msKeuze = ontwerp.kabelKeuzes
    .map((k) => getKabelSpec(k.kabelId))
    .find((k) => k?.netvlak === 'MS');
  const lsKeuze = ontwerp.kabelKeuzes
    .map((k) => getKabelSpec(k.kabelId))
    .find((k) => k?.netvlak === 'LS');

  const ontwerpen: StationOntwerp[] = ontwerp.assets
    .filter((a) => a.type === 'station' && a.subtype !== 'ls_verdeelkast')
    .map((station) =>
      bouwStationOntwerp({
        station,
        aansluitingen: ontwerp.aansluitingen,
        uitgangspunten: ontwerp.uitgangspunten,
        msKabelLabel: msKeuze?.label,
        lsKabelLabel: lsKeuze?.label,
      }),
    );

  return saveDemoNetontwerp({ ...ontwerp, stationsOntwerpen: ontwerpen });
}

/**
 * MS-ringverbinding: routeer met de bestaande router (A* op het wegennet)
 * langs alle stations in ringvolgorde en maak daarvan een echt MS-tracé.
 */
export async function genereerRingVerbindingAction(
  ontwerp: Netontwerp,
): Promise<{ ontwerp: Netontwerp; trace: DemoTrace; samenvatting: string } | { error: string }> {
  const stations = ontwerp.assets
    .filter((a) => a.type === 'station' && a.positie.binding === 'punt' && a.subtype !== 'ls_verdeelkast')
    .map((a) => {
      const pos = a.positie as { x: number; y: number };
      return { id: a.id, naam: a.naam, x: pos.x, y: pos.y };
    });
  if (stations.length < 2) {
    return { error: 'Minimaal 2 stations nodig voor een ringverbinding (stap 4).' };
  }

  // Ringvolgorde: langs bestaand MS-tracé als dat er is, anders nearest-neighbor
  const msTrace = ontwerp.traceIds
    .map((id) => getDemoTrace(id))
    .find((t) => t?.discipline === 'elektra_ms' && t.coordinates.length >= 2);
  let geordend = stations;
  if (msTrace) {
    const volgorde = bepaalRingVolgorde(stations, msTrace.traceLines as TraceLines);
    if (volgorde.length === stations.length) {
      geordend = volgorde.map((v) => stations.find((s) => s.id === v.stationId)!);
    }
  } else {
    const rest = [...stations];
    geordend = [rest.shift()!];
    while (rest.length) {
      const laatste = geordend[geordend.length - 1];
      rest.sort(
        (a, b) =>
          Math.hypot(a.x - laatste.x, a.y - laatste.y) -
          Math.hypot(b.x - laatste.x, b.y - laatste.y),
      );
      geordend.push(rest.shift()!);
    }
  }

  const msKeuze = ontwerp.kabelKeuzes
    .map((k) => getKabelSpec(k.kabelId))
    .find((k) => k?.netvlak === 'MS');
  const netType = msKeuze?.label ?? `${ontwerp.uitgangspunten.spanningMsKV}kV XLPE 3x1x240 Al`;

  const result = await planAutomaticTraceAction({
    waypoints: geordend.map((s) => ({ x: s.x, y: s.y, label: s.naam })),
    discipline: 'elektra_ms',
    projectId: ontwerp.projectId,
    vereisteDekking: 1.0,
    netType,
    useAi: false,
  });
  if (!result.coordinates.length) {
    return { error: 'Router vond geen route langs de stations — verplaats stations dichter bij het wegennet.' };
  }

  const bestaandeRingen = getDemoTraces(ontwerp.projectId).filter((t) =>
    t.id.startsWith(`trace-ms-ring-${ontwerp.projectId}`),
  ).length;
  const id = `trace-ms-ring-${ontwerp.projectId}-${bestaandeRingen + 1}`;
  const trace: DemoTrace = {
    id,
    projectId: ontwerp.projectId,
    code: `EL-MS-RING-${String(bestaandeRingen + 1).padStart(2, '0')}`,
    naam: `MS-ring ${geordend.map((s) => s.naam).join(' → ')}`,
    discipline: 'elektra_ms',
    netType,
    fase: 'VO',
    vereisteDekking: 1.0,
    kleur: '#c80000',
    wegnaam: result.segmenten[0]?.wegnaam ?? '',
    leglocatie: 'berm',
    omschrijving: `Ringverbinding tussen ${geordend.length} stations, gerouteerd op het wegennet (score ${result.score}/100).`,
    coordinates: result.coordinates,
    traceLines: result.traceLines,
    segmenten: routingSegmentsToTraceSegmenten(result.segmenten),
  };
  addDemoTrace(trace);

  // Koppel stations aan het nieuwe ringtracé
  const assets = ontwerp.assets.map((a) =>
    stations.some((s) => s.id === a.id)
      ? { ...a, gekoppeldeTraceIds: [...new Set([...a.gekoppeldeTraceIds, id])] }
      : a,
  );
  const bijgewerkt = await saveDemoNetontwerp({
    ...ontwerp,
    assets,
    traceIds: [...ontwerp.traceIds, id],
  });

  return {
    ontwerp: bijgewerkt,
    trace,
    samenvatting: `${result.totaleLengteM.toFixed(0)} m ring langs ${geordend.length} stations: ${geordend.map((s) => s.naam).join(' → ')} (route-score ${result.score}/100)`,
  };
}

/** SVG-tekeningen per station: eenlijnschema + plattegrond. */
export async function genereerStationTekeningenAction(
  ontwerp: Netontwerp,
): Promise<DrawingResult[]> {
  const trace = ontwerp.traceIds.map((id) => getDemoTrace(id)).find(Boolean);
  if (!trace) return [];

  const resultaten: DrawingResult[] = [];
  for (const stationOntwerp of ontwerp.stationsOntwerpen) {
    const station = ontwerp.assets.find((a) => a.id === stationOntwerp.stationAssetId);
    const naam = station?.naam ?? 'Station';
    resultaten.push(
      {
        type: 'station_eenlijn',
        label: `Eenlijnschema ${naam}`,
        svg: generateStationEenlijn(trace, stationOntwerp, naam),
        formaat: 'svg',
      },
      {
        type: 'station_plattegrond',
        label: `Plattegrond ${naam}`,
        svg: generateStationPlattegrond(trace, stationOntwerp, naam),
        formaat: 'svg',
      },
    );
  }
  if (resultaten.length > 0) {
    saveTekeningenToDossier(ontwerp.projectId, trace.id, resultaten);
  }
  return resultaten;
}

/** UO-werktekening per tracé met moffen, mantelbuizen en stations. */
export async function genereerWerktekeningenAction(
  ontwerp: Netontwerp,
): Promise<DrawingResult[]> {
  const resultaten: DrawingResult[] = [];
  for (const traceId of ontwerp.traceIds) {
    const trace = getDemoTrace(traceId);
    if (!trace) continue;
    const tekening: DrawingResult = {
      type: 'werktekening',
      label: `Werktekening ${trace.code}`,
      svg: generateWerktekening(trace, ontwerp.assets),
      formaat: 'svg',
    };
    resultaten.push(tekening);
    saveTekeningenToDossier(ontwerp.projectId, trace.id, [tekening]);
  }
  return resultaten;
}
