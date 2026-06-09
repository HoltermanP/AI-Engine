import type { DemoProject } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import type { ProjectAction } from '@/demo/project-actions';
import type { TraceFase } from '@/lib/db/types';
import {
  deriveProjectActiviteitTemplates,
  deriveTraceActiviteitTemplates,
  afgerondeStappenVoorFase,
} from './derive';
import { addDays, diffDays, maxDatum, minDatum, weekToStartDate } from './dates';
import { markeerKritiekPad } from './kritiek-pad';
import type { PlanningActiviteit, PlanningActiviteitTemplate, ProjectPlanning } from './types';

function statusVoorFase(
  fase: TraceFase,
  templateId: string,
  trace: DemoTrace,
): { status: PlanningActiviteit['status']; voortgangPct: number } {
  const suffix = templateId.replace(`${trace.code}-`, '');
  const stepMap: Record<string, string> = {
    ontwerp: 'ontwerp',
    data: 'data_verzamelen',
    toets: 'toets_trace',
    berekenen: 'berekenen',
    tekenen: 'tekenen',
    'onderzoek-check': 'onderzoek_check',
    vergunning: 'vergunning_checklist',
    aanvragen: 'aanvragen',
    dossier: 'dossier',
  };
  const stepId = stepMap[suffix] ?? suffix;
  const afgerond = afgerondeStappenVoorFase(fase);

  if (suffix.startsWith('onderzoek-') || suffix.startsWith('uitvoer') || suffix === 'herstel' || suffix === 'uitvoorbereid' || suffix === 'boorengineering' || suffix === 'calculatie') {
    if (fase === 'as_built') return { status: 'afgerond', voortgangPct: 100 };
    if (fase === 'UO') return { status: suffix.includes('uitvoer') || suffix === 'herstel' ? 'bezig' : 'afgerond', voortgangPct: suffix.includes('uitvoer') ? 40 : 100 };
    if (fase === 'DO') return { status: 'gepland', voortgangPct: 0 };
    return { status: 'gepland', voortgangPct: 0 };
  }

  if (afgerond.has(stepId)) return { status: 'afgerond', voortgangPct: 100 };
  if (fase === 'VO' && stepId === 'ontwerp') return { status: 'bezig', voortgangPct: 60 };
  if (fase === 'DO' && (stepId === 'berekenen' || stepId === 'tekenen')) return { status: 'bezig', voortgangPct: 30 };
  if (fase === 'UO' && stepId === 'dossier') return { status: 'bezig', voortgangPct: 50 };
  return { status: 'gepland', voortgangPct: 0 };
}

function scheduleTemplates(
  templates: PlanningActiviteitTemplate[],
  projectStart: string,
  trace?: DemoTrace,
  actions?: ProjectAction[],
): PlanningActiviteit[] {
  const scheduled = new Map<string, PlanningActiviteit>();
  const remaining = [...templates];
  let guard = 0;

  while (remaining.length > 0 && guard++ < 500) {
    let progress = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const t = remaining[i]!;
      const voorgangersOk = t.voorgangerIds.every((vid) => scheduled.has(vid));
      if (!voorgangersOk && t.voorgangerIds.length > 0) continue;

      let start = projectStart;
      if (t.voorgangerIds.length) {
        start = addDays(maxDatum(...t.voorgangerIds.map((vid) => scheduled.get(vid)!.eindDatum)), 1);
      }

      const actionMatch = actions?.find(
        (a) =>
          trace &&
          a.traceId === trace.id &&
          (a.titel.toLowerCase().includes(t.titel.split(' ')[0]?.toLowerCase() ?? '') ||
            t.titel.toLowerCase().includes(a.titel.slice(0, 12).toLowerCase())),
      );
      if (actionMatch?.startDatum) start = actionMatch.startDatum;
      if (actionMatch?.planningWeek) {
        const ws = weekToStartDate(actionMatch.planningWeek);
        if (ws) start = ws;
      }

      let eind = addDays(start, t.duurDagen - 1);
      if (actionMatch?.deadline) eind = actionMatch.deadline;

      const duur = diffDays(start, eind);
      let status: PlanningActiviteit['status'] = 'gepland';
      let voortgangPct = 0;

      if (trace) {
        const st = statusVoorFase(trace.fase, t.id, trace);
        status = st.status;
        voortgangPct = st.voortgangPct;
      } else if (t.id === 'project-kickoff') {
        status = 'afgerond';
        voortgangPct = 100;
      }

      if (actionMatch?.status === 'afgerond') {
        status = 'afgerond';
        voortgangPct = 100;
      } else if (actionMatch?.status === 'bezig') {
        status = 'bezig';
        voortgangPct = Math.max(voortgangPct, 50);
      } else if (actionMatch?.status === 'blokkerend') {
        status = 'blokkerend';
      }

      scheduled.set(t.id, {
        id: t.id,
        titel: t.titel,
        beschrijving: t.beschrijving,
        categorie: t.categorie,
        traceId: trace?.id,
        traceCode: trace?.code,
        startDatum: start,
        eindDatum: eind,
        duurDagen: duur,
        voorgangers: t.voorgangerIds,
        deliverables: t.deliverables,
        status,
        voortgangPct,
        toegewezenAan: actionMatch?.toegewezenAan,
        milestone: t.milestone,
      });

      remaining.splice(i, 1);
      progress = true;
    }
    if (!progress) break;
  }

  return [...scheduled.values()];
}

