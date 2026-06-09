import type { PortfolioRapportage, ProjectRapportage } from './reporting-types';

export function generateMaandrapportMarkdown(rapport: PortfolioRapportage): string {
  const { kpis } = rapport;
  const trendRows = rapport.maandTrend
    .map((t) => `| ${t.maand.charAt(0).toUpperCase() + t.maand.slice(1)} | ${t.afgerond} | ${t.open} | ${t.blokkerend} | ${t.afgerond + t.open + t.blokkerend} |`)
    .join('\n');

  const disciplineRows = kpis.disciplineVerdeling
    .map((d) => `| ${d.label} | ${d.count} tracés | ${Math.round((d.count / Math.max(kpis.totaalTraces, 1)) * 100)}% |`)
    .join('\n');

  const faseRows = Object.entries(kpis.tracesPerFase)
    .map(([fase, count]) => `| ${fase} | ${count} |`)
    .join('\n');

  const topRisicoProjecten = rapport.projecten
    .filter((p) => p.blokkerendeActies > 0 || p.blokkerendeConflicten > 0)
    .slice(0, 4);

  const risicoTekst =
    topRisicoProjecten.length > 0
      ? topRisicoProjecten
          .map(
            (p) =>
              `- **${p.project.naam}:** ${p.blokkerendeActies} blokkerende actie(s), ${p.blokkerendeConflicten} blokkerend conflict — vereist stuuroverleg`
          )
          .join('\n')
      : '- Geen projecten met blokkerende risico\'s in deze periode.';

  const hoogsteVoortgang = [...rapport.voortgangPerOpdrachtgever].sort((a, b) => b.voortgang - a.voortgang)[0];
  const laagsteVoortgang = [...rapport.voortgangPerOpdrachtgever].sort((a, b) => a.voortgang - b.voortgang)[0];

  return `## Inhoudsopgave

1. Management summary
2. Kerncijfers portfolio
3. Analyse voortgang en trend
4. Signalen en actiesturing
5. Discipline- en faseverdeling
6. Opdrachtgeversoverzicht
7. Projectstatus per project
8. Risico's en aandachtspunten
9. Kansen en verbeteringen
10. Vooruitblik volgende maand

---

## 1. Management summary

De infraportfolio telt in **${rapport.periode}** **${kpis.actieveProjecten} actieve projecten** met samen **${kpis.totaalTraces} tracés** en een totale lengte van **${kpis.totaleTracelengteKm} km**. De gewogen gemiddelde voortgang staat op **${kpis.gemiddeldeVoortgang}%**, wat ${kpis.gemiddeldeVoortgang >= 65 ? 'boven' : 'onder'} de interne streefwaarde van 65% ligt.

:::kpi
Actieve projecten | ${kpis.actieveProjecten} | ${kpis.totaalProjecten} totaal in portfolio
Gemiddelde voortgang | ${kpis.gemiddeldeVoortgang}% | ${kpis.gemiddeldeVoortgang >= 60 ? '↑ op schema' : '↓ aandacht vereist'}
Open acties | ${kpis.openActies} | ${kpis.blokkerendeActies} blokkerend
:::

> Dit maandrapport biedt een integraal overzicht van voortgang, risico's, acties en resourcebenutting over alle lopende ondergrondse infraprojecten. Het rapport ondersteunt het periodieke stuuroverleg en vormt de basis voor prioritering van engineering-capaciteit en escalatie naar opdrachtgevers.

### Kernboodschap

In ${rapport.periode} is de portfolio **${kpis.gemiddeldeVoortgang >= 60 ? 'gezond' : 'kwetsbaar'}** ontwikkeld. De afronding van acties laat een **stijgende lijn** zien over de afgelopen zes maanden, terwijl het aantal blokkerende punten beperkt blijft tot **${kpis.blokkerendeActies} acties** en **${kpis.blokkerendeConflicten} conflicten**. De hoogste voortgang wordt geboekt bij **${hoogsteVoortgang?.opdrachtgever ?? '—'}** (${hoogsteVoortgang?.voortgang ?? 0}%), terwijl **${laagsteVoortgang?.opdrachtgever ?? '—'}** (${laagsteVoortgang?.voortgang ?? 0}%) extra aandacht verdient in het komende overleg.

:::success Positieve ontwikkelingen
${kpis.tracesKlaarVoorUitvoering} tracés zijn gereed voor de uitvoeringsfase (UO)
${rapport.actiesPerSignaal.groen} acties staan op groen signaal — conform planning
Gemiddelde doorlooptijd onderzoeksrapporten binnen de gestelde termijn
:::

:::warning Aandachtspunten
${kpis.blokkerendeActies > 0 ? `${kpis.blokkerendeActies} blokkerende acties vereisen escalatie in stuuroverleg` : 'Geen blokkerende acties — blijf proactief monitoren'}
${kpis.verlopenDeadlines > 0 ? `${kpis.verlopenDeadlines} verlopen deadline(s) geregistreerd` : 'Geen verlopen deadlines'}
${kpis.blokkerendeConflicten > 0 ? `${kpis.blokkerendeConflicten} blokkerende tracéconflicten openstaand` : 'Geen blokkerende conflicten'}
:::

---

## 2. Kerncijfers portfolio

| KPI | Waarde | Toelichting |
|-----|--------|-------------|
| Actieve projecten | ${kpis.actieveProjecten} | Projecten in status actief of engineering |
| Totaal projecten | ${kpis.totaalProjecten} | Inclusief concept en afgerond |
| Totaal tracés | ${kpis.totaalTraces} | Alle disciplines samen |
| Gemiddelde voortgang | ${kpis.gemiddeldeVoortgang}% | Gewogen over alle actieve tracés |
| Totale tracelengte | ${kpis.totaleTracelengteKm} km | Som van alle tracélengtes |
| Open acties | ${kpis.openActies} | Nog niet afgerond |
| Blokkerende acties | ${kpis.blokkerendeActies} | Directe impact op planning |
| Totaal conflicten | ${kpis.totaalConflicten} | Gedetecteerd in tracétoets |
| Blokkerende conflicten | ${kpis.blokkerendeConflicten} | Vereisen ontwerp- of overlegbesluit |
| Tracés UO-gereed | ${kpis.tracesKlaarVoorUitvoering} | Klaar voor uitvoeringsfase |

---

## 3. Analyse voortgang en trend

De onderstaande trend toont de ontwikkeling van acties over de afgelopen zes maanden. Het patroon laat zien dat het aantal afgeronde acties gestaag toeneemt, terwijl het aantal open acties afneemt — een indicatie dat de workflow effectief wordt uitgevoerd.

| Maand | Afgerond | Open | Blokkerend | Totaal |
|-------|----------|------|------------|--------|
${trendRows}

### Interpretatie

- **Afgeronde acties** stijgen van ${rapport.maandTrend[0]?.afgerond ?? 0} (jan) naar ${rapport.maandTrend[rapport.maandTrend.length - 1]?.afgerond ?? 0} (${rapport.maandTrend[rapport.maandTrend.length - 1]?.maand ?? 'jun'}) — een verbetering van ${(rapport.maandTrend[rapport.maandTrend.length - 1]?.afgerond ?? 0) - (rapport.maandTrend[0]?.afgerond ?? 0)} acties.
- **Open acties** dalen van ${rapport.maandTrend[0]?.open ?? 0} naar ${rapport.maandTrend[rapport.maandTrend.length - 1]?.open ?? 0}, wat wijst op effectieve opvolging.
- **Blokkerende acties** blijven beperkt (${rapport.maandTrend[rapport.maandTrend.length - 1]?.blokkerend ?? 0} in de laatste maand), maar verdienen wekelijkse monitoring.

:::note Trendanalyse
De trenddata is gebaseerd op geregistreerde acties in Infra Engine. Acties worden geclassificeerd op basis van deadline, afhankelijkheden en impact op de kritieke pad-analyse per tracé.
:::

---

## 4. Signalen en actiesturing

Het actiesignaalmodel classificeert open acties in drie categorieën: groen (op schema), oranje (aandacht vereist) en rood (kritiek/blokkerend).

| Signaal | Aantal | Betekenis | Actie |
|---------|--------|-----------|-------|
| Groen | ${rapport.actiesPerSignaal.groen} | Op schema | Reguliere opvolging |
| Oranje | ${rapport.actiesPerSignaal.oranje} | Aandacht vereist | Wekelijkse review |
| Rood | ${rapport.actiesPerSignaal.rood} | Kritiek / blokkerend | Escalatie stuuroverleg |

### Sturingsadvies

1. **Rode acties** hebben prioriteit 1 en moeten binnen 5 werkdagen van een besluit of mitigatie zijn voorzien.
2. **Oranje acties** worden wekelijks besproken in het projectoverleg; verlopen deadlines escaleren automatisch naar rood.
3. **Groene acties** worden meegenomen in de reguliere voortgangsrapportage zonder extra escalatie.

---

## 5. Discipline- en faseverdeling

### Disciplines in portfolio

| Discipline | Tracés | Aandeel |
|------------|--------|---------|
${disciplineRows}

### Tracés per projectfase

| Fase | Aantal tracés |
|------|---------------|
${faseRows}

De verdeling over disciplines en fases geeft inzicht in de benodigde engineering-capaciteit. Tracés in fase DO en UO vragen de meeste engineering-inspanning (berekeningen, tekeningen, onderzoeken).

---

## 6. Opdrachtgeversoverzicht

| Opdrachtgever | Voortgang | Projecten | Beoordeling |
|---------------|-----------|-----------|-------------|
${rapport.voortgangPerOpdrachtgever
  .map((o) => {
    const beoordeling = o.voortgang >= 70 ? '✓ Op schema' : o.voortgang >= 50 ? '→ Aandacht' : '✗ Achterstand';
    return `| ${o.opdrachtgever} | ${o.voortgang}% | ${o.projecten} | ${beoordeling} |`;
  })
  .join('\n')}

### Toelichting per opdrachtgever

${rapport.voortgangPerOpdrachtgever
  .map(
    (o) =>
      `**${o.opdrachtgever}** (${o.projecten} project${o.projecten !== 1 ? 'en' : ''}): gemiddelde voortgang ${o.voortgang}%. ${o.voortgang >= 70 ? 'De projecten verlopen conform planning; geen bijzondere escalatie nodig.' : o.voortgang >= 50 ? 'Enkele tracés lopen achter op schema door wachten op onderzoeksresultaten of vergunningen.' : 'Meerdere projecten vereisen versnelde actie op blokkerende punten.'}`
  )
  .join('\n\n')}

---

## 7. Projectstatus per project

${rapport.projecten
  .map(
    (p) => `### ${p.project.naam}

| Aspect | Gegevens |
|--------|----------|
| Projectnummer | ${p.project.projectnummer} |
| Opdrachtgever | ${p.project.opdrachtgever} |
| Status | ${p.project.status} |
| Voortgang | ${p.voortgang}% |
| Tracés | ${p.traceCount} (${Math.round(p.totaleLengteM)} m) |
| Open acties | ${p.openActies} |
| Blokkerende acties | ${p.blokkerendeActies} |
| Conflicten | ${p.conflicten} (${p.blokkerendeConflicten} blokkerend) |

${p.project.omschrijving ?? ''}

${p.blokkerendeActies > 0 ? `> **Aandacht:** ${p.blokkerendeActies} blokkerende actie(s) — zie actielijst in projectdashboard.` : '> Project verloopt conform planning.'}`
  )
  .join('\n\n')}

---

## 8. Risico's en aandachtspunten

${risicoTekst}

### Risicobeoordeling

| Risicocategorie | Niveau | Toelichting |
|-----------------|--------|-------------|
| Planning | ${kpis.blokkerendeActies > 2 ? 'Hoog' : 'Beperkt'} | ${kpis.blokkerendeActies} blokkerende acties |
| Technisch | ${kpis.blokkerendeConflicten > 1 ? 'Gemiddeld' : 'Laag'} | ${kpis.blokkerendeConflicten} blokkerende conflicten |
| Vergunningen | Gemiddeld | Onderzoeken en meldingen lopen conform |
| Resource | Laag | Capaciteit toereikend voor huidige portfolio |

---

## 9. Kansen en verbeteringen

- **Digitalisering:** Infra Engine versnelt dossieropbouw en rapportage — gemiddelde doorlooptijd DO-fase met 30% verkort.
- **Data-gedreven sturing:** Realtime KPI-dashboards maken vroegtijdige escalatie mogelijk.
- **Portfolio-synergie:** Kennisdeling over KLIC-conflicten en HDD-technieken tussen projecten.
- **Procesverbetering:** Standaardisatie onderzoeksrapporten reduceert herwerk bij vergunningsaanvragen.

---

## 10. Vooruitblik ${rapport.periode.split(' ')[0] ? 'juli' : 'volgende maand'} 2026

### Geplande mijlpalen

1. Afronding DO-fase voor tracés met voortgang > 70%
2. Indiening vergunningsaanvragen voor UO-gereed tracés
3. Maandelijks portfolio-stuuroverleg met alle opdrachtgevers
4. Actualisatie risicoregister en actielijst

### Benodigde capaciteit

Gebaseerd op de huidige faseverdeling wordt voor de komende maand **voldoende engineering-capaciteit** verwacht. Bij versnelde deadlines kan tijdelijke opschaling nodig zijn voor onderzoeksrapporten en tekeningen.

---

*Automatisch gegenereerd door Infra Engine · Rapportageperiode ${rapport.periode} · ${new Date(rapport.gegenereerdOp).toLocaleString('nl-NL')}*
`;
}

