'use server';

import { addDemoProject, getDemoProjecten } from '@/lib/db/demo-store';

export interface NieuwProjectInvoer {
  naam: string;
  gebied: string;
  opdrachtgever: string;
  omschrijving?: string;
}

/** Nieuw project aanmaken vanuit de wizard; projectnummer wordt toegekend. */
export async function maakProjectAction(
  invoer: NieuwProjectInvoer,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const naam = invoer.naam.trim();
  if (naam.length < 3) {
    return { ok: false, error: 'Geef een projectnaam van minimaal 3 tekens.' };
  }
  const jaar = new Date().getFullYear();
  const volgnr = getDemoProjecten().length + 1;
  const slug = naam
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const id = `project-${slug || 'nieuw'}-${Date.now().toString(36)}`;

  addDemoProject({
    id,
    organisatieId: 'demo-org-001',
    naam,
    omschrijving:
      invoer.omschrijving?.trim() ||
      `Nieuw engineeringsproject in ${invoer.gebied || 'nader te bepalen gebied'}.`,
    status: 'actief',
    gebied: invoer.gebied.trim() || 'Nader te bepalen',
    opdrachtgever: invoer.opdrachtgever.trim() || 'Nader te bepalen',
    projectnummer: `PRJ-${jaar}-${String(volgnr).padStart(4, '0')}`,
  });

  return { ok: true, projectId: id };
}
