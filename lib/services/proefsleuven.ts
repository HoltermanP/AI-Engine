/**
 * Proefsleuvenplan-generator (CROW 500 — zorgvuldig graafproces).
 *
 * Stelt automatisch proefsleuflocaties voor op basis van:
 * 1. kruisingen van het nieuwe tracé met bestaande netten (KLIC/WIBON);
 * 2. lokale K&L-dichtheid (parallelle netten binnen de zorgvuldigheidszone);
 * 3. in-/uittredepunten van sleufloze passages (boringen/persingen).
 *
 * Output: tabel + kaartpunten + markdown-document met documentcode.
 */

import { findLineIntersections, minDistLineToLine, nauwkeurigheidBuffer } from '@/lib/geo';
import { NORMEN } from '@/lib/normen';
import { formatDocCode } from '@/lib/dossier/doc-code';

export interface ProefsleufNetInput {
  id: string;
  thema: string;
  beheerder: string;
  nauwkeurigheid: string;
  coordinates: [number, number, number?][];
}

export interface ProefsleufTraceInput {
  traceId: string;
  traceCode: string;
  traceNaam: string;
  projectCode: string;
  coordinates: [number, number, number?][];
  /** Sleufloze passages: voor in-/uittredepunt-verificatie. */
  boringen?: { wegnaam: string; startRd: [number, number]; eindRd: [number, number] }[];
}

export type ProefsleufPrioriteit = 'hoog' | 'middel' | 'laag';

export interface ProefsleufLocatie {
  nr: number;
  rd: [number, number];
  chainageM: number;
  reden: 'kruising' | 'parallelligging' | 'boring_intrede';
  themas: string[];
  beheerders: string[];
  prioriteit: ProefsleufPrioriteit;
  advies: string;
}

export interface ProefsleuvenPlan {
  traceId: string;
  traceCode: string;
  docCode: string;
  locaties: ProefsleufLocatie[];
  samenvatting: string;
  markdown: string;
  normReferentie: string;
}

/** Zone waarbinnen parallelle netten om verificatie vragen (CROW 500-praktijk: 1,5 m + liggingsonzekerheid). */
const PARALLEL_ZONE_M = 1.5;
/** Minimale onderlinge afstand tussen voorgestelde proefsleuven. */
const MIN_AFSTAND_TUSSEN_SLEUVEN_M = 25;

