/**
 * Uitgangspuntennotitie-generator.
 *
 * Genereert deterministisch (zonder AI) een uitgangspuntennotitie uit de
 * tracé-parameters: gehanteerde normen, dekking, parallelafstanden,
 * kruisingsmethoden en aannames. Output is markdown die via het bestaande
 * dossier-/PDF-patroon kan worden gepubliceerd.
 */

import type { Discipline } from '@/lib/db/types';
import { DISCIPLINE_LABELS } from '@/lib/db/types';
import type { TraceRoutingResult } from '@/lib/services/trace-routing/types';
import { NORMEN, normReferentieRegel, type NormId } from '@/lib/normen';
import { formatDocCode } from '@/lib/dossier/doc-code';

export interface UitgangspuntenInput {
  projectNaam: string;
  projectCode: string;
  traceNaam: string;
  traceCode: string;
  discipline: Discipline;
  netType?: string | null;
  vereisteDekkingM: number;
  diepteNapM?: number;
  routing?: TraceRoutingResult | null;
  volgnummer?: number;
  datum?: string;
}

const NORMEN_PER_DISCIPLINE: Record<Discipline, NormId[]> = {
  elektra_ls: ['nen7171_1', 'nen1010', 'crow500', 'wibon'],
  elektra_ms: ['nen7171_1', 'iec60287', 'beiViag', 'crow500', 'wibon'],
  stations: ['nen7171_1', 'nen1010', 'crow500'],
  gas_hd: ['nen7171_1', 'nen3650', 'nen3651', 'beiViag', 'crow500', 'wibon'],
  gas_ld: ['nen7171_1', 'nen3650', 'beiViag', 'crow500', 'wibon'],
  water: ['nen7171_1', 'nen3650', 'nen3651', 'crow500', 'wibon'],
};

/** Parallelafstanden t.o.v. andere netten conform NEN 7171-1 (praktijkwaarden, hart-op-hart). */
const PARALLEL_AFSTANDEN: { thema: string; afstandM: number }[] = [
  { thema: 'Elektra LS/MS', afstandM: 0.25 },
  { thema: 'Gas lage druk', afstandM: 0.25 },
  { thema: 'Gas hoge druk', afstandM: 0.5 },
  { thema: 'Water', afstandM: 0.25 },
  { thema: 'Telecom/datatransport', afstandM: 0.25 },
  { thema: 'Riolering (vrijverval)', afstandM: 0.5 },
  { thema: 'Warmte', afstandM: 0.5 },
];

export interface UitgangspuntenNotitie {
  docCode: string;
  titel: string;
  markdown: string;
}

export function genereerUitgangspuntennotitie(input: UitgangspuntenInput): UitgangspuntenNotitie {
  const datum = input.datum ?? new Date().toISOString().slice(0, 10);
  const docCode = formatDocCode({
    projectCode: input.projectCode,
    fase: 'vo',
    type: 'NOT',
    volgnummer: input.volgnummer ?? 1,
  });
  const normIds = NORMEN_PER_DISCIPLINE[input.discipline] ?? ['nen7171_1', 'crow500'];
  const routing = input.routing;

  const kruisingen = routing?.segmenten.flatMap((s) => s.kruisingen) ?? [];
  const boorSegmenten = routing?.segmenten.filter((s) => s.legtechniek !== 'open_ontgraving') ?? [];

  const kruisingsRegels =
    kruisingen.length > 0
      ? kruisingen.map(
          (k) =>
            `| ${k.naam} | ${k.type} | ${labelLegtechniek(k.legtechniek)} | ${k.normReferentie ?? '—'} |`
        )
      : ['| _Geen kruisingen in het huidige tracé_ | — | — | — |'];

  const zroSectie = bouwZroSectie(routing);
  const handmatigSectie = bouwHandmatigSectie(routing);

  const md = `# Uitgangspuntennotitie — ${input.traceNaam}

| | |
|---|---|
| **Documentcode** | ${docCode} |
| **Project** | ${input.projectNaam} |
| **Tracé** | ${input.traceCode} — ${input.traceNaam} |
| **Discipline** | ${DISCIPLINE_LABELS[input.discipline]}${input.netType ? ` (${input.netType})` : ''} |
| **Status** | Concept |
| **Datum** | ${datum} |

## 1. Inleiding en scope
Deze notitie legt de uitgangspunten vast voor het ontwerp van het tracé **${input.traceNaam}**${
    routing ? ` met een totale lengte van circa ${Math.round(routing.totaleLengteM)} m` : ''
  }. De uitgangspunten gelden voor de VO-fase en worden bij DO/UO herijkt.

## 2. Normenkader
${normIds.map((id) => `- ${normReferentieRegel(id)}`).join('\n')}

_Normversies conform de centrale normenconfiguratie van dit platform; afwijkingen worden per ontwerpbesluit gedocumenteerd._

## 3. Ontwerpuitgangspunten

### 3.1 Ligging en dekking
- Minimale gronddekking: **${input.vereisteDekkingM.toFixed(2)} m** (eis beheerder/${NORMEN.nen7171_1.code}).
${input.diepteNapM !== undefined ? `- Ontwerpdiepte as: **NAP ${input.diepteNapM.toFixed(2)} m** (indicatief, te verifiëren met maaiveldprofiel).` : ''}
- Ligging bij voorkeur in openbare grond (berm); privaat terrein uitsluitend met zakelijk recht/gedoogplicht.
- Bochten met minimale buigradius van het gekozen kabel-/buistype; kruisingen haaks waar mogelijk.

### 3.2 Parallelafstanden (${NORMEN.nen7171_1.code})
| Net | Minimale afstand (h.o.h.) |
|---|---|
${PARALLEL_AFSTANDEN.map((p) => `| ${p.thema} | ${p.afstandM.toFixed(2)} m |`).join('\n')}

### 3.3 Kruisingen en kruisingsmethoden
| Object | Type | Methode | Norm |
|---|---|---|---|
${kruisingsRegels.join('\n')}

${
  boorSegmenten.length > 0
    ? `Sleufloze passages (${boorSegmenten.length}×): uitvoering conform ${NORMEN.nen3650.code}${
        boorSegmenten.some((s) => s.legtechniek === 'hdd') ? ` en boorengineering per boring (zie boorrapporten)` : ''
      }.`
    : 'Het tracé kent in het huidige ontwerp geen sleufloze passages.'
}
${zroSectie}${handmatigSectie}
## 4. Aannames
- KLIC-/WIBON-gebiedsinformatie is indicatief; werkelijke ligging te verifiëren met proefsleuven (${NORMEN.crow500.code}).
- Grondopbouw op basis van BRO/GeoTOP en beschikbare sonderingen; aanvullend grondonderzoek in DO-fase.
- Kostenindicaties op VO-niveau (±30%).
${routing?.waarschuwingen.map((w) => `- Aandachtspunt uit tracétoets: ${w}`).join('\n') ?? ''}

## 5. Vervolg
Deze uitgangspunten worden bevroren bij vaststelling van het VO en dienen als basis voor DO-nota en UO-berekeningen. Wijzigingen verlopen via een nieuw versienummer van dit document.
`;

  return {
    docCode,
    titel: `Uitgangspuntennotitie ${input.traceCode}`,
    markdown: md,
  };
}

