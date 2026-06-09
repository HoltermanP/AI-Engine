import { anthropicComplete, isAnthropicConfigured } from '@/lib/connectors/ai/anthropic';
import type { TraceRoutingInput, TraceRoutingResult } from './types';

const SYSTEM_PROMPT = `Je bent een senior infratechnisch ontwerper voor ondergrondse netten in Nederland.
Je beoordeelt automatisch berekende tracés op logica, veiligheid en naleving van netbeheerdernormen.

Beoordeel op:
- Voorkeur voor gemeentelijke AVOI-tracés en utiliteitsstroken
- Legging langs wegen (berm/onder verharding)
- Geen tracé onder bebouwing (hard blokkerend)
- Vermijden begroeiing/bomen waar mogelijk
- Voorkeur openbaar terrein; privaat alleen met zakelijk recht
- Kruisingen: asfaltzagen, persing, gestuurd boren (HDD) bij water >10 m
- Discipline-specifieke normen (Liander/Enexis/Stedin voor elektra/gas, Vitens/Evides voor water)

Antwoord in het Nederlands, max 400 woorden. Structuur:
1. Beoordeling (goed/matig/onaanvaardbaar)
2. Belangrijkste overwegingen (bulletpoints)
3. Aanbevelingen voor optimalisatie
4. Normverwijzingen die van toepassing zijn

Wees concreet en verwijs naar segmentnummers waar relevant.`;

function buildPrompt(input: TraceRoutingInput, result: TraceRoutingResult): string {
  return JSON.stringify(
    {
      opdracht: 'Beoordeel het automatisch berekende tracé',
      discipline: input.discipline,
      netType: input.netType,
      vereisteDekking: input.vereisteDekking,
      waypoints: input.waypoints,
      totaleLengteM: result.totaleLengteM,
      score: result.score,
      segmenten: result.segmenten.map((s) => ({
        volgorde: s.volgorde,
        weg: s.wegnaam,
        lengteM: s.lengteM,
        leglocatie: s.leglocatie,
        legtechniek: s.legtechniek,
        score: s.score,
        kruisingen: s.kruisingen,
        zakelijkRecht: s.zakelijkRechtVereist,
        opmerkingen: s.opmerkingen,
      })),
      waarschuwingen: result.waarschuwingen,
      blokkades: result.blokkades,
      normReferenties: result.normReferenties,
    },
    null,
    2
  );
}

function demoAiToelichting(input: TraceRoutingInput, result: TraceRoutingResult): string {
  const lines = [
    '**Beoordeling: matig tot goed** (demo-modus — geen live AI)',
    '',
    'Belangrijkste overwegingen:',
    `- Tracé van ${result.totaleLengteM} m over ${result.segmenten.length} segment(en), score ${result.score}/100`,
    `- Discipline ${input.discipline}: normen ${result.normReferenties.slice(0, 2).join(', ')}`,
  ];

  for (const seg of result.segmenten) {
    lines.push(
      `- Segment ${seg.volgorde} (${seg.wegnaam}): ${seg.legtechniek.replace(/_/g, ' ')}, ${seg.lengteM} m`
    );
  }

  if (result.blokkades.length) {
    lines.push('', 'Blokkades:', ...result.blokkades.map((b) => `- ${b}`));
  }

  lines.push(
    '',
    'Aanbevelingen:',
    '- Controleer AVOI-offset en coördinatie met gemeente',
    '- Verifieer KLIC-conflicten in fase 2',
    result.segmenten.some((s) => s.zakelijkRechtVereist)
      ? '- Start procedure zakelijk recht voor privaat terrein'
      : '- Tracé volgt overwegend openbaar terrein'
  );

  return lines.join('\n');
}

export async function refineTraceWithAi(
  input: TraceRoutingInput,
  result: TraceRoutingResult
): Promise<TraceRoutingResult> {
  if (!input.useAi) return result;

  if (!isAnthropicConfigured()) {
    return {
      ...result,
      aiToelichting: demoAiToelichting(input, result),
      aiBron: 'demo',
    };
  }

  try {
    const completion = await anthropicComplete({
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(input, result),
      maxTokens: 2048,
    });

    return {
      ...result,
      aiToelichting: completion.text || demoAiToelichting(input, result),
      aiBron: completion._source,
    };
  } catch {
    return {
      ...result,
      aiToelichting: demoAiToelichting(input, result),
      aiBron: 'demo',
    };
  }
}