function chainageVanPunt(
  lijn: [number, number, number?][],
  punt: [number, number]
): number {
  let beste = 0;
  let besteAfstand = Infinity;
  let cumulatief = 0;
  for (let i = 1; i < lijn.length; i++) {
    const [x1, y1] = lijn[i - 1];
    const [x2, y2] = lijn[i];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((punt[0] - x1) * dx + (punt[1] - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const d = Math.hypot(punt[0] - projX, punt[1] - projY);
    if (d < besteAfstand) {
      besteAfstand = d;
      beste = cumulatief + t * segLen;
    }
    cumulatief += segLen;
  }
  return Math.round(beste);
}

export function genereerProefsleuvenPlan(
  trace: ProefsleufTraceInput,
  bestaandNet: ProefsleufNetInput[]
): ProefsleuvenPlan {
  const traceLijn2d = trace.coordinates.map(([x, y]) => [x, y] as [number, number]);
  const kandidaten: Omit<ProefsleufLocatie, 'nr'>[] = [];

  for (const net of bestaandNet) {
    if (net.coordinates.length < 2) continue;
    const netLijn = net.coordinates.map(([x, y]) => [x, y] as [number, number]);

    // 1. Kruisingen: altijd proefsleuf (CROW 500: werkelijke ligging vaststellen).
    const kruispunten = findLineIntersections(traceLijn2d, netLijn);
    for (const punt of kruispunten) {
      kandidaten.push({
        rd: [Math.round(punt[0] * 10) / 10, Math.round(punt[1] * 10) / 10],
        chainageM: chainageVanPunt(trace.coordinates, punt),
        reden: 'kruising',
        themas: [net.thema],
        beheerders: [net.beheerder],
        prioriteit: 'hoog',
        advies: `Kruising met ${net.thema} (${net.beheerder}) — ligging en diepte vaststellen vóór uitvoering`,
      });
    }

    // 2. Parallelligging binnen de zorgvuldigheidszone (incl. liggingsonzekerheid).
    if (kruispunten.length === 0) {
      const zone = PARALLEL_ZONE_M + nauwkeurigheidBuffer(net.nauwkeurigheid);
      const afstand = minDistLineToLine(traceLijn2d, netLijn);
      if (afstand <= zone) {
        const midden = netLijn[Math.floor(netLijn.length / 2)];
        kandidaten.push({
          rd: [Math.round(midden[0] * 10) / 10, Math.round(midden[1] * 10) / 10],
          chainageM: chainageVanPunt(trace.coordinates, midden),
          reden: 'parallelligging',
          themas: [net.thema],
          beheerders: [net.beheerder],
          prioriteit: net.nauwkeurigheid === 'geschat' ? 'hoog' : 'middel',
          advies: `Parallel ${net.thema} op ${afstand.toFixed(1)} m (nauwkeurigheid: ${net.nauwkeurigheid}) — ligging verifiëren`,
        });
      }
    }
  }

  // 3. In-/uittredepunten van boringen.
  for (const boring of trace.boringen ?? []) {
    for (const [label, punt] of [
      ['intredepunt', boring.startRd],
      ['uittredepunt', boring.eindRd],
    ] as const) {
      kandidaten.push({
        rd: punt,
        chainageM: chainageVanPunt(trace.coordinates, punt),
        reden: 'boring_intrede',
        themas: [],
        beheerders: [],
        prioriteit: 'hoog',
        advies: `Vrijgraven ${label} boring ${boring.wegnaam} — alle liggingen binnen boorvlak vaststellen`,
      });
    }
  }

  // Sorteer op chainage en voeg nabijgelegen locaties samen.
  kandidaten.sort((a, b) => a.chainageM - b.chainageM);
  const samengevoegd: Omit<ProefsleufLocatie, 'nr'>[] = [];
  for (const kandidaat of kandidaten) {
    const vorige = samengevoegd[samengevoegd.length - 1];
    if (vorige && Math.abs(kandidaat.chainageM - vorige.chainageM) < MIN_AFSTAND_TUSSEN_SLEUVEN_M) {
      vorige.themas = [...new Set([...vorige.themas, ...kandidaat.themas])];
      vorige.beheerders = [...new Set([...vorige.beheerders, ...kandidaat.beheerders])];
      vorige.prioriteit = vorige.prioriteit === 'hoog' || kandidaat.prioriteit === 'hoog' ? 'hoog' : vorige.prioriteit;
      vorige.advies = `${vorige.advies}; ${kandidaat.advies}`;
      continue;
    }
    samengevoegd.push({ ...kandidaat });
  }

  const locaties: ProefsleufLocatie[] = samengevoegd.map((l, i) => ({ ...l, nr: i + 1 }));
  const docCode = formatDocCode({
    projectCode: trace.projectCode,
    fase: 'werkvoorbereiding',
    type: 'PLN',
    volgnummer: 1,
  });

  const samenvatting =
    locaties.length === 0
      ? 'Geen proefsleuven vereist op basis van de beschikbare gebiedsinformatie.'
      : `${locaties.length} proefsleuflocatie(s): ${locaties.filter((l) => l.prioriteit === 'hoog').length} hoog, ` +
        `${locaties.filter((l) => l.prioriteit === 'middel').length} middel, ` +
        `${locaties.filter((l) => l.prioriteit === 'laag').length} laag.`;

  const markdown = `# Proefsleuvenplan — ${trace.traceNaam}

| | |
|---|---|
| **Documentcode** | ${docCode} |
| **Tracé** | ${trace.traceCode} |
| **Norm** | ${NORMEN.crow500.code} / ${NORMEN.wibon.code} |
| **Status** | Concept |

## Aanpak
Conform ${NORMEN.crow500.code} wordt de werkelijke ligging van bestaande kabels en leidingen vastgesteld vóór de graafwerkzaamheden. Onderstaande locaties volgen uit kruisingen, parallelligging binnen de zorgvuldigheidszone (${PARALLEL_ZONE_M} m + liggingsonzekerheid) en in-/uittredepunten van sleufloze passages.

## Locaties
| Nr | Chainage | RD-coördinaat | Reden | Thema's | Prioriteit | Advies |
|---|---|---|---|---|---|---|
${locaties
  .map(
    (l) =>
      `| ${l.nr} | ${l.chainageM} m | ${l.rd[0].toFixed(1)}, ${l.rd[1].toFixed(1)} | ${l.reden.replace('_', ' ')} | ${l.themas.join(', ') || '—'} | ${l.prioriteit} | ${l.advies} |`
  )
  .join('\n')}

## Samenvatting
${samenvatting}

_Proefsleuven handmatig of met zuigtechniek graven binnen de zorgvuldigheidszone; afwijkingen t.o.v. KLIC direct melden (${NORMEN.wibon.code})._
`;

  return {
    traceId: trace.traceId,
    traceCode: trace.traceCode,
    docCode,
    locaties,
    samenvatting,
    markdown,
    normReferentie: NORMEN.crow500.code,
  };
}
