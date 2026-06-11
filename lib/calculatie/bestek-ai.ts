import { anthropicComplete, isAnthropicConfigured } from '@/lib/connectors/ai/anthropic';
import type { CalculatieRegel, CalculatieResult } from './types';

/**
 * Prijsverrijking van de calculatie:
 * - Mét bestek: AI koppelt de calculatieregels aan de bestekposten en neemt de
 *   eenheidsprijzen uit het bestek over (bestek is leidend voor álle calculaties).
 * - Zonder bestek: AI maakt een marktconforme raming op basis van de
 *   beschikbare informatie (regels, hoeveelheden, discipline).
 * - Zonder AI-configuratie blijven de standaard kengetallen staan.
 */

export interface PrijsBron {
  bron: 'bestek' | 'ai_raming' | 'kengetallen';
  toelichting: string;
}

interface AiPrijsRegel {
  postnummer: string;
  eenheidsprijs: number;
  toelichting?: string;
}

function parseAiPrijzen(text: string): AiPrijsRegel[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (r): r is AiPrijsRegel =>
          typeof r === 'object' &&
          r !== null &&
          typeof (r as AiPrijsRegel).postnummer === 'string' &&
          typeof (r as AiPrijsRegel).eenheidsprijs === 'number' &&
          (r as AiPrijsRegel).eenheidsprijs >= 0
      )
      .slice(0, 500);
  } catch {
    return null;
  }
}

function pasPrijzenToe(
  calculatie: CalculatieResult,
  prijzen: AiPrijsRegel[],
  bronLabel: string
): CalculatieResult {
  const prijsMap = new Map(prijzen.map((p) => [p.postnummer, p]));

  const update = (regel: CalculatieRegel): CalculatieRegel => {
    const prijs = prijsMap.get(regel.postnummer);
    if (!prijs) return regel;
    const eenheidsprijs = Math.round(prijs.eenheidsprijs * 100) / 100;
    return {
      ...regel,
      eenheidsprijs,
      totaal: Math.round(regel.hoeveelheid * eenheidsprijs * 100) / 100,
      toelichting: [regel.toelichting, prijs.toelichting ?? bronLabel]
        .filter(Boolean)
        .join(' · '),
    };
  };

  const hoofdgroepen = calculatie.hoofdgroepen.map((groep) => {
    const regels = groep.regels.map(update);
    return {
      ...groep,
      regels,
      subtotaal: Math.round(regels.reduce((s, r) => s + r.totaal, 0) * 100) / 100,
    };
  });
  const regels = hoofdgroepen.flatMap((g) => g.regels);
  const subtotaal = Math.round(regels.reduce((s, r) => s + r.totaal, 0) * 100) / 100;
  const projectleiding = Math.round(subtotaal * 0.08 * 100) / 100;
  const risicoregeling = Math.round(subtotaal * 0.05 * 100) / 100;
  const totaalExclBtw = Math.round((subtotaal + projectleiding + risicoregeling) * 100) / 100;
  const btw = Math.round(totaalExclBtw * 0.21 * 100) / 100;

  return {
    ...calculatie,
    hoofdgroepen,
    regels,
    samenvatting: {
      subtotaal,
      projectleiding,
      risicoregeling,
      totaalExclBtw,
      btw,
      totaalInclBtw: Math.round((totaalExclBtw + btw) * 100) / 100,
    },
  };
}

function regelsVoorPrompt(calculatie: CalculatieResult): string {
  return calculatie.regels
    .map(
      (r) =>
        `${r.postnummer} | ${r.omschrijving} | ${r.hoeveelheid} ${r.eenheid} | huidig €${r.eenheidsprijs}/${r.eenheid}`
    )
    .join('\n');
}

export async function verrijkCalculatieMetPrijzen(
  calculatie: CalculatieResult,
  bestek: { naam: string; inhoud: string } | null
): Promise<{ calculatie: CalculatieResult; prijsBron: PrijsBron }> {
  if (!isAnthropicConfigured()) {
    return {
      calculatie,
      prijsBron: {
        bron: 'kengetallen',
        toelichting: bestek
          ? `Bestek "${bestek.naam}" aanwezig maar AI niet geconfigureerd — standaard kengetallen gebruikt`
          : 'Standaard kengetallen (AI niet geconfigureerd)',
      },
    };
  }

  const basis = regelsVoorPrompt(calculatie);
  const result = await anthropicComplete({
    maxTokens: 8192,
    system: bestek
      ? 'Je bent kostendeskundige GWW/kabels & leidingen. Je koppelt calculatieregels aan posten ' +
        'uit het aangeleverde bestek en neemt de eenheidsprijzen uit het bestek over. Antwoord ' +
        'UITSLUITEND met een JSON-array: [{"postnummer":"...","eenheidsprijs":12.34,"toelichting":"bestekpost ..."}]. ' +
        'Alleen regels opnemen waarvoor je een passende bestekpost vindt.'
      : 'Je bent kostendeskundige GWW/kabels & leidingen in Nederland. Geef per calculatieregel een ' +
        'marktconforme eenheidsprijs (prijspeil actueel). Antwoord UITSLUITEND met een JSON-array: ' +
        '[{"postnummer":"...","eenheidsprijs":12.34,"toelichting":"AI-raming: ..."}].',
    prompt: bestek
      ? `BESTEK "${bestek.naam}":\n${bestek.inhoud.slice(0, 30000)}\n\nCALCULATIEREGELS:\n${basis}`
      : `Discipline: ${calculatie.discipline} · tracélengte ${calculatie.lengteM} m\n\nCALCULATIEREGELS:\n${basis}`,
  });

  const prijzen = parseAiPrijzen(result.text);
  if (!prijzen || prijzen.length === 0) {
    return {
      calculatie,
      prijsBron: {
        bron: 'kengetallen',
        toelichting: 'AI-prijskoppeling gaf geen bruikbaar resultaat — standaard kengetallen gebruikt',
      },
    };
  }

  const bronLabel = bestek ? `Prijs uit bestek "${bestek.naam}"` : 'AI-raming';
  return {
    calculatie: pasPrijzenToe(calculatie, prijzen, bronLabel),
    prijsBron: {
      bron: bestek ? 'bestek' : 'ai_raming',
      toelichting: bestek
        ? `${prijzen.length} regels geprijsd vanuit bestek "${bestek.naam}"`
        : `${prijzen.length} regels geprijsd via AI-raming (geen bestek aanwezig)`,
    },
  };
}
