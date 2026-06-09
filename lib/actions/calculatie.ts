'use server';

import { getProject, getTrace, getTraces } from '@/lib/db/store';
import { getDemoProjectById } from '@/demo/projects';
import {
  runCalculatie,
  runProjectCalculatie,
  generateCalculatieExcel,
  generateProjectCalculatieExcel,
} from '@/lib/calculatie';
import type { CalculatieResult, ProjectCalculatieResult } from '@/lib/calculatie/types';
import { saveCalculatieToDossier } from '@/lib/dossier/store';

export async function generateCalculatieAction(traceId: string): Promise<{
  calculatie: CalculatieResult;
  excelBase64: string;
  filename: string;
}> {
  const trace = await getTrace(traceId);
  if (!trace) throw new Error('Tracé niet gevonden');
  const project = (await getProject(trace.projectId)) ?? getDemoProjectById(trace.projectId);
  if (!project) throw new Error('Project niet gevonden');

  const calculatie = runCalculatie(trace, project);
  const buffer = await generateCalculatieExcel(calculatie);
  saveCalculatieToDossier(project.id, traceId, calculatie, buffer.toString('base64'));

  return {
    calculatie,
    excelBase64: buffer.toString('base64'),
    filename: `Calculatie_${trace.code}_${project.projectnummer}.xlsx`,
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
