/**
 * Termijnbewaking: actieve signalering van naderende deadlines — vergunning-
 * besluiten, het KLIC-meldvenster (WIBON: ≤ 20 werkdagen vóór aanvang) en
 * kritiek-pad-activiteiten die binnenkort starten.
 */

import type { DemoProject } from '@/demo/projects';
import { getDemoProjecten, getDemoTraces } from '@/lib/db/demo-store';
import { generateProjectPlanning } from '@/lib/planning/engine';
import { getDemoVergunningStatussen } from '@/lib/db/vergunningen-store';

export type SignaalUrgentie = 'rood' | 'oranje' | 'blauw';

export interface TermijnSignaal {
  id: string;
  projectId: string;
  projectNaam: string;
  urgentie: SignaalUrgentie;
  titel: string;
  detail: string;
  datum: string; // ISO
  dagenResterend: number;
  href: string;
}

function werkdagenTerug(datum: Date, werkdagen: number): Date {
  const d = new Date(datum);
  let resterend = werkdagen;
  while (resterend > 0) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) resterend -= 1;
  }
  return d;
}

function dagenTussen(van: Date, tot: Date): number {
  return Math.round((tot.getTime() - van.getTime()) / 86_400_000);
}

function urgentieVoorDagen(dagen: number): SignaalUrgentie {
  if (dagen <= 7) return 'rood';
  if (dagen <= 21) return 'oranje';
  return 'blauw';
}

/** Signalen voor één project, gesorteerd op datum. */
export function bepaalTermijnSignalen(
  project: DemoProject,
  opts: { horizonDagen?: number } = {},
): TermijnSignaal[] {
  const horizon = opts.horizonDagen ?? 60;
  const vandaag = new Date();
  const traces = getDemoTraces(project.id);
  if (traces.length === 0) return [];

  const planning = generateProjectPlanning(project, traces);
  const statussen = getDemoVergunningStatussen(project.id);
  const signalen: TermijnSignaal[] = [];

  // 1. Vergunningbesluiten (einddatum van vergunning-activiteiten, nog niet verleend)
  for (const act of planning.activiteiten) {
    if (act.categorie !== 'vergunning' || !act.id.includes('vergunning-')) continue;
    const vergunningId = act.id.split('vergunning-')[1];
    if (statussen[vergunningId]?.status === 'verleend') continue;
    const eind = new Date(act.eindDatum);
    const dagen = dagenTussen(vandaag, eind);
    if (dagen < -30 || dagen > horizon) continue;
    signalen.push({
      id: `${project.id}-${act.id}`,
      projectId: project.id,
      projectNaam: project.naam,
      urgentie: dagen < 0 ? 'rood' : urgentieVoorDagen(dagen),
      titel: dagen < 0 ? `Besluit verwacht: ${act.titel}` : `Beslistermijn loopt: ${act.titel}`,
      detail:
        dagen < 0
          ? `Wettelijke termijn verstreken (${Math.abs(dagen)} dagen) — rappelleer het bevoegd gezag of werk de status bij`
          : `Besluit verwacht rond ${eind.toLocaleDateString('nl-NL')} — status bijwerken zodra verleend`,
      datum: act.eindDatum,
      dagenResterend: dagen,
      href: `/project/${project.id}`,
    });
  }

  // 2. KLIC-meldvenster: opent 20 werkdagen vóór de eerste uitvoeringsactiviteit
  const eersteUitvoering = planning.activiteiten
    .filter((a) => a.categorie === 'uitvoering')
    .sort((a, b) => a.startDatum.localeCompare(b.startDatum))[0];
  if (eersteUitvoering) {
    const start = new Date(eersteUitvoering.startDatum);
    const venster = werkdagenTerug(start, 20);
    const dagenTotVenster = dagenTussen(vandaag, venster);
    const dagenTotStart = dagenTussen(vandaag, start);
    if (dagenTotStart >= -7 && dagenTotVenster <= horizon) {
      signalen.push({
        id: `${project.id}-klic`,
        projectId: project.id,
        projectNaam: project.naam,
        urgentie: dagenTotVenster <= 0 ? 'rood' : urgentieVoorDagen(dagenTotVenster),
        titel: dagenTotVenster <= 0 ? 'KLIC-meldvenster is open' : 'KLIC-meldvenster nadert',
        detail:
          dagenTotVenster <= 0
            ? `Uitvoering start rond ${start.toLocaleDateString('nl-NL')} — dien de WIBON-graafmelding nu in (max. 20 werkdagen vooraf)`
            : `Vanaf ${venster.toLocaleDateString('nl-NL')} kan de WIBON-graafmelding (uitvoeringsstart ${start.toLocaleDateString('nl-NL')})`,
        datum: venster.toISOString(),
        dagenResterend: dagenTotVenster,
        href: `/project/${project.id}`,
      });
    }
  }

  // 3. Kritiek-pad-activiteiten die binnen 14 dagen starten
  for (const act of planning.activiteiten) {
    if (!act.kritiekPad || act.status === 'afgerond' || act.categorie === 'vergunning') continue;
    const start = new Date(act.startDatum);
    const dagen = dagenTussen(vandaag, start);
    if (dagen < 0 || dagen > 14) continue;
    signalen.push({
      id: `${project.id}-kp-${act.id}`,
      projectId: project.id,
      projectNaam: project.naam,
      urgentie: urgentieVoorDagen(dagen),
      titel: `Kritiek pad: ${act.titel}`,
      detail: `Start ${start.toLocaleDateString('nl-NL')} (${act.duurDagen} dagen) — vertraging schuift de einddatum direct op`,
      datum: act.startDatum,
      dagenResterend: dagen,
      href: `/project/${project.id}/planning`,
    });
  }

  return signalen.sort((a, b) => a.dagenResterend - b.dagenResterend).slice(0, 8);
}

/** Portfolio-breed: signalen over alle actieve projecten (voor het dashboard). */
export function bepaalPortfolioSignalen(maxPerProject = 3): TermijnSignaal[] {
  const projecten = getDemoProjecten().filter((p) => p.status === 'actief');
  return projecten
    .flatMap((p) => bepaalTermijnSignalen(p).slice(0, maxPerProject))
    .sort((a, b) => a.dagenResterend - b.dagenResterend)
    .slice(0, 8);
}
