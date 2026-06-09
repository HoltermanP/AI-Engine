'use server';

import { getProject, getTraces } from '@/lib/db/store';
import { getDemoProjectById } from '@/demo/projects';
import { getProjectActions } from '@/lib/services/project-stats';
import { generateProjectPlanning } from '@/lib/planning';
import type { ProjectPlanning } from '@/lib/planning/types';

export async function generateProjectPlanningAction(projectId: string): Promise<ProjectPlanning> {
  const project = (await getProject(projectId)) ?? getDemoProjectById(projectId);
  if (!project) throw new Error('Project niet gevonden');
  const traces = await getTraces(projectId);
  const actions = getProjectActions(projectId);
  return generateProjectPlanning(project, traces, actions);
}
