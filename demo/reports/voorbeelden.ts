import { DEMO_TRACES } from '../traces';
import { getKlicForTrace } from '../klic';
import { detectConflicts } from '@/lib/services/conflict-detection';
import { DEMO_BELEMMERINGEN, DEMO_NATURA2000, generateMaaiveldProfile } from '../pdok';
import { lineIntersectsBbox, traceBbox } from '@/lib/geo';
import type { OnderzoekType, OnderzoekDocument } from '@/lib/research/types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import { buildOnderzoekTemplate } from '@/lib/research/generator';

/** Referentie-tracé voor standaard voorbeeldrapporten */
export const VOORBEELD_TRACE_ID = 'trace-ls-001';

const ONDERZOEK_TYPES: OnderzoekType[] = [
  'bodem_nen5725',
  'natura2000',
  'archeologie',
  'ecologie_wnb',
  'nge_ce',
  'kl_inventarisatie',
];

function demoCollectedData(traceId: string): CollectedTraceData {
  const netten = getKlicForTrace(traceId).map((n) => ({
    id: n.id,
    thema: n.thema,
    beheerder: n.beheerder,
    spanningOfDiameter: n.spanningOfDiameter,
    nauwkeurigheid: n.nauwkeurigheid,
    diepte: n.diepte,
    vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
    coordinates: n.coordinates,
    _source: 'demo' as const,
  }));

  return {
    traceId,
    collectedAt: new Date().toISOString(),
    sources: { klic: 'demo' as const, 'bro-cpt': 'demo' as const },
    maaiveld: [],
    bestaandNet: netten,
    sonderingen: [
      { id: 'cpt-1', x: 180120, y: 524740, qc: 14.2, grondsoort: 'zand', _source: 'demo' as const },
      { id: 'cpt-2', x: 181050, y: 526200, qc: 2.1, grondsoort: 'klei', _source: 'demo' as const },
      { id: 'cpt-3', x: 181800, y: 526450, qc: 16.8, grondsoort: 'zand', _source: 'demo' as const },
    ],
    grondwater: [],
    percelen: [],
    belemmeringen: DEMO_BELEMMERINGEN.map((b) => ({
      id: b.id,
      categorie: b.categorie,
      beheerder: b.beheerder,
      eisDekking: b.eisDekking || undefined,
      coordinates: b.coordinates as [number, number][],
      _source: 'demo' as const,
    })),
    eigenaars: [],
    bgt: [],
    nwb: [],
    watergangen: [],
    kunstwerken: [],
    natura2000: [
      {
        id: DEMO_NATURA2000.id,
        naam: DEMO_NATURA2000.naam,
        polygon: DEMO_NATURA2000.polygon,
        _source: 'demo' as const,
      },
    ],
    vervuildeGrond: [],
  };
}

function demoConflicten(traceId: string) {
  const trace = DEMO_TRACES.find((t) => t.id === traceId);
  if (!trace) return [];
  const bbox = traceBbox(trace.coordinates, 200, trace.traceLines);
  const netten = getKlicForTrace(traceId);
  return detectConflicts({
    traceId,
    traceCoordinates: trace.coordinates,
    vereisteDekking: trace.vereisteDekking,
    bestaandNet: netten,
    belemmeringen: DEMO_BELEMMERINGEN.filter(
      (b) => b.coordinates.length > 0 && lineIntersectsBbox(b.coordinates, bbox)
    ).map((b) => ({
      id: b.id,
      categorie: b.categorie,
      beheerder: b.beheerder,
      eisDekking: b.eisDekking || undefined,
      coordinates: b.coordinates as [number, number][],
    })),
    maaiveld: generateMaaiveldProfile(trace.coordinates),
    natura2000: [
      {
        id: DEMO_NATURA2000.id,
        naam: DEMO_NATURA2000.naam,
        polygon: DEMO_NATURA2000.polygon,
      },
    ],
  });
}

