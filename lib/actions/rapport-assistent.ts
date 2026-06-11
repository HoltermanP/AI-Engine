'use server';

import { getTrace } from '@/lib/db/store';
import { bewerkRapportMetAnthropic } from '@/lib/research/ai-rapport';
import { anthropicComplete } from '@/lib/connectors/ai/anthropic';
import type { OnderzoekType } from '@/lib/research/types';
import type { DetectedConflict } from '@/lib/services/conflict-detection';

export async function bewerkRapportMetAiAction(
  traceId: string,
  rapportType: OnderzoekType,
  huidigeInhoud: string,
  instructie: string,
  conflicten?: DetectedConflict[]
): Promise<{ inhoud: string; antwoord: string; _source: 'live' }> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  if (!instructie.trim()) throw new Error('Geef een instructie op');

  const conflictContext =
    conflicten && conflicten.length > 0
      ? `\n\nBekende conflicten:\n${conflicten.map((c) => `- [${c.ernst}] ${c.titel}: ${c.toelichting}`).join('\n')}`
      : '';

  const context = `Tracé ${trace.code} — ${trace.naam}${conflictContext}`;

  const anthropic = await bewerkRapportMetAnthropic(
    huidigeInhoud,
    instructie.trim(),
    context,
    rapportType
  );
  return {
    inhoud: anthropic.inhoud,
    antwoord: 'Rapport bijgewerkt met AI. Controleer de wijziging in het voorbeeld.',
    _source: 'live',
  };
}

export async function vraagRapportAssistentAction(
  traceId: string,
  vraag: string,
  rapportTitel: string,
  rapportFragment: string,
  conflicten?: DetectedConflict[]
) {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');

  const conflictContext =
    conflicten && conflicten.length > 0
      ? conflicten.map((c) => `[${c.ernst}] ${c.titel}`).join('; ')
      : 'geen conflicten geregistreerd';

  const result = await anthropicComplete({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 2048,
    system:
      'Je bent een Nederlandse engineering-assistent voor ondergrondse infrastructuur. ' +
      'Gebruik vakterminologie (tracé, dekking, NEN-normen). Antwoord in het Nederlands, beknopt en actionable.',
    prompt: `Beantwoord de vraag over het rapport "${rapportTitel}" voor tracé ${trace.code} (${trace.naam}).
Conflicten: ${conflictContext}

Vraag: ${vraag}

Rapportfragment (begin):
${rapportFragment.slice(0, 2500)}`,
  });

  return { antwoord: result.text, _source: result._source };
}
