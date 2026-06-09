/**
 * V&G-plan ontwerpfase (Arbobesluit §2.26 e.v.).
 *
 * Template-gestuurd document, automatisch gevuld met projectrisico's uit de
 * quick scans en de tracétoets. Signaleert het BEI/VIAG-regime bij MS-/gas-
 * werkzaamheden, maar vervangt nadrukkelijk geen werkinstructies.
 */

import { NORMEN } from '@/lib/normen';
import { formatDocCode } from '@/lib/dossier/doc-code';
import type { Discipline } from '@/lib/db/types';
import { DISCIPLINE_LABELS } from '@/lib/db/types';

export interface VgRisico {
  thema: string;
  omschrijving: string;
  ernst: 'hoog' | 'middel' | 'laag';
  beheersmaatregel: string;
}

export interface VgPlanInput {
  projectNaam: string;
  projectCode: string;
  opdrachtgever?: string;
  traceNaam: string;
  traceCode: string;
  discipline: Discipline;
  lengteM: number;
  /** Risicosignalen uit quick scans / tracétoets (vrije tekst). */
  signalen: string[];
  aantalBoringen: number;
  nabijWater: boolean;
  datum?: string;
}

export interface VgPlan {
  docCode: string;
  titel: string;
  risicos: VgRisico[];
  markdown: string;
}

/** Basisrisico's die bij elk K&L-werk gelden. */
const BASIS_RISICOS: VgRisico[] = [
  {
    thema: 'Graafschade',
    omschrijving: 'Raken van bestaande kabels/leidingen tijdens ontgraven',
    ernst: 'hoog',
    beheersmaatregel: `Zorgvuldig graafproces conform ${NORMEN.crow500.code}: KLIC-melding, proefsleuven, handmatig graven binnen zorgvuldigheidszone`,
  },
  {
    thema: 'Aanrijdgevaar',
    omschrijving: 'Werken langs of op de rijbaan',
    ernst: 'middel',
    beheersmaatregel: 'Verkeersmaatregelen conform CROW 96b, afzetting en bebording',
  },
  {
    thema: 'Sleufstabiliteit',
    omschrijving: 'Inkalven van sleufwanden, instabiliteit bij grondwater',
    ernst: 'middel',
    beheersmaatregel: 'Taluds of sleufbekisting > 1,0 m diepte; bemaling waar nodig',
  },
];

function risicosUitSignalen(input: VgPlanInput): VgRisico[] {
  const risicos: VgRisico[] = [];
  const tekst = input.signalen.join(' ').toLowerCase();

  if (input.discipline === 'elektra_ms' || input.discipline === 'stations') {
    risicos.push({
      thema: 'Elektrische veiligheid (MS)',
      omschrijving: 'Werkzaamheden aan of nabij middenspanningsinfrastructuur',
      ernst: 'hoog',
      beheersmaatregel: `Werkregime conform ${NORMEN.beiViag.code}; aanwijzingenbeleid netbeheerder; dit plan vervangt geen werkinstructie`,
    });
  }
  if (input.discipline.startsWith('gas')) {
    risicos.push({
      thema: 'Gasveiligheid',
      omschrijving: 'Werkzaamheden aan of nabij gasvoerende leidingen',
      ernst: 'hoog',
      beheersmaatregel: `Werkregime conform ${NORMEN.beiViag.code} (VIAG); gasmeting bij werkzaamheden nabij bestaande leidingen`,
    });
  }
  if (input.aantalBoringen > 0) {
    risicos.push({
      thema: 'Boorwerkzaamheden (HDD)',
      omschrijving: `${input.aantalBoringen} gestuurde boring(en): mudverlies/blow-out, hijswerk, machineveiligheid`,
      ernst: 'middel',
      beheersmaatregel: `Boorplan per boring conform ${NORMEN.nen3650.code}; mudbeheersing en monitoring; vrijgegraven in-/uittredepunten`,
    });
  }
  if (input.nabijWater) {
    risicos.push({
      thema: 'Werken nabij water',
      omschrijving: 'Verdrinkingsgevaar en instabiliteit bij watergangen/keurzones',
      ernst: 'middel',
      beheersmaatregel: 'Reddingsmiddelen aanwezig; afstemming waterschap (keurvergunning)',
    });
  }
  if (/verontreinig|bodemverontreiniging/.test(tekst)) {
    risicos.push({
      thema: 'Verontreinigde grond',
      omschrijving: 'Werken in of nabij (verdacht) verontreinigde bodem',
      ernst: 'hoog',
      beheersmaatregel: 'Veiligheidsklasse bepalen conform CROW 400; BUS-melding/saneringsplan waar vereist',
    });
  }
  if (/nge|explosiev/.test(tekst)) {
    risicos.push({
      thema: 'Niet-gesprongen explosieven',
      omschrijving: 'Tracé (deels) in NGE-risicogebied',
      ernst: 'hoog',
      beheersmaatregel: 'Vooronderzoek OCE; detectie/benadering door gecertificeerd bedrijf vóór grondroering',
    });
  }
  if (/natura ?2000|ecologie|beschermde/.test(tekst)) {
    risicos.push({
      thema: 'Ecologie',
      omschrijving: 'Werkzaamheden nabij beschermd natuurgebied of beschermde soorten',
      ernst: 'middel',
      beheersmaatregel: 'Ecologisch werkprotocol; werken buiten broedseizoen waar van toepassing',
    });
  }
  return risicos;
}