/** Alle voorbeeldrapporten voor het referentie-tracé EL-MS-001 */
export function getVoorbeeldOnderzoeken(traceId = VOORBEELD_TRACE_ID): OnderzoekDocument[] {
  const trace = DEMO_TRACES.find((t) => t.id === traceId) ?? DEMO_TRACES[1];
  const collected = demoCollectedData(trace.id);
  const conflicten = demoConflicten(trace.id);

  return ONDERZOEK_TYPES.map((type) =>
    buildOnderzoekTemplate(type, trace, collected, conflicten)
  );
}

/** Eén voorbeeldrapport op type */
export function getVoorbeeldRapport(
  type: OnderzoekType,
  traceId = VOORBEELD_TRACE_ID
): OnderzoekDocument {
  const trace = DEMO_TRACES.find((t) => t.id === traceId) ?? DEMO_TRACES[1];
  const collected = demoCollectedData(trace.id);
  const conflicten = demoConflicten(trace.id);
  return buildOnderzoekTemplate(type, trace, collected, conflicten);
}

/** Voorbeeldrapporten voor alle demo-tracés */
export function getAlleVoorbeeldRapporten(): Record<string, OnderzoekDocument[]> {
  return Object.fromEntries(
    DEMO_TRACES.map((trace) => [
      trace.code,
      ONDERZOEK_TYPES.map((type) => {
        const collected = demoCollectedData(trace.id);
        const conflicten = demoConflicten(trace.id);
        return buildOnderzoekTemplate(type, trace, collected, conflicten);
      }),
    ])
  );
}

/** Minimale structuur-eisen voor uniforme rapporten */
export const RAPPORT_STRUCTUUR_EISEN = {
  minLengte: 4500,
  verplichteSecties: [
    'Management summary',
    'Inhoudsopgave',
    'Referenties',
    'Bijlagen',
    'Conclusie',
  ],
  verplichteElementen: [
    'Rapportnummer',
    'Rapportstatus',
    'Ondertekening',
    'Norm / standaard',
    'Uitvoerder',
  ],
} as const;

export function valideerRapport(inhoud: string): { geldig: boolean; fouten: string[] } {
  const fouten: string[] = [];

  if (inhoud.length < RAPPORT_STRUCTUUR_EISEN.minLengte) {
    fouten.push(`Rapport te kort (${inhoud.length} < ${RAPPORT_STRUCTUUR_EISEN.minLengte} tekens)`);
  }

  for (const sectie of RAPPORT_STRUCTUUR_EISEN.verplichteSecties) {
    if (!inhoud.includes(sectie)) {
      fouten.push(`Ontbrekende sectie: ${sectie}`);
    }
  }

  for (const element of RAPPORT_STRUCTUUR_EISEN.verplichteElementen) {
    if (!inhoud.includes(element)) {
      fouten.push(`Ontbrekend element: ${element}`);
    }
  }

  if (!inhoud.startsWith('# ')) {
    fouten.push('Rapport mist H1-titel');
  }

  if ((inhoud.match(/\|/g) ?? []).length < 10) {
    fouten.push('Onvoldoende tabellen in rapport');
  }

  return { geldig: fouten.length === 0, fouten };
}

/** Valideer alle voorbeeldrapporten — bruikbaar als test/check */
export function valideerAlleVoorbeeldRapporten(): {
  geldig: boolean;
  resultaten: { type: OnderzoekType; trace: string; geldig: boolean; fouten: string[] }[];
} {
  const resultaten = DEMO_TRACES.flatMap((trace) =>
    ONDERZOEK_TYPES.map((type) => {
      const rapport = getVoorbeeldRapport(type, trace.id);
      const { geldig, fouten } = valideerRapport(rapport.inhoud);
      return { type, trace: trace.code, geldig, fouten };
    })
  );

  return {
    geldig: resultaten.every((r) => r.geldig),
    resultaten,
  };
}