export function generateProjectPlanning(
  project: DemoProject,
  traces: DemoTrace[],
  actions: ProjectAction[] = [],
): ProjectPlanning {
  const projectStart =
    minDatum(
      '2026-06-01',
      ...actions.filter((a) => a.projectId === project.id && a.startDatum).map((a) => a.startDatum!),
    ) || '2026-06-01';

  const projectTemplates = deriveProjectActiviteitTemplates();
  const activiteiten: PlanningActiviteit[] = [];

  const kickoff = scheduleTemplates([projectTemplates[0]!], projectStart);
  activiteiten.push(...kickoff);

  for (const trace of traces) {
    const traceTemplates = deriveTraceActiviteitTemplates(trace);
    const traceActions = actions.filter((a) => a.traceId === trace.id);
    const traceStart = addDays(projectStart, 1);
    activiteiten.push(...scheduleTemplates(traceTemplates, traceStart, trace, traceActions));
  }

  const traceDossiers = activiteiten.filter((a) => a.id.endsWith('-dossier'));
  const projectEndVoorgangers = traceDossiers.map((a) => a.id);
  const opleveringTemplate = { ...projectTemplates[1]!, voorgangerIds: projectEndVoorgangers };
  const latestEnd = traceDossiers.length
    ? maxDatum(...traceDossiers.map((a) => a.eindDatum))
    : maxDatum(...activiteiten.map((a) => a.eindDatum));
  activiteiten.push(
    ...scheduleTemplates([opleveringTemplate], addDays(latestEnd, 1)),
  );

  activiteiten.sort((a, b) => a.startDatum.localeCompare(b.startDatum) || a.titel.localeCompare(b.titel));

  const gemarkeerd = markeerKritiekPad(activiteiten);
  activiteiten.length = 0;
  activiteiten.push(...gemarkeerd);

  const startDatum = minDatum(...activiteiten.map((a) => a.startDatum));
  const eindDatum = maxDatum(...activiteiten.map((a) => a.eindDatum));
  const milestones = activiteiten.filter((a) => a.milestone);

  return {
    projectId: project.id,
    projectNaam: project.naam,
    projectnummer: project.projectnummer,
    startDatum,
    eindDatum,
    duurDagen: diffDays(startDatum, eindDatum),
    gegenereerdOp: new Date().toISOString(),
    activiteiten,
    milestones,
    samenvatting: bouwSamenvatting(project, traces, activiteiten, startDatum, eindDatum),
  };
}

function bouwSamenvatting(
  project: DemoProject,
  traces: DemoTrace[],
  activiteiten: PlanningActiviteit[],
  start: string,
  eind: string,
): string {
  const onderzoek = activiteiten.filter((a) => a.categorie === 'onderzoek').length;
  const uitvoering = activiteiten.filter((a) => a.categorie === 'uitvoering').length;
  const bezig = activiteiten.filter((a) => a.status === 'bezig').length;
  const blok = activiteiten.filter((a) => a.status === 'blokkerend').length;
  return (
    `Projectplanning ${project.projectnummer}: ${activiteiten.length} activiteiten over ${traces.length} tracés, ` +
    `periode ${start} t/m ${eind}. ${onderzoek} onderzoeksactiviteiten, ${uitvoering} uitvoeringsactiviteiten. ` +
    `${bezig} activiteit(en) in uitvoering${blok ? `, ${blok} blokkerend` : ''}.`
  );
}