export function genereerVgPlan(input: VgPlanInput): VgPlan {
  const datum = input.datum ?? new Date().toISOString().slice(0, 10);
  const docCode = formatDocCode({
    projectCode: input.projectCode,
    fase: 'werkvoorbereiding',
    type: 'VGP',
    volgnummer: 1,
  });
  const risicos = [...risicosUitSignalen(input), ...BASIS_RISICOS];

  const markdown = `# V&G-plan ontwerpfase — ${input.projectNaam}

| | |
|---|---|
| **Documentcode** | ${docCode} |
| **Project** | ${input.projectNaam}${input.opdrachtgever ? ` (opdrachtgever: ${input.opdrachtgever})` : ''} |
| **Tracé** | ${input.traceCode} — ${input.traceNaam} (${DISCIPLINE_LABELS[input.discipline]}, ${Math.round(input.lengteM)} m) |
| **Status** | Concept |
| **Datum** | ${datum} |

## 1. Inleiding
Dit V&G-plan ontwerpfase is opgesteld conform Arbobesluit §2.26 e.v. Het inventariseert de veiligheids- en gezondheidsrisico's die in de ontwerpfase zijn onderkend en draagt deze over aan de uitvoerende partij. Het plan wordt in de uitvoeringsfase aangevuld tot V&G-plan uitvoeringsfase.

> **Let op:** dit plan vervangt geen werkinstructies of het aanwijzingenbeleid van de netbeheerder (${NORMEN.beiViag.code}).

## 2. Projectkenmerken
- Aanleg ${DISCIPLINE_LABELS[input.discipline].toLowerCase()}, tracélengte circa ${Math.round(input.lengteM)} m.
- Sleufloze passages: ${input.aantalBoringen}.
- Werkzaamheden nabij water: ${input.nabijWater ? 'ja' : 'nee'}.

## 3. Risico-inventarisatie en beheersmaatregelen
| # | Thema | Risico | Ernst | Beheersmaatregel (ontwerpfase) |
|---|---|---|---|---|
${risicos
  .map((r, i) => `| ${i + 1} | ${r.thema} | ${r.omschrijving} | ${r.ernst} | ${r.beheersmaatregel} |`)
  .join('\n')}

## 4. Signalen uit quick scans
${input.signalen.length > 0 ? input.signalen.map((s) => `- ${s}`).join('\n') : '- Geen aanvullende signalen uit de quick scans.'}

## 5. Afspraken en vervolg
- V&G-coördinator ontwerpfase: _in te vullen door opdrachtgever_.
- Dit plan wordt overgedragen bij gunning en aangevuld door de V&G-coördinator uitvoeringsfase.
`;

  return { docCode, titel: `V&G-plan ontwerpfase ${input.traceCode}`, risicos, markdown };
}
