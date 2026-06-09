import type { CalcResult } from '@/lib/calc/types';
import type { DossierItem } from '@/lib/dossier/store';
import type { VergunningCheckItem } from '@/lib/research/types';
import { renderReportMarkdown } from '@/lib/reports/markdown';

function calcToMarkdown(calc: CalcResult, titel: string): string {
  const invoerRows = Object.entries(calc.invoer)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');
  const resultaatRows = Object.entries(calc.resultaat)
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join('\n');

  return `# ${titel}

**Discipline:** ${calc.discipline}  
**Norm:** ${calc.normReferentie}

## Invoerparameters

| Parameter | Waarde |
|-----------|--------|
${invoerRows}

## Resultaten

| Resultaat | Waarde |
|-----------|--------|
${resultaatRows}

## Aannames

${calc.aannames.map((a) => `- ${a}`).join('\n')}

## Conclusie

${calc.conclusie}
`;
}

function checklistToMarkdown(items: VergunningCheckItem[], titel: string): string {
  const rows = items
    .map((i) => `| ${i.vergunning} | ${i.status} | ${i.reden ?? '—'} |`)
    .join('\n');

  return `# ${titel}

## Overzicht vergunningen en toetsingen

| Vergunning / toetsing | Status | Toelichting |
|-----------------------|--------|-------------|
${rows}

## Toelichting

Dit overzicht is opgesteld conform de OMO/OMA-methodiek. Status *vereist* betekent dat een vergunning of melding nodig is vóór start werkzaamheden. Status *concept* geeft aan dat de aanvraag in voorbereiding is.
`;
}

function aiAnalyseToMarkdown(text: string, titel: string): string {
  return `# ${titel}

## AI-conflictanalyse

${text}

---

*Dit document is gegenereerd door de Infra Engine AI-assistent. Beoordeling door een bevoegd engineer is vereist.*
`;
}

/** Converteer een dossieritem naar markdown voor weergave en export. */
export function dossierItemToMarkdown(item: DossierItem): string {
  if (item.formaat === 'markdown') return item.inhoud;
  if (item.formaat === 'text') return `# ${item.naam}\n\n${item.inhoud}`;
  if (item.formaat === 'json') {
    try {
      const parsed = JSON.parse(item.inhoud);
      if (item.type === 'berekening' && parsed.type) {
        return calcToMarkdown(parsed as CalcResult, item.naam);
      }
      if (item.type === 'rapport' && Array.isArray(parsed)) {
        return checklistToMarkdown(parsed as VergunningCheckItem[], item.naam);
      }
    } catch {
      /* val door naar plain */
    }
  }
  if (item.type === 'ai') {
    return aiAnalyseToMarkdown(item.inhoud, item.naam);
  }
  return `# ${item.naam}\n\n${item.inhoud}`;
}

/** HTML voor in-app weergave (markdown-achtige documenten). */
export function dossierItemToHtml(item: DossierItem): string {
  if (item.formaat === 'svg') {
    return `<div class="dossier-svg-preview">${item.inhoud}</div>`;
  }
  return renderReportMarkdown(dossierItemToMarkdown(item), 'light');
}

export function isDossierItemTextDocument(item: DossierItem): boolean {
  return item.formaat !== 'svg';
}
