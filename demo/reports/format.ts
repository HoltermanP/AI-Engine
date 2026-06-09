import type { DemoTrace } from '../traces';
import { DEMO_PROJECT, getDemoProjectById } from '../projects';
import { traceLengthM } from '@/lib/geo';

function projectForTrace(trace: DemoTrace) {
  return getDemoProjectById(trace.projectId) ?? DEMO_PROJECT;
}

export type RapportStatus = 'Concept' | 'Definitief' | 'Ter beoordeling';

export interface RapportConfig {
  /** Hoofdtitel, bijv. "Quick Scan Bodem" */
  titel: string;
  /** Ondertitel met norm/standaard */
  ondertitel: string;
  /** Prefix voor rapportnummer, bijv. "QS-BOD" */
  prefix: string;
  trace: DemoTrace;
  /** Aanvullende metadata-rijen */
  extraVelden?: [string, string][];
  status?: RapportStatus;
  versie?: string;
  norm?: string;
}

const RAPPORT_DATUM = new Date().toLocaleDateString('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function rapportNummer(prefix: string, traceCode: string): string {
  return `${prefix}-${traceCode}-2026-001`;
}

export function rapportHeader(config: RapportConfig): string {
  const {
    titel,
    ondertitel,
    prefix,
    trace,
    extraVelden = [],
    status = 'Definitief',
    versie = '1.0',
    norm,
  } = config;

  const coords = trace.coordinates;
  const start = coords[0];
  const end = coords[coords.length - 1];
  const lengte = traceLengthM(trace.coordinates, trace.traceLines);

  const project = projectForTrace(trace);

  const basisVelden: [string, string][] = [
    ['Project', project.naam],
    ['Projectnummer', project.projectnummer],
    ['Tracé', `${trace.code} — ${trace.naam}`],
    ['Discipline', trace.discipline.replace(/_/g, ' ')],
    ['Nettype', trace.netType],
    ['Opdrachtgever', project.opdrachtgever],
    ['Locatie', project.gebied],
    ['Weg / corridor', trace.wegnaam],
    ['Leglocatie', trace.leglocatie],
    ['Tracélengte', `ca. ${lengte} m`],
    ['RD startpunt', `${start[0].toFixed(1)}, ${start[1].toFixed(1)}`],
    ['RD eindpunt', `${end[0].toFixed(1)}, ${end[1].toFixed(1)}`],
    ['Rapportnummer', rapportNummer(prefix, trace.code)],
    ['Rapportdatum', RAPPORT_DATUM],
    ['Versie', versie],
    ['Status', status],
  ];

  if (norm) basisVelden.splice(4, 0, ['Norm / standaard', norm]);

  const alleVelden = [...basisVelden, ...extraVelden];
  const tabel = tabelFromRows(['Veld', 'Waarde'], alleVelden);

  return `# ${titel}
## ${ondertitel}

> **Rapportstatus:** ${status} · Versie ${versie} · ${RAPPORT_DATUM}

${tabel}

${divider()}`;
}

export function divider(): string {
  return '---';
}

export function sectie(nummer: number, titel: string, inhoud: string): string {
  return `## ${nummer}. ${titel}\n\n${inhoud.trim()}`;
}

export function subsectie(nummer: string, titel: string, inhoud: string): string {
  return `### ${nummer} ${titel}\n\n${inhoud.trim()}`;
}

export function conclusieBox(tekst: string): string {
  return `> **Conclusie:** ${tekst}`;
}

export function adviesBox(tekst: string): string {
  return `> **Advies:** ${tekst}`;
}

export function tabelFromRows(
  headers: string[],
  rows: (string | number)[][]
): string {
  const header = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

export function genummerdeLijst(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

export function bulletLijst(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

export function segmentenTabel(trace: DemoTrace): string {
  return tabelFromRows(
    ['Segment', 'Weg', 'Leglocatie', 'Techniek', 'Lengte (m)'],
    trace.segmenten.map((s) => [
      s.volgorde,
      s.wegnaam,
      s.leglocatie,
      s.legtechniek.replace(/_/g, ' '),
      s.lengteM,
    ])
  );
}

export function rapportFooter(discipline: string, trace: DemoTrace): string {
  const project = projectForTrace(trace);

  return `${divider()}

## Ondertekening

| Rol | Naam | Datum |
|-----|------|-------|
| Opgesteld door | Adviseur ${discipline} — Infra Engine BV | ${RAPPORT_DATUM} |
| Gecontroleerd door | Projectleider — ${project.opdrachtgever} | ${RAPPORT_DATUM} |
| Akkoord opdrachtgever | — | — |

*Dit rapport is opgesteld binnen Infra Engine. De inhoud is representatief voor productiegebruik maar vervangt geen veldvalidatie of formele beoordeling door bevoegde instanties.*`;
}

export function samenvattingBlok(
  conclusie: string,
  advies: string,
  punten: string[]
): string {
  return `${conclusieBox(conclusie)}

${adviesBox(advies)}

**Kernpunten:**
${bulletLijst(punten)}`;
}

export function inhoudsopgave(secties: { nummer: number | string; titel: string }[]): string {
  const regels = secties.map((s) => `- **${s.nummer}.** ${s.titel}`);
  return `## Inhoudsopgave\n\n${regels.join('\n')}`;
}

export function referentiesBlok(referenties: string[]): string {
  return `## Referenties\n\n${genummerdeLijst(referenties)}`;
}

export function bijlagenOverzicht(bijlagen: { letter: string; titel: string; beschrijving: string }[]): string {
  const rows = bijlagen.map((b) => [b.letter, b.titel, b.beschrijving]);
  return `## Bijlagen\n\n${tabelFromRows(['Bijlage', 'Titel', 'Beschrijving'], rows)}`;
}

export function scopeBlok(trace: DemoTrace, extra?: string): string {
  const project = projectForTrace(trace);
  return `Dit rapport heeft betrekking op het tracé **${trace.code}** (${trace.naam}) binnen project **${project.naam}** (${project.projectnummer}). Het onderzoeksgebied omvat het tracé en de daarbij behorende onderzoeksbuffer zoals beschreven in de onderzoeksopzet.${extra ? ` ${extra}` : ''}`;
}

export function uitvoeringsOrganisatie(
  opdrachtgever: string,
  uitvoerder: string,
  projectleider: string
): string {
  return tabelFromRows(
    ['Rol', 'Organisatie / persoon'],
    [
      ['Opdrachtgever', opdrachtgever],
      ['Uitvoerend bureau', uitvoerder],
      ['Projectleider', projectleider],
      ['Kwaliteitsborging', 'Vakgroep review conform intern QA-protocol'],
    ]
  );
}
