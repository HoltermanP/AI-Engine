import type { DemoProject } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import {
  BTW_PERCENTAGE,
  EENHEIDSPRIJZEN,
  prijsVoorPost,
  PROJECTLEIDING_PERCENTAGE,
  RISICO_PERCENTAGE,
} from '@/demo/calculatie-prijzen';
import { traceLengthM } from '@/lib/geo';
import { getDemoNetontwerp } from '@/lib/db/netontwerp-store';
import { deriveCalculatiePosts } from './derive';
import type {
  CalculatieHoofdgroep,
  CalculatieRegel,
  CalculatieResult,
  CalculatieSamenvatting,
  ProjectCalculatieResult,
} from './types';

function berekenSamenvatting(subtotaalRegels: number): CalculatieSamenvatting {
  const projectleiding = Math.round(subtotaalRegels * (PROJECTLEIDING_PERCENTAGE / 100) * 100) / 100;
  const risicoregeling = Math.round(subtotaalRegels * (RISICO_PERCENTAGE / 100) * 100) / 100;
  const totaalExclBtw = Math.round((subtotaalRegels + projectleiding + risicoregeling) * 100) / 100;
  const btw = Math.round(totaalExclBtw * (BTW_PERCENTAGE / 100) * 100) / 100;
  const totaalInclBtw = Math.round((totaalExclBtw + btw) * 100) / 100;
  return { subtotaal: subtotaalRegels, projectleiding, risicoregeling, totaalExclBtw, btw, totaalInclBtw };
}

function buildRegels(trace: DemoTrace): CalculatieRegel[] {
  const afgeleid = deriveCalculatiePosts(trace);
  const regels: CalculatieRegel[] = [];

  for (const a of afgeleid) {
    const prijs = prijsVoorPost(a.postnummer);
    if (!prijs) continue;
    const hoeveelheid = Math.round(a.hoeveelheid * 100) / 100;
    regels.push({
      postnummer: a.postnummer,
      omschrijving: prijs.omschrijving,
      hoofdgroep: prijs.hoofdgroep,
      eenheid: prijs.eenheid,
      hoeveelheid,
      eenheidsprijs: prijs.prijs,
      totaal: Math.round(hoeveelheid * prijs.prijs * 100) / 100,
      toelichting: a.toelichting,
    });
  }

  regels.sort((a, b) => a.postnummer.localeCompare(b.postnummer));
  return regels;
}

