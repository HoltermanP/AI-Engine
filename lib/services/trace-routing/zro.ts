import { pointInPolygon } from '@/lib/geo';
import type { RoutingContext, ZroOverzicht, ZroPerceel } from './types';

/**
 * Zakelijk-recht-overzicht (ZRO): welke particuliere (niet-publieke) percelen
 * doorkruist het tracé en over welke lengte. Puur en deterministisch — de
 * geometrie levert altijd perceelnummer + lengte; eigenaargegevens worden
 * (best-effort) apart verrijkt via {@link verrijkZroOverzicht}.
 */
export function computeZroOverzicht(
  traceLines: [number, number, number][][],
  ctx: RoutingContext
): ZroOverzicht {
  // Alleen niet-publieke percelen zijn relevant voor zakelijk recht
  const privatePercelen = ctx.percelen.filter((p) => !p.publiek && p.polygon.length >= 4);
  if (privatePercelen.length === 0) {
    return { percelen: [], totaalPrivaatM: 0, bron: 'demo' };
  }

  // Accumuleer lengte per perceel-id
  const acc = new Map<
    string,
    { perceelnummer: string; lengteM: number; segmenten: Set<number> }
  >();

  // Stapgrootte voor fijne bemonstering langs het tracé (productie-traceLines zijn
  // al gedensificeerd; deze stap maakt het overzicht ook robuust voor grove lijnen)
  const STAP_M = 10;

  traceLines.forEach((line, idx) => {
    const volgorde = idx + 1;
    for (let i = 1; i < line.length; i++) {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i];
      const segLen = Math.hypot(x2 - x1, y2 - y1);
      if (segLen === 0) continue;
      const stappen = Math.max(1, Math.ceil(segLen / STAP_M));
      const stapLen = segLen / stappen;
      for (let s = 0; s < stappen; s++) {
        // Midden van elk substapje classificeren
        const t = (s + 0.5) / stappen;
        const mx = x1 + t * (x2 - x1);
        const my = y1 + t * (y2 - y1);
        const perceel = privatePercelen.find((p) => pointInPolygon(mx, my, p.polygon));
        if (!perceel) continue;
        const entry = acc.get(perceel.id) ?? {
          perceelnummer: perceel.perceelnummer,
          lengteM: 0,
          segmenten: new Set<number>(),
        };
        entry.lengteM += stapLen;
        entry.segmenten.add(volgorde);
        acc.set(perceel.id, entry);
      }
    }
  });

  const percelen: ZroPerceel[] = [...acc.values()].map((e) => ({
    perceelnummer: e.perceelnummer,
    eigenaarType: 'onbekend',
    lengteDoorPerceelM: Math.round(e.lengteM),
    segmentVolgorde: [...e.segmenten].sort((a, b) => a - b),
    status: 'eigenaar_onbekend',
  }));
  percelen.sort((a, b) => b.lengteDoorPerceelM - a.lengteDoorPerceelM);

  const totaalPrivaatM = percelen.reduce((s, p) => s + p.lengteDoorPerceelM, 0);
  return { percelen, totaalPrivaatM, bron: 'demo' };
}

/** Eigenaargegevens (BRK) per perceelnummer voor verrijking van het ZRO-overzicht. */
export interface EigenaarInfo {
  perceelnummer: string;
  eigenaarType: ZroPerceel['eigenaarType'];
  zakelijkRecht?: string;
}

function statusVoorEigenaar(eigenaarType: ZroPerceel['eigenaarType']): ZroPerceel['status'] {
  switch (eigenaarType) {
    case 'particulier':
    case 'bedrijf':
      return 'zakelijk_recht_vereist';
    case 'gemeente':
    case 'overheid':
      // Publieke eigenaar: doorgaans gedoogplicht (Belemmeringenwet/Telecomwet)
      return 'gedoogplicht';
    default:
      return 'eigenaar_onbekend';
  }
}

/**
 * Vult eigenaartype/status/bron in op basis van (live of demo) BRK-eigenaardata.
 * Matcht op perceelnummer; zonder match blijft het perceel 'eigenaar_onbekend'.
 * Server-side aan te roepen (BRK-connector), zodat de pure routing offline blijft.
 */
export function verrijkZroOverzicht(
  overzicht: ZroOverzicht,
  eigenaars: EigenaarInfo[],
  bron: 'live' | 'demo'
): ZroOverzicht {
  if (overzicht.percelen.length === 0) return overzicht;
  const byNummer = new Map(eigenaars.map((e) => [e.perceelnummer, e]));
  let enigeMatch = false;
  const percelen = overzicht.percelen.map((p) => {
    const match = byNummer.get(p.perceelnummer);
    if (!match) return p;
    enigeMatch = true;
    return {
      ...p,
      eigenaarType: match.eigenaarType,
      zakelijkRecht: match.zakelijkRecht,
      status: statusVoorEigenaar(match.eigenaarType),
    };
  });
  return { ...overzicht, percelen, bron: enigeMatch ? bron : overzicht.bron };
}
