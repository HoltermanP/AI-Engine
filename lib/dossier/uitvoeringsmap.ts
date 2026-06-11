import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import { getDossierItems, addToDossier, type DossierItem } from './store';

/**
 * Uitvoeringsmap: de complete werkmap voor de uitvoerende partij. Bundelt de
 * aanwezige dossierstukken per hoofdstuk (werktekeningen, uitvoeringsplan,
 * V&G, KLIC, vergunningen, calculatie) en signaleert wat nog ontbreekt.
 */

interface MapHoofdstuk {
  titel: string;
  vereist: boolean;
  /** Matcher op dossier-items */
  matcher: (item: DossierItem) => boolean;
  ontbreektAdvies: string;
}

const HOOFDSTUKKEN: MapHoofdstuk[] = [
  {
    titel: 'Werktekeningen (UO)',
    vereist: true,
    matcher: (i) => i.type === 'tekening' && /werktekening|uo/i.test(i.naam),
    ontbreektAdvies: 'Genereer de tekeningen in fase 3 (set Werktekeningen/UO)',
  },
  {
    titel: 'Situatie- en profieltekeningen',
    vereist: true,
    matcher: (i) => i.type === 'tekening' && !/werktekening/i.test(i.naam),
    ontbreektAdvies: 'Genereer de DO-tekeningenset in fase 3',
  },
  {
    titel: 'Uitvoeringsplan boringen',
    vereist: false,
    matcher: (i) => /uitvoeringsplan/i.test(i.naam),
    ontbreektAdvies: 'Draai boorengineering bij sleufloze segmenten (fase 3)',
  },
  {
    titel: 'V&G-plan (ontwerpfase)',
    vereist: true,
    matcher: (i) => /v&g|vg-plan|veiligheid/i.test(i.naam),
    ontbreektAdvies: 'Genereer het V&G-plan via de documentgeneratie (fase 4/output)',
  },
  {
    titel: 'Onderzoeksrapporten (quickscans)',
    vereist: true,
    matcher: (i) => i.type === 'onderzoek',
    ontbreektAdvies: 'Voer de quickscans uit in fase 4 (bodem, water, natuur, archeologie, NGE)',
  },
  {
    titel: 'Vergunningen & meldingen',
    vereist: true,
    matcher: (i) => i.type === 'aanvraag' || /vergunning/i.test(i.naam),
    ontbreektAdvies: 'Genereer aanvragen & checklist in fase 4',
  },
  {
    titel: 'Berekeningen',
    vereist: true,
    matcher: (i) => i.type === 'berekening',
    ontbreektAdvies: 'Draai de normberekeningen in fase 3',
  },
  {
    titel: 'Calculatie / materiaal',
    vereist: false,
    matcher: (i) => i.type === 'calculatie',
    ontbreektAdvies: 'Genereer de calculatie (met of zonder bestek) in fase 3',
  },
];

/** KLIC-informatieblad uit de bestaand-net-gegevens (ligging + vrij te houden afstanden). */
export function buildKlicInformatie(trace: DemoTrace, bestaandNet: DemoBestaandNet[]): string {
  const rijen = bestaandNet
    .map(
      (n) =>
        `| ${n.thema} | ${n.beheerder} | ${n.spanningOfDiameter || '-'} | ${n.materiaal} | ${n.diepte.toFixed(2)} m | ${n.vrijTeHoudenAfstand.toFixed(1)} m | ${n.nauwkeurigheid} |`
    )
    .join('\n');

  return `## KLIC-informatie (bestaande kabels & leidingen)

Conform WIBON geldt: graafmelding (KLIC) maximaal 20 werkdagen vóór aanvang,
liggingsgegevens op het werk aanwezig, afwijkende ligging melden bij het Kadaster.
Zorgvuldig grondroeren conform CROW 500: proefsleuven bij kruisingen en parallelligging
binnen de vrij te houden afstand.

| Thema | Beheerder | Specificatie | Materiaal | Diepte | Vrij te houden | Nauwkeurigheid |
|---|---|---|---|---|---|---|
${rijen || '| — | geen geregistreerde netten in het werkgebied | | | | | |'}
`;
}

export interface UitvoeringsmapResultaat {
  inhoud: string;
  compleet: boolean;
  ontbrekend: string[];
}

export function buildUitvoeringsmap(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[]
): UitvoeringsmapResultaat {
  const items = getDossierItems(trace.projectId, trace.id);
  const ontbrekend: string[] = [];

  const hoofdstukken = HOOFDSTUKKEN.map((h, idx) => {
    const gevonden = items.filter(h.matcher);
    if (gevonden.length === 0 && h.vereist) {
      ontbrekend.push(`${h.titel} — ${h.ontbreektAdvies}`);
    }
    const lijst =
      gevonden.length > 0
        ? gevonden.map((g) => `- ${g.naam}${g.formaat ? ` (${g.formaat})` : ''}`).join('\n')
        : `- *Ontbreekt* — ${h.ontbreektAdvies}`;
    return `### ${idx + 1}. ${h.titel}${h.vereist ? '' : ' *(indien van toepassing)*'}\n\n${lijst}`;
  });

  const inhoud = `# Uitvoeringsmap — ${trace.code} ${trace.naam}

**Project:** ${trace.projectId} · **Discipline:** ${trace.discipline} · **Status:** ${
    ontbrekend.length === 0 ? 'COMPLEET' : `ONVOLLEDIG (${ontbrekend.length} ontbrekend)`
  }

Deze map bundelt alle stukken die de uitvoerende partij op het werk nodig heeft.
${
  ontbrekend.length > 0
    ? `\n> **Nog aan te vullen:**\n${ontbrekend.map((o) => `> - ${o}`).join('\n')}\n`
    : ''
}
## Inhoudsopgave

${hoofdstukken.join('\n\n')}

${buildKlicInformatie(trace, bestaandNet)}

## Werkafspraken

1. Start werk pas na geldige KLIC-melding en goedgekeurde vergunningen
2. V&G-plan en uitvoeringsplan op het werk aanwezig; toolbox vóór aanvang
3. Afwijkingen ten opzichte van de werktekeningen direct melden bij de werkvoorbereider
4. Revisie (as-built) binnen 30 dagen na oplevering aanleveren (WIBON)
`;

  return { inhoud, compleet: ontbrekend.length === 0, ontbrekend };
}

export function saveUitvoeringsmapToDossier(
  trace: DemoTrace,
  bestaandNet: DemoBestaandNet[]
): { item: DossierItem; compleet: boolean; ontbrekend: string[] } {
  const map = buildUitvoeringsmap(trace, bestaandNet);
  const item = addToDossier({
    projectId: trace.projectId,
    traceId: trace.id,
    naam: `Uitvoeringsmap — ${trace.code}`,
    type: 'rapport',
    inhoud: map.inhoud,
    formaat: 'markdown',
  });
  return { item, compleet: map.compleet, ontbrekend: map.ontbrekend };
}