const ZRO_STATUS_LABELS: Record<string, string> = {
  zakelijk_recht_vereist: 'Zakelijk recht vereist',
  gedoogplicht: 'Gedoogplicht',
  publiek: 'Publiek',
  eigenaar_onbekend: 'Eigenaar onbekend',
};

const ZRO_EIGENAAR_LABELS: Record<string, string> = {
  particulier: 'Particulier',
  bedrijf: 'Bedrijf',
  gemeente: 'Gemeente',
  overheid: 'Overheid',
  onbekend: 'Onbekend',
};

/** Sectie 3.4 — zakelijk-recht-overzicht (ZRO) over doorkruiste particuliere percelen. */
function bouwZroSectie(routing?: TraceRoutingResult | null): string {
  const zro = routing?.zroOverzicht;
  if (!zro || zro.percelen.length === 0) return '';
  const rijen = zro.percelen
    .map(
      (p) =>
        `| ${p.perceelnummer} | ${ZRO_EIGENAAR_LABELS[p.eigenaarType] ?? p.eigenaarType} | ${p.lengteDoorPerceelM} | ${
          ZRO_STATUS_LABELS[p.status] ?? p.status
        } |`
    )
    .join('\n');
  const bronregel =
    zro.bron === 'live'
      ? 'Eigenaargegevens uit BRK Inzage.'
      : 'Eigenaargegevens indicatief (geen live BRK-koppeling) — verifiëren bij Kadaster vóór vestiging zakelijk recht.';
  return `
### 3.4 Zakelijk recht (ZRO-overzicht)
Het tracé doorkruist ${zro.percelen.length} particulier(e) perceel/percelen over in totaal **${zro.totaalPrivaatM} m**. Voor deze percelen is een zakelijk recht (opstalrecht) of gedoogplicht te regelen met de rechthebbende.

| Perceel | Eigenaar | Lengte (m) | Status |
|---|---|---|---|
${rijen}

_${bronregel}_
`;
}

/** Sectie 3.5 — best-effort segmenten die handmatig opgelost moeten worden. */
function bouwHandmatigSectie(routing?: TraceRoutingResult | null): string {
  if (!routing?.heeftHandmatigOpTeLossen) return '';
  const probleem = (routing.markedSegments ?? []).filter((m) => m.marker !== 'ok');
  const regels =
    probleem.length > 0
      ? probleem
          .map((m) => {
            const wat =
              m.marker === 'door_bebouwing'
                ? 'Loopt door bebouwing'
                : `Loopt door particulier perceel${m.toelichting ? ` (${m.toelichting})` : ''}`;
            return `| ${wat} | ${m.lengteM} |`;
          })
          .join('\n')
      : '| _Geen detail beschikbaar_ | — |';
  return `
### 3.5 Handmatig op te lossen segmenten
Voor dit tracé is geen volledig bebouwingsvrije route langs wegen gevonden (best-effort tracé). De onderstaande delen lopen door bebouwing of particulier terrein en moeten handmatig worden verlegd of nader afgestemd vóór vaststelling.

| Aandachtspunt | Lengte (m) |
|---|---|
${regels}
`;
}

function labelLegtechniek(l: string): string {
  switch (l) {
    case 'hdd':
      return 'Gestuurde boring (HDD)';
    case 'persing':
      return 'Persing';
    case 'sleufloos':
      return 'Sleufloze techniek';
    default:
      return 'Open ontgraving';
  }
}