function groepeerRegels(regels: CalculatieRegel[]): CalculatieHoofdgroep[] {
  const map = new Map<string, CalculatieHoofdgroep>();
  for (const r of regels) {
    let groep = map.get(r.hoofdgroep);
    if (!groep) {
      const [code, ...naamParts] = r.hoofdgroep.split(' ');
      groep = { code: code ?? '00', naam: naamParts.join(' ') || r.hoofdgroep, regels: [], subtotaal: 0 };
      map.set(r.hoofdgroep, groep);
    }
    groep.regels.push(r);
    groep.subtotaal += r.totaal;
  }
  return [...map.values()]
    .map((g) => ({ ...g, subtotaal: Math.round(g.subtotaal * 100) / 100 }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function groepeerCalculatieRegels(regels: CalculatieRegel[]): CalculatieHoofdgroep[] {
  return groepeerRegels(regels);
}

function voegProjectkostenToe(regels: CalculatieRegel[], subtotaal: number): CalculatieRegel[] {
  const extra: CalculatieRegel[] = [];
  const pl = prijsVoorPost('08.01.010')!;
  const ris = prijsVoorPost('08.02.010')!;
  const plBedrag = Math.round(subtotaal * (PROJECTLEIDING_PERCENTAGE / 100) * 100) / 100;
  const risBedrag = Math.round(subtotaal * (RISICO_PERCENTAGE / 100) * 100) / 100;

  extra.push({
    postnummer: pl.postnummer,
    omschrijving: `${pl.omschrijving} (${PROJECTLEIDING_PERCENTAGE}%)`,
    hoofdgroep: pl.hoofdgroep,
    eenheid: pl.eenheid,
    hoeveelheid: 1,
    eenheidsprijs: plBedrag,
    totaal: plBedrag,
  });
  extra.push({
    postnummer: ris.postnummer,
    omschrijving: `${ris.omschrijving} (${RISICO_PERCENTAGE}%)`,
    hoofdgroep: ris.hoofdgroep,
    eenheid: ris.eenheid,
    hoeveelheid: 1,
    eenheidsprijs: risBedrag,
    totaal: risBedrag,
  });

  return [...regels, ...extra];
}

export function runCalculatie(trace: DemoTrace, project: DemoProject): CalculatieResult {
  const basisRegels = buildRegels(trace);
  const subtotaalRegels = basisRegels.reduce((s, r) => s + r.totaal, 0);
  const alleRegels = voegProjectkostenToe(basisRegels, subtotaalRegels);
  const hoofdgroepen = groepeerRegels(alleRegels);

  return {
    traceId: trace.id,
    traceCode: trace.code,
    traceNaam: trace.naam,
    projectId: project.id,
    projectNaam: project.naam,
    projectnummer: project.projectnummer,
    discipline: trace.discipline.replace(/_/g, ' '),
    lengteM: Math.round(traceLengthM(trace.coordinates, trace.traceLines)),
    gegenereerdOp: new Date().toISOString(),
    hoofdgroepen,
    regels: alleRegels,
    samenvatting: berekenSamenvatting(subtotaalRegels),
  };
}

/** Stationsposten (07.03.x) uit het netontwerp van het project. */
function stationsRegels(projectId: string): CalculatieRegel[] {
  const netontwerp = getDemoNetontwerp(projectId);
  const stations = (netontwerp?.assets ?? []).filter((a) => a.type === 'station');
  if (stations.length === 0) return [];

  const regels: CalculatieRegel[] = [];
  const maakRegel = (postnummer: string, aantal: number) => {
    const prijs = prijsVoorPost(postnummer);
    if (!prijs || aantal === 0) return;
    regels.push({
      postnummer: prijs.postnummer,
      omschrijving: prijs.omschrijving,
      hoofdgroep: prijs.hoofdgroep,
      eenheid: prijs.eenheid,
      hoeveelheid: aantal,
      eenheidsprijs: prijs.prijs,
      totaal: Math.round(aantal * prijs.prijs * 100) / 100,
      toelichting: `Uit netontwerp "${netontwerp!.naam}"`,
    });
  };
  maakRegel('07.03.010', stations.filter((s) => s.subtype !== 'ls_verdeelkast').length);
  maakRegel('07.03.020', stations.filter((s) => s.subtype === 'ls_verdeelkast').length);
  return regels;
}

export function runProjectCalculatie(traces: DemoTrace[], project: DemoProject): ProjectCalculatieResult {
  const traceCalculaties = traces.map((t) => runCalculatie(t, project));

  const geaggregeerd = new Map<string, CalculatieRegel>();
  for (const regel of stationsRegels(project.id)) {
    geaggregeerd.set(regel.postnummer, regel);
  }
  for (const tc of traceCalculaties) {
    for (const r of tc.regels) {
      if (r.postnummer.startsWith('08.')) continue;
      const key = r.postnummer;
      const ex = geaggregeerd.get(key);
      if (ex) {
        ex.hoeveelheid += r.hoeveelheid;
        ex.totaal = Math.round(ex.hoeveelheid * ex.eenheidsprijs * 100) / 100;
        ex.toelichting = [ex.toelichting, `${tc.traceCode}`].filter(Boolean).join(', ');
      } else {
        geaggregeerd.set(key, { ...r, toelichting: tc.traceCode });
      }
    }
  }

  const basisRegels = [...geaggregeerd.values()].sort((a, b) => a.postnummer.localeCompare(b.postnummer));
  const subtotaalRegels = basisRegels.reduce((s, r) => s + r.totaal, 0);
  const alleRegels = voegProjectkostenToe(basisRegels, subtotaalRegels);

  return {
    projectId: project.id,
    projectNaam: project.naam,
    projectnummer: project.projectnummer,
    traceCalculaties,
    regels: alleRegels,
    samenvatting: berekenSamenvatting(subtotaalRegels),
    gegenereerdOp: new Date().toISOString(),
  };
}

export { EENHEIDSPRIJZEN };