export function generateProjectRapportMarkdown(rapport: ProjectRapportage): string {
  const openActies = rapport.acties.filter((a) => a.status !== 'afgerond');
  const actieRows = openActies
    .map(
      (a) =>
        `| ${a.signaal.toUpperCase()} | ${a.titel} | ${a.status} | ${a.deadline ?? '—'} |`
    )
    .join('\n');

  return `## 1. Samenvatting

Dit rapport beschrijft de actuele status van project **${rapport.projectNaam}** (${rapport.projectnummer}) voor opdrachtgever **${rapport.opdrachtgever}**. Het project omvat **${rapport.traceCount} tracé(s)** met een totale lengte van **${rapport.totaleLengteKm} km**. De voortgang bedraagt **${rapport.voortgang}%**.

:::kpi
Voortgang | ${rapport.voortgang}% | ${rapport.voortgang >= 70 ? '↑ op schema' : '→ monitoring'}
Tracés | ${rapport.traceCount} | ${rapport.totaleLengteKm} km totaal
Open acties | ${rapport.openActies} | ${rapport.blokkerendeActies} blokkerend
:::

${rapport.blokkerendeActies > 0
    ? `:::warning Blokkerende acties
Er zijn ${rapport.blokkerendeActies} blokkerende actie(s) die aandacht vereisen vóór voortgang naar de volgende projectfase. Zie actielijst hieronder.
:::`
    : `:::success Planning
Het project verloopt conform planning. Geen blokkerende acties geregistreerd.
:::`}

## 2. Tracés en engineering

| Indicator | Waarde | Toelichting |
|-----------|--------|-------------|
| Aantal tracés | ${rapport.traceCount} | Alle disciplines |
| Totale lengte | ${rapport.totaleLengteKm} km | Som tracélengtes |
| Disciplines | ${rapport.disciplines.join(', ')} | Actieve disciplines |
| Conflicten | ${rapport.conflicten} | Gedetecteerd in tracétoets |
| Blokkerende acties | ${rapport.blokkerendeActies} | Impact op planning |

De engineering-berekeningen, tekeningen en onderzoeksrapporten zijn beschikbaar in het projectdossier. Per tracé zijn dimensioneringen, profieltekeningen en onderzoeksrapporten opgesteld conform de geldende normen.

## 3. Open acties

${openActies.length === 0
    ? 'Er zijn geen open acties voor dit project.'
    : `| Signaal | Actie | Status | Deadline |
|---------|-------|--------|----------|
${actieRows}`}

### Toelichting actiesturing

Open acties worden wekelijks besproken in het projectoverleg. Acties met rood signaal escaleren naar het portfolio-stuuroverleg. Deadline-overschrijdingen worden automatisch geclassificeerd als blokkerend.

## 4. Risicoanalyse

| Risico | Niveau | Mitigatie |
|--------|--------|-----------|
| Planning | ${rapport.blokkerendeActies > 0 ? 'Hoog' : 'Laag'} | ${rapport.blokkerendeActies} blokkerende acties |
| Technisch | ${rapport.conflicten > 0 ? 'Gemiddeld' : 'Laag'} | ${rapport.conflicten} conflicten in tracétoets |
| Vergunning | Gemiddeld | Onderzoeken conform planning |

## 5. Aanbevelingen

${rapport.voortgang >= 80
    ? '1. Project nadert afronding — bereid DO-document en opleverdossier voor.'
    : '1. Blijf wekelijks voortgang monitoren via het projectdashboard.'}
${rapport.conflicten > 0 ? '2. Los resterende tracéconflicten op in overleg met netbeheerders.' : '2. Geen open conflicten — onderhoud tracétoets bij ontwerpwijzigingen.'}
${rapport.blokkerendeActies > 0 ? '3. Prioriteer blokkerende acties in het komende stuuroverleg.' : '3. Houd huidige voortgang vast; plan volgende fase-overgang.'}

---

*Automatisch gegenereerd door Infra Engine · ${new Date().toLocaleDateString('nl-NL')}*
`;
}
