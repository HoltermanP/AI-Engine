'use server';

import { getProject, getTraces } from '@/lib/db/store';

export async function getProjectHeaderAction(projectId: string) {
  const project = await getProject(projectId);
  if (!project) return null;
  const traces = await getTraces(projectId);
  return { project, firstTrace: traces[0] ?? null };
}

export async function getFirstTraceIdAction(projectId: string): Promise<string | null> {
  const traces = await getTraces(projectId);
  return traces[0]?.id ?? null;
}
