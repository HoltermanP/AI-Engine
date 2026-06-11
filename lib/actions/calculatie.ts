'use server';

import { getProject, getTrace, getTraces } from '@/lib/db/store';
import { getDemoProjectById } from '@/demo/projects';
import { getDemoBestek, setDemoBestek } from '@/lib/db/demo-store';
import {
  runCalculatie,
  runProjectCalculatie,
  generateCalculatieExcel,
  generateProjectCalculatieExcel,
} from '@/lib/calculatie';
import { verrijkCalculatieMetPrijzen, type PrijsBron } from '@/lib/calculatie/bestek-ai';
import type { CalculatieResult, ProjectCalculatieResult } from '@/lib/calculatie/types';
import { saveCalculatieToDossier } from '@/lib/dossier/store';

/** Bestek uploaden: wordt vanaf dat moment voor álle calculaties van het project gebruikt. */
export async function uploadBestekAction(
  projectId: string,
  naam: string,
  inhoud: string
): Promise<{ ok: boolean; melding: string }> {
  if (!inhoud.trim()) return { ok: false, melding: 'Bestand is leeg' };
  setDemoBestek(projectId, naam, inhoud);
  return {
    ok: true,
    melding: `Bestek "${naam}" geladen (${Math.round(inhoud.length / 1024)} kB) — wordt gebruikt voor alle calculaties`,
  };
}

export async function getBestekStatusAction(
  projectId: string
): Promise<{ naam: string; geuploadOp: string } | null> {
  const bestek = getDemoBestek(projectId);
  return bestek ? { naam: bestek.naam, geuploadOp: bestek.geuploadOp } : null;
}

export async function generateCalculatieAction(traceId: string): Promise<{
  calculatie: CalculatieResult;
  excelBase64: string;
  filename: string;
  prijsBron: PrijsBron;
}> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const project = (await getProject(trace.projectId)) ?? getDemoProjectById(trace.projectId);
  if (!project) throw new Error('Project niet gevonden');

  const basis = runCalculatie(trace, project);
  // Bestek is leidend; zonder bestek prijst AI op basis van beschikbare informatie
  const { calculatie, prijsBron } = await verrijkCalculatieMetPrijzen(
    basis,
    getDemoBestek(project.id)
  );
  const buffer = await generateCalculatieExcel(calculatie);
  saveCalculatieToDossier(project.id, traceId, calculatie, buffer.toString('base64'));

  return {
    calculatie,
    excelBase64: buffer.toString('base64'),
    filename: `Calculatie_${trace.code}_${project.projectnummer}.xlsx`,
    prijsBron,
  };
}

export async function generateProjectCalculatieAction(projectId: string): Promise<{
  calculatie: ProjectCalculatieResult;
  excelBase64: string;
  filename: string;
}> {
  const project = (await getProject(projectId)) ?? getDemoProjectById(projectId);
  if (!project) throw new Error('Project niet gevonden');
  const traces = (await getTraces(projectId)).filter((t) => t.projectId === projectId);
  if (!traces.length) throw new Error('Geen tracés in project');

  const calculatie = runProjectCalculatie(traces, project);
  const buffer = await generateProjectCalculatieExcel(calculatie);

  for (const tc of calculatie.traceCalculaties) {
    saveCalculatieToDossier(projectId, tc.traceId, tc);
  }

  return {
    calculatie,
    excelBase64: buffer.toString('base64'),
    filename: `Calculatie_${project.projectnummer}_project.xlsx`,
  };
}
