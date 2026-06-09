import type { DemoProject } from '@/demo/projects';
import type { DossierItem } from '@/lib/dossier/store';
import type { ProjectSummary } from '@/lib/services/project-stats';
import { DISCIPLINE_LABELS } from '@/lib/db/types';

export function generateDoDocument(
  project: DemoProject,
  summary: ProjectSummary,
  items: DossierItem[]
): string {
  const bijlagen = items
    .map((i) => `| ${i.naam} | ${i.type} | ${i.formaat ?? 'txt'} | ${new Date(i.createdAt).toLocaleDateString('nl-NL')} |`)
    .join('\n');

  const traces = summary.traces
    .map(
      (t) => `### ${t.trace.code} — ${t.trace.naam}

| Aspect | Gegevens |
|--------|----------|
| Discipline | ${DISCIPLINE_LABELS[t.trace.discipline]} |
| Fase | ${t.trace.fase} |
| Lengte | ${Math.round(t.lengteM)} m |
| Leglocatie | ${t.trace.leglocatie} |
| Voortgang | ${t.voortgang}% |
| Conflicten | ${t.conflicten} (${t.blokkerendeConflicten} blokkerend) |

Het tracé ${t.trace.code} loopt langs ${t.trace.wegnaam} en omvat ${t.trace.segmenten.length} segmenten met gevarieerde legtechnieken. De engineering-berekeningen en tekeningen voor dit tracé zijn opgenomen in de bijlagen van dit dossier.`
    )
    .join('\n\n');

  const onderzoeken = items.filter((i) => i.type === 'onderzoek');
  const onderzoekSamenvatting =
    onderzoeken.length > 0
      ? onderzoeken.map((o) => `- **${o.naam}** — opgesteld en opgeslagen in dossier`).join('\n')
      : 'Nog geen onderzoeksrapporten opgeslagen. Genereer onderzoeken via de tracé-workspace.';

  return `# Definitief Ontwerp (DO)
## ${project.naam}

| Veld | Waarde |
|------|--------|
| Projectnummer | ${project.projectnummer} |
| Opdrachtgever | ${project.opdrachtgever} |
| Gebied | ${project.gebied} |
| Status | ${project.status} |
| Datum document | ${new Date().toLocaleDateString('nl-NL')} |
| Versie | 1.0 (concept) |

---

## Inhoudsopgave

1. Inleiding en doelstelling
2. Projectscope en randvoorwaarden
3. Tracéoverzicht
4. Engineering en dimensionering
5. Tekeningen en visualisaties
6. Onderzoeken en vergunningen
7. Risico's en open punten
8. Bijlagenoverzicht
9. Goedkeuring

---

## 1. Inleiding en doelstelling

Dit Definitief Ontwerp (DO) beschrijft het gehele project **${project.naam}** conform de eisen voor ondergrondse infrastructuur. Het document bundelt tracéontwerp, engineering-berekeningen, tekeningen, onderzoeken en vergunningsdocumentatie tot één samenhangend pakket voor beoordeling door opdrachtgever en bevoegde instanties.

${project.omschrijving}

Het DO vormt de basis voor:
- Vergunningsaanvragen en meldingen (Wnb, Omgevingswet, KLIC)
- Uitvoeringsplanning en bestekvorming
- Afstemming met netbeheerders en wegbeheerder
- Interne kwaliteitsborging conform ISO 9001

## 2. Projectscope en randvoorwaarden

| Indicator | Waarde |
|-----------|--------|
| Aantal tracés | ${summary.traceCount} |
| Totale tracelengte | ${Math.round(summary.totaleLengteM)} m |
| Gemiddelde voortgang | ${summary.voortgang}% |
| Open acties | ${summary.openActies} |
| Blokkerende acties | ${summary.blokkerendeActies} |
| Conflicten totaal | ${summary.conflicten} |

### Randvoorwaarden

- Uitvoering conform geldende normen (NEN 1010, NEN 3650, NEN 3651, NEN 5725)
- Coördinatie met wegbeheerder en nutsbedrijven via KLIC-procedure
- Minimale verstoring openbare ruimte; voorkeur voor gestuurd boren (HDD) bij kruisingen
- Bouwrijp opleveren conform afspraken in uitvoeringsovereenkomst

## 3. Tracéoverzicht

${traces || 'Geen tracés gedefinieerd.'}

## 4. Engineering en dimensionering

De engineering-berekeningen zijn uitgevoerd per discipline (Elektra, Gas, Water) conform de toepasselijke normen. Per tracé zijn dimensioneringen uitgevoerd voor leidingdiameter, wanddikte, diepte, drukklasse en stationscomponenten.

**Berekeningen in dossier:** ${items.filter((i) => i.type === 'berekening').length}

De berekeningen omvatten onder meer:
- Elektra: kabeldimensionering LS/MS, kortsluitstroom, spanningsval
- Gas: drukklasse, wanddikte, stationcomponenten
- Water: leidingdiameter, drukverlies, aansluitcapaciteit

Alle berekeningen zijn voorzien van normreferentie, invoerparameters, aannames en conclusie.

## 5. Tekeningen en visualisaties

Tekeningen zijn gegenereerd conform NLCS/COINS-principes met titelblok, noordpijl, schaal en legenda:

- **Situatietekening (tracéplan)** — tracéloop in topografische context
- **Lengteprofiel** — hoogteverloop en legdiepte langs tracé
- **Dwarsprofiel (AVOI)** — kruising met bestaande infrastructuur
- **Kruisingsdetail** — detailtekening bij nutsleidingkruisingen

**Tekeningen in dossier:** ${items.filter((i) => i.type === 'tekening').length}

## 6. Onderzoeken en vergunningen

### Uitgevoerde onderzoeken

${onderzoekSamenvatting}

### Vergunningen en aanvragen

| Type | Aantal in dossier |
|------|-------------------|
| Onderzoeksrapporten | ${items.filter((i) => i.type === 'onderzoek').length} |
| Concept-aanvragen | ${items.filter((i) => i.type === 'aanvraag').length} |
| Checklists / rapporten | ${items.filter((i) => i.type === 'rapport').length} |
| AI-analyses | ${items.filter((i) => i.type === 'ai').length} |

De vergunningchecklist (OMO) is opgesteld op basis van tracélocatie, discipline en gevoelige objecten in het onderzoeksgebied.

## 7. Risico's en open punten

${summary.blokkerendeActies > 0
    ? `Er zijn **${summary.blokkerendeActies} blokkerende actie(s)** die afhandeling vereisen vóór start uitvoering. Zie actielijst in projectdashboard.`
    : 'Er zijn geen blokkerende acties geregistreerd op dit moment.'}

${summary.conflicten > 0
    ? `In totaal ${summary.conflicten} conflict(en) gedetecteerd in de tracétoets. Kritieke conflicten zijn verwerkt in het tracéontwerp of voorzien van mitigerende maatregelen.`
    : 'Geen conflicten gedetecteerd in de tracétoets.'}

## 8. Bijlagenoverzicht

| Document | Type | Formaat | Datum |
|----------|------|---------|-------|
${bijlagen || '| — | — | — | — |'}

## 9. Goedkeuring

| Rol | Naam | Datum | Handtekening |
|-----|------|-------|--------------|
| Projectleider | — | — | — |
| Lead engineer | — | — | — |
| Opdrachtgever | — | — | — |

---

*Dit document is automatisch gegenereerd door Infra Engine. Goedkeuring door projectleider en opdrachtgever is vereist vóór indiening bij bevoegd gezag.*
`;
}
