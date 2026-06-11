'use server';

import {
  anthropicComplete,
  isAnthropicConfigured,
  ANTHROPIC_NIET_GECONFIGUREERD,
} from '@/lib/connectors/ai/anthropic';
import { addToDossier, getDossierItems } from '@/lib/dossier/store';

/** Snel model voor interactieve rapportbewerkingen */
const SNEL_MODEL = 'claude-haiku-4-5-20251001';

export interface RapportRevisieResultaat {
  inhoud: string;
  _source: 'live';
  opgeslagen: boolean;
}

/** Sla het (gewijzigde) rapport automatisch op in het dossier: bestaand item bijwerken of toevoegen. */
function autosaveRapport(
  projectId: string,
  traceId: string,
  titel: string,
  inhoud: string
): boolean {
  const bestaand = getDossierItems(projectId, traceId).find(
    (item) => item.naam === titel && (item.type === 'onderzoek' || item.type === 'rapport')
  );
  if (bestaand) {
    bestaand.inhoud = inhoud;
    return true;
  }
  addToDossier({
    projectId,
    traceId,
    naam: titel,
    type: 'rapport',
    inhoud,
    formaat: 'markdown',
  });
  return true;
}

/**
 * Verwerk een gebruikersopmerking direct in het rapport (snel AI-model) en
 * sla het resultaat automatisch op in het dossier.
 */
export async function reviseRapportAction(input: {
  projectId: string;
  traceId: string;
  titel: string;
  inhoud: string;
  opmerking: string;
}): Promise<RapportRevisieResultaat> {
  const opmerking = input.opmerking.trim();
  if (!opmerking) {
    return { inhoud: input.inhoud, _source: 'live', opgeslagen: false };
  }

  if (!isAnthropicConfigured()) {
    throw new Error(ANTHROPIC_NIET_GECONFIGUREERD);
  }

  const result = await anthropicComplete({
    model: SNEL_MODEL,
    maxTokens: 8192,
    system:
      'Je bent technisch redacteur voor infra-engineeringrapporten (kabels & leidingen, Nederland). ' +
      'Je krijgt een rapport in Markdown en één redactionele opmerking. Verwerk de opmerking direct ' +
      'in de rapporttekst: pas alleen aan wat nodig is, behoud structuur, koppen, tabellen en alle ' +
      'normverwijzingen. Antwoord uitsluitend met het volledige bijgewerkte rapport in Markdown, ' +
      'zonder toelichting eromheen.',
    prompt: `OPMERKING VAN DE GEBRUIKER:\n${opmerking}\n\nHUIDIG RAPPORT:\n\n${input.inhoud}`,
  });

  const inhoud = result.text.trim();
  if (!inhoud) {
    throw new Error('AI gaf een leeg antwoord — de opmerking is niet verwerkt. Probeer opnieuw.');
  }
  const opgeslagen = autosaveRapport(input.projectId, input.traceId, input.titel, inhoud);
  return { inhoud, _source: 'live', opgeslagen };
}

/** Markeer een rapport als definitief (goedkeuring) in het dossier. */
export async function markeerRapportDefinitiefAction(input: {
  projectId: string;
  traceId: string;
  titel: string;
  inhoud: string;
}): Promise<{ ok: boolean }> {
  const items = getDossierItems(input.projectId, input.traceId);
  const bestaand = items.find(
    (item) => item.naam === input.titel && (item.type === 'onderzoek' || item.type === 'rapport')
  );
  if (bestaand) {
    bestaand.inhoud = input.inhoud;
    bestaand.naam = bestaand.naam.includes('[DEFINITIEF]')
      ? bestaand.naam
      : `${bestaand.naam} [DEFINITIEF]`;
    return { ok: true };
  }
  addToDossier({
    projectId: input.projectId,
    traceId: input.traceId,
    naam: `${input.titel} [DEFINITIEF]`,
    type: 'rapport',
    inhoud: input.inhoud,
    formaat: 'markdown',
  });
  return { ok: true };
}
