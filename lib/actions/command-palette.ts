'use server';

import { getDemoProjecten, getDemoTraces } from '@/lib/db/demo-store';
import { DISCIPLINE_LABELS, type Discipline } from '@/lib/db/types';

export interface PaletteItem {
  id: string;
  groep: 'Projecten' | 'Tracés' | "Pagina's";
  titel: string;
  ondertitel?: string;
  href: string;
}

/** Doorzoekbare items voor de command palette (Cmd+K). */
export async function getPaletteItemsAction(): Promise<PaletteItem[]> {
  const projecten = getDemoProjecten();
  const traces = getDemoTraces();
  const items: PaletteItem[] = [];

  for (const p of projecten) {
    items.push({
      id: `project-${p.id}`,
      groep: 'Projecten',
      titel: p.naam,
      ondertitel: `${p.projectnummer} · ${p.gebied}`,
      href: `/project/${p.id}`,
    });
  }

  for (const t of traces) {
    items.push({
      id: `trace-${t.id}`,
      groep: 'Tracés',
      titel: `${t.code} — ${t.naam}`,
      ondertitel: DISCIPLINE_LABELS[t.discipline as Discipline] ?? t.discipline,
      href: `/project/${t.projectId}/trace/${t.id}`,
    });
  }

  const eersteProject = projecten[0]?.id;
  const paginas: [string, string][] = [
    ['Dashboard', '/dashboard'],
    ['Open acties', '/acties'],
    ['Rapportage', '/rapportage'],
    ['Beheer / KPI’s', '/beheer'],
    ['Configuratie', '/config'],
    ...(eersteProject
      ? ([
          ['Netontwerp (LS/MS)', `/project/${eersteProject}/netontwerp`],
          ['Planning', `/project/${eersteProject}/planning`],
          ['Dossier', `/project/${eersteProject}/dossier`],
          ['Startbesluit', `/project/${eersteProject}/startbesluit`],
        ] as [string, string][])
      : []),
  ];
  for (const [titel, href] of paginas) {
    items.push({ id: `pagina-${href}`, groep: "Pagina's", titel, href });
  }

  return items;
}
