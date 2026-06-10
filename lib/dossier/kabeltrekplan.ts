/**
 * Kabeltrekplan-generator (werkvoorbereiding).
 *
 * Vertaalt het tracé en de kabeltrekberekening naar een uitvoeringsdocument
 * per trekvak: treklengte, trekrichting, opstelplaatsen haspel/lier,
 * berekende vs. toelaatbare trekkracht, rollenplan bij bochten en
 * communicatie-afspraken.
 */

import {
  berekenKabeltrek,
  type KabeltrekInput,
  type KabeltrekResultaat,
  type TraceSectie,
} from '@/lib/calc/kabeltrek';
import { formatDocCode } from '@/lib/dossier/doc-code';

export interface TrekvakDefinitie {
  naam: string;
  /** Locatiebeschrijving van begin (haspelzijde bij richting 'heen'). */
  vanLocatie: string;
  totLocatie: string;
  secties: TraceSectie[];
}

export interface KabeltrekplanInput {
  projectCode: string;
  projectNaam: string;
  traceCode: string;
  traceNaam: string;
  kabelOmschrijving: string;
  trekvakken: TrekvakDefinitie[];
  kabel: KabeltrekInput['kabel'];
  /** Wrijvingscoëfficiënt (default uit de berekening: buis 0,4 / rollen 0,2). */
  mu?: number;
  datum?: string;
}

export interface TrekvakResultaat {
  definitie: TrekvakDefinitie;
  berekening: KabeltrekResultaat;
  treklengteM: number;
  haspelLocatie: string;
  lierLocatie: string;
  rollenplan: string[];
}

export interface Kabeltrekplan {
  docCode: string;
  titel: string;
  trekvakken: TrekvakResultaat[];
  markdown: string;
}

function rond(n: number, dec = 1): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}

export function genereerKabeltrekplan(input: KabeltrekplanInput): Kabeltrekplan {
  const datum = input.datum ?? new Date().toISOString().slice(0, 10);
  const docCode = formatDocCode({
    projectCode: input.projectCode,
    fase: 'werkvoorbereiding',
    type: 'PLN',
    volgnummer: 2,
  });

  const trekvakken: TrekvakResultaat[] = input.trekvakken.map((vak) => {
    const berekening = berekenKabeltrek({
      secties: vak.secties,
      kabel: input.kabel,
      mu: input.mu,
    });
    const heen = berekening.adviesRichting === 'heen';
    const treklengteM = vak.secties.reduce(
      (sum, s) => sum + (s.type === 'recht' ? s.lengteM : ((s.hoekDeg * Math.PI) / 180) * s.radiusM),
      0
    );

    // Rollenplan: bij elke bocht hoekrollen, aantal afhankelijk van booglengte (1 rol per ~2 m boog).
    const rollenplan = vak.secties
      .map((s, i) => {
        if (s.type !== 'bocht') return null;
        const boogM = ((s.hoekDeg * Math.PI) / 180) * s.radiusM;
        const aantalRollen = Math.max(2, Math.ceil(boogM / 2));
        return `Sectie ${i + 1}: bocht ${s.hoekDeg}° (R=${s.radiusM} m) — ${aantalRollen} hoekrollen, gelijkmatig over de boog`;
      })
      .filter((r): r is string => r !== null);

    return {
      definitie: vak,
      berekening,
      treklengteM: rond(treklengteM),
      haspelLocatie: heen ? vak.vanLocatie : vak.totLocatie,
      lierLocatie: heen ? vak.totLocatie : vak.vanLocatie,
      rollenplan,
    };
  });

  const markdown = `# Kabeltrekplan — ${input.traceNaam}

| | |
|---|---|
| **Documentcode** | ${docCode} |
| **Project** | ${input.projectNaam} |
| **Tracé** | ${input.traceCode} |
| **Kabel** | ${input.kabelOmschrijving} |
| **Status** | Concept |
| **Datum** | ${datum} |

## Trekvakken
| Vak | Van → naar | Lengte | Richting | Haspel | Lier | F_max berekend | F toelaatbaar | SWP-toets | Akkoord |
|---|---|---|---|---|---|---|---|---|---|
${trekvakken
  .map((v) => {
    const b = v.berekening;
    return `| ${v.definitie.naam} | ${v.definitie.vanLocatie} → ${v.definitie.totLocatie} | ${v.treklengteM} m | ${b.adviesRichting} | ${v.haspelLocatie} | ${v.lierLocatie} | ${rond(b.maxTrekkrachtKN)} kN | ${rond(b.maxTrekkrachtToelaatbaarKN)} kN | ${b[b.adviesRichting].swpVoldoet ? 'voldoet' : 'OVERSCHRIJDING'} | ${b.voldoet ? '✔' : '✘'} |`;
  })
  .join('\n')}

${trekvakken
  .map(
    (v) => `## Trekvak ${v.definitie.naam}
- **Advies**: ${v.berekening.advies}
- **Opstelplaats haspel**: ${v.haspelLocatie}; **lier**: ${v.lierLocatie}.
${v.rollenplan.length > 0 ? `- **Rollenplan**:\n${v.rollenplan.map((r) => `  - ${r}`).join('\n')}` : '- Geen bochten — rechtstandige trek met geleiderollen per 3 m.'}
`
  )
  .join('\n')}

## Communicatieplan
- Portofoonverbinding tussen lierbediener, haspelbegeleider en bochtposten; controle vóór aanvang.
- Trekkracht continu registreren (lier met schrijver of datalogger); stop bij ${rond(
    Math.min(...trekvakken.map((v) => v.berekening.maxTrekkrachtToelaatbaarKN)) * 0.9
  )} kN (90% toelaatbaar).
- Eén aangewezen trekleider geeft start/stop-commando's.

## Aannames
${trekvakken[0]?.berekening.aannames.map((a) => `- ${a}`).join('\n') ?? '- —'}
- Normkader: ${trekvakken[0]?.berekening.normReferentie ?? 'fabrikantgrenswaarden'}.
`;

  return { docCode, titel: `Kabeltrekplan ${input.traceCode}`, trekvakken, markdown };
}
