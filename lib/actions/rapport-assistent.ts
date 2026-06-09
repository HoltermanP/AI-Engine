'use server';

import { getTrace } from '@/lib/db/store';
import { aiConnector } from '@/lib/connectors/ai';
import { bewerkRapportMetAnthropic } from '@/lib/research/ai-rapport';
import { isAnthropicConfigured } from '@/lib/connectors/ai/anthropic';
import type { OnderzoekType } from '@/lib/research/types';
import type { DetectedConflict } from '@/lib/services/conflict-detection';

function demoRapportBewerking(inhoud: string, instructie: string): string {
  const lower = instructie.toLowerCase();
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (lower.includes('korter') || lower.includes('beknopt') || lower.includes('samenvat')) {
    const secties = inhoud.split(/\n(?=## )/);
    const ingekort = secties.slice(0, Math.min(4, secties.length)).join('\n');
    return `${ingekort.trim()}\n\n---\n\n*Ingekort door AI-assistent op ${datum}.*`;
  }

  if (lower.includes('conclusie') || lower.includes('conclusies')) {
    return `${inhoud.trim()}\n\n## AI-aanpassing — conclusie\n\nOp basis van uw instructie is de conclusie aangescherpt: de werkzaamheden zijn uitvoerbaar mits de genoemde mitigerende maatregelen worden toegepast en de netbeheerder tijdig wordt geïnformeerd.\n\n*Toegevoegd op ${datum}.*`;
  }

  if (lower.includes('maatregel') || lower.includes('mitig')) {
    return `${inhoud.trim()}\n\n## Aanvullende mitigerende maatregelen (AI)\n\n| Maatregel | Toelichting |\n| --- | --- |\n| Vooroverleg netbeheerder | Afstemming ligging en omschakeling vóór start werkzaamheden |\n| Ecologisch toezicht | Indien van toepassing in broedseizoen |\n| Proefsleuf | Bij kruisingen met geschatte KLIC-ligging |\n\n*Toegevoegd op ${datum}.*`;
  }

  return `${inhoud.trim()}\n\n---\n\n> **AI-notitie** (${datum}): ${instructie.trim()}\n>\n> Deze passage is toegevoegd op basis van uw instructie. Controleer de inhoud vóór definitieve oplevering.`;
}

export async function bewerkRapportMetAiAction(
  traceId: string,
  rapportType: OnderzoekType,
  huidigeInhoud: string,
  instructie: string,
  conflicten?: DetectedConflict[]
): Promise<{ inhoud: string; antwoord: string; _source: 'live' | 'demo' }> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  if (!instructie.trim()) throw new Error('Geef een instructie op');

  const conflictContext =
    conflicten && conflicten.length > 0
      ? `\n\nBekende conflicten:\n${conflicten.map((c) => `- [${c.ernst}] ${c.titel}: ${c.toelichting}`).join('\n')}`
      : '';

  const context = `Tracé ${trace.code} — ${trace.naam}${conflictContext}`;

  if (isAnthropicConfigured()) {
    const anthropic = await bewerkRapportMetAnthropic(
      huidigeInhoud,
      instructie.trim(),
      context,
      rapportType
    );
    if (anthropic._source === 'live') {
      return {
        inhoud: anthropic.inhoud,
        antwoord: 'Rapport bijgewerkt met Anthropic. Controleer de wijziging in het voorbeeld.',
        _source: 'live',
      };
    }
  }

  const result = await aiConnector.fetch({
    prompt: `Pas het onderstaande onderzoeksrapport (${rapportType}) aan volgens de instructie van de gebruiker.
Geef ALLEEN het volledige aangepaste rapport in Markdown terug — geen inleiding of uitleg buiten het rapport.

Instructie: ${instructie.trim()}${conflictContext}

Huidig rapport:
${huidigeInhoud}`,
    context,
  });

  const isDemoOutput =
    result._source === 'demo' ||
    !result.text.includes('#') ||
    result.text.length < huidigeInhoud.length * 0.3;

  const inhoud = isDemoOutput ? demoRapportBewerking(huidigeInhoud, instructie) : result.text.trim();

  return {
    inhoud,
    antwoord: 'Rapport bijgewerkt. Controleer de wijziging in het voorbeeld.',
    _source: result._source,
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

  const result = await aiConnector.fetch({
    prompt: `Beantwoord de vraag over het rapport "${rapportTitel}" voor tracé ${trace.code}.
Conflicten: ${conflictContext}

Vraag: ${vraag}

Rapportfragment (begin):
${rapportFragment.slice(0, 2500)}`,
    context: trace.naam,
  });

  return { antwoord: result.text, _source: result._source };
}
