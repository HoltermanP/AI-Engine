import type { DemoTrace } from '@/demo/traces';
import { getDemoProjectById, DEMO_PROJECT } from '@/demo/projects';
import { getRapportContext } from '@/demo/reports/context';
import { traceLengthM } from '@/lib/geo';
import {
  anthropicComplete,
  anthropicCompleteStream,
  isAnthropicConfigured,
  type AnthropicCompletionOptions,
} from '@/lib/connectors/ai/anthropic';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { DetectedConflict } from '@/lib/services/conflict-detection';
import type { OnderzoekDocument, OnderzoekType } from './types';

const RAPPORT_STRUCTUUR: Record<OnderzoekType, string[]> = {
  bodem_nen5725: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Inleiding, doel en scope',
    '4. Methodiek en bronnen (NEN 5725, BRO, Bodemloket)',
    '5. Resultaten bodemrisico en tracé-kruisingen',
    '6. Risicobeoordeling en saneringsadvies',
    '7. Conclusies en aanbevelingen',
    '8. Bijlagenoverzicht',
  ],
  archeologie: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Onderzoeksopzet en bronnen',
    '4. Historische en archeologische context',
    '5. Verwachtingswaarde en tracé-afweging',
    '6. Advies veldwerk / waarneming',
    '7. Conclusies',
  ],
  nge_ce: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Onderzoeksgebied en geologie',
    '4. Sonderingsresultaten en grondopbouw',
    '5. NGE/CE-toets per segment',
    '6. Legtechniekadvies',
    '7. Conclusies en vervolgonderzoek',
  ],
  ecologie_wnb: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Wettelijk kader (Wnb)',
    '4. Ecologische baseline',
    '5. Effecten op beschermde soorten',
    '6. Mitigerende maatregelen en werkvensters',
    '7. Conclusies',
  ],
  kl_inventarisatie: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Onderzoeksgebied en methode (KLIC/WIBON)',
    '4. Inventarisatie bestaand net',
    '5. Conflicten en afstandsnormen (NEN 7171)',
    '6. Maatregelen en afstemming netbeheerders',
    '7. Conclusies',
  ],
  natura2000: [
    '1. Samenvatting voor management',
    '2. Inhoudsopgave',
    '3. Gebiedscontext Natura 2000',
    '4. Passende beoordeling — effecten',
    '5. Mitigatie en compensatie',
    '6. Conclusies en vervolgstappen',
  ],
};

const RAPPORT_NORMEN: Record<OnderzoekType, string> = {
  bodem_nen5725: 'NEN 5725, BRO, Omgevingswet',
  archeologie: 'Erfgoedwet, KNA-richtlijnen',
  nge_ce: 'NEN-EN-ISO 22476-1, CUR-aanbevelingen',
  ecologie_wnb: 'Wet natuurbescherming (Wnb)',
  kl_inventarisatie: 'WIBON, NEN 7171, KLIC',
  natura2000: 'Habitatrichtlijn, Passende beoordeling',
};

function bouwProjectContext(
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): string {
  const project = getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;
  const ctx = getRapportContext(trace);
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);

  const dataSamenvatting = collected
    ? {
        bronnen: collected.sources,
        sonderingen: collected.sonderingen.length,
        grondwater: collected.grondwater.length,
        bestaandNet: collected.bestaandNet.length,
        belemmeringen: collected.belemmeringen.map((b) => ({
          categorie: b.categorie,
          beheerder: b.beheerder,
        })),
        vervuildeGrond: collected.vervuildeGrond?.length ?? 0,
        bodemKruisingen: collected.bodemTraceKruisingen?.length ?? 0,
        bodemRisico: collected.bodemRisicoSamenvatting,
        natura2000: collected.natura2000?.map((g) => g.naam),
      }
    : null;

  const conflictSamenvatting =
    conflicten?.map((c) => ({
      ernst: c.ernst,
      type: c.type,
      titel: c.titel,
      toelichting: c.toelichting,
      norm: c.norm,
    })) ?? [];

  return JSON.stringify(
    {
      project: {
        naam: project.naam,
        nummer: project.projectnummer,
        opdrachtgever: project.opdrachtgever,
        gebied: project.gebied,
      },
      trace: {
        code: trace.code,
        naam: trace.naam,
        discipline: trace.discipline,
        netType: trace.netType,
        wegnaam: trace.wegnaam,
        leglocatie: trace.leglocatie,
        lengteM: lengte,
        vereisteDekking: trace.vereisteDekking,
        segmenten: trace.segmenten.map((s) => ({
          weg: s.wegnaam,
          legtechniek: s.legtechniek,
          lengteM: s.lengteM,
        })),
      },
      gebied: ctx.gebied,
      waterkruisingen: ctx.waterkruisingen,
      collected: dataSamenvatting,
      conflicten: conflictSamenvatting,
    },
    null,
    2
  );
}

export function valideerMarkdownRapport(text: string, template: string): boolean {
  if (!text.includes('#')) return false;
  if (text.length < Math.max(800, template.length * 0.45)) return false;
  const secties = (text.match(/^##\s/gm) ?? []).length;
  return secties >= 4;
}

function bouwRapportPrompts(
  document: OnderzoekDocument,
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): AnthropicCompletionOptions {
  const structuur = RAPPORT_STRUCTUUR[document.type];
  const normen = RAPPORT_NORMEN[document.type];
  const context = bouwProjectContext(trace, collected, conflicten);

  const system = `Je bent een senior onderzoeksrapporteur voor Nederlandse ondergrondse infrastructuur (elektra, gas, water).
Schrijf uitsluitend in het Nederlands. Gebruik Markdown met # voor titel, ## voor hoofdstukken, ### voor subhoofdstukken.
Gebruik tabellen waar passend. Baseer conclusies op de aangeleverde projectdata — verzin geen meetwaarden die niet in de data staan.
Het rapport moet professioneel, uitvoerig en direct bruikbaar zijn voor vergunningaanvragen en stuuroverleg.`;

  const prompt = `Schrijf een uitgebreid en gestructureerd onderzoeksrapport op basis van het concept en de projectdata.

**Rapporttype:** ${document.titel}
**Type-id:** ${document.type}
**Normenkader:** ${normen}

**Verplichte hoofdstukstructuur (in deze volgorde):**
${structuur.map((s) => `- ${s}`).join('\n')}

**Project- en tracédata (JSON):**
${context}

**Conceptrapport (basis — verrijk en structureer, behoud feitelijke juistheid):**
${document.inhoud}

**Instructies:**
1. Lever ALLEEN het volledige rapport in Markdown — geen meta-uitleg eromheen.
2. Begin met een titel (#) en management summary.
3. Voeg een inhoudsopgave toe met ankerverwijzingen.
4. Integreer conflicten, bodemrisico en collected data expliciet waar relevant.
5. Sluit af met concrete aanbevelingen en een bijlagenoverzicht.
6. Minimaal ${structuur.length} hoofdstukken (##).`;

  return { system, prompt, maxTokens: 8192 };
}

async function* simuleerTekstStream(
  tekst: string,
  chunkSize = 48,
  delayMs = 12
): AsyncGenerator<string> {
  for (let i = 0; i < tekst.length; i += chunkSize) {
    yield tekst.slice(i, i + chunkSize);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export type RapportStreamEvent =
  | { event: 'template'; document: OnderzoekDocument }
  | { event: 'delta'; text: string }
  | { event: 'done'; document: OnderzoekDocument }
  | { event: 'error'; message: string };

/** Stream rapportverrijking — deltas voor live UI-opbouw. */
export async function* streamVerrijkRapportMetAnthropic(
  document: OnderzoekDocument,
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): AsyncGenerator<RapportStreamEvent> {
  const templateDoc: OnderzoekDocument = {
    ...document,
    status: 'in_uitvoering',
  };
  yield { event: 'template', document: templateDoc };

  if (!isAnthropicConfigured()) {
    let accumulated = '';
    for await (const chunk of simuleerTekstStream(document.inhoud)) {
      accumulated += chunk;
      yield { event: 'delta', text: chunk };
    }
    yield {
      event: 'done',
      document: { ...document, inhoud: accumulated, status: 'afgerond', _source: 'demo' },
    };
    return;
  }

  const prompts = bouwRapportPrompts(document, trace, collected, conflicten);
  let accumulated = '';

  try {
    for await (const chunk of anthropicCompleteStream(prompts)) {
      accumulated += chunk;
      yield { event: 'delta', text: chunk };
    }

    if (!valideerMarkdownRapport(accumulated, document.inhoud)) {
      yield { event: 'done', document: { ...document, status: 'afgerond' } };
      return;
    }

    yield {
      event: 'done',
      document: {
        ...document,
        inhoud: accumulated.trim(),
        status: 'afgerond',
        _source: 'live',
      },
    };
  } catch (err) {
    console.error(`[ai-rapport] stream mislukt voor ${document.type}:`, err);
    yield {
      event: 'error',
      message: err instanceof Error ? err.message : 'AI-stream mislukt',
    };
    yield { event: 'done', document: { ...document, status: 'afgerond' } };
  }
}

export async function verrijkRapportMetAnthropic(
  document: OnderzoekDocument,
  trace: DemoTrace,
  collected?: CollectedTraceData,
  conflicten?: DetectedConflict[]
): Promise<OnderzoekDocument> {
  if (!isAnthropicConfigured()) {
    return document;
  }

  const prompts = bouwRapportPrompts(document, trace, collected, conflicten);

  try {
    const result = await anthropicComplete(prompts);

    if (result._source !== 'live' || !valideerMarkdownRapport(result.text, document.inhoud)) {
      return document;
    }

    return {
      ...document,
      inhoud: result.text.trim(),
      _source: 'live',
    };
  } catch (err) {
    console.error(`[ai-rapport] Anthropic mislukt voor ${document.type}:`, err);
    return document;
  }
}

export async function bewerkRapportMetAnthropic(
  huidigeInhoud: string,
  instructie: string,
  context: string,
  rapportType: OnderzoekType
): Promise<{ inhoud: string; _source: 'live' | 'demo' }> {
  if (!isAnthropicConfigured()) {
    return { inhoud: huidigeInhoud, _source: 'demo' };
  }

  const result = await anthropicComplete({
    system: `Je bent een Nederlandse engineering-rapporteur. Pas rapporten aan in Markdown. Geef ALLEEN het volledige aangepaste rapport terug.`,
    prompt: `Rapporttype: ${rapportType}
Context: ${context}

Instructie: ${instructie}

Huidig rapport:
${huidigeInhoud}`,
    maxTokens: 8192,
  });

  if (result._source === 'live' && valideerMarkdownRapport(result.text, huidigeInhoud)) {
    return { inhoud: result.text.trim(), _source: 'live' };
  }
  return { inhoud: huidigeInhoud, _source: 'demo' };
}
