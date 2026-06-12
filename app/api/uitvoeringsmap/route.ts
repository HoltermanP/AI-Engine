/**
 * Uitvoeringsmap-export: alle dossierstukken van een project als ZIP —
 * het overdrachtspakket voor de uitvoerende aannemer.
 *
 * GET /api/uitvoeringsmap?projectId=…
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getDemoProject, getDemoTraces, getDemoBestaandNet } from '@/lib/db/demo-store';
import { getDossierItems } from '@/lib/dossier/store';
import { buildUitvoeringsmap } from '@/lib/dossier/uitvoeringsmap';
import { bepaalStartgereedheid } from '@/lib/services/startgereedheid';

const TYPE_MAP: Record<string, string> = {
  tekening: '02-tekeningen',
  berekening: '03-berekeningen',
  onderzoek: '04-onderzoeken',
  aanvraag: '05-vergunningen',
  calculatie: '06-calculatie',
  rapport: '07-rapporten',
  ai: '07-rapporten',
};

function extensie(formaat?: string): string {
  if (formaat === 'svg') return 'svg';
  if (formaat === 'json') return 'json';
  return 'md';
}

function veiligeNaam(naam: string): string {
  return naam.replace(/[^a-zA-Z0-9à-ÿÀ-Ÿ ._()-]+/g, '-').slice(0, 120);
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'Parameter "projectId" is verplicht.' }, { status: 400 });
  }
  const project = getDemoProject(projectId);
  if (!project) {
    return NextResponse.json({ error: `Project "${projectId}" niet gevonden.` }, { status: 404 });
  }

  const items = getDossierItems(projectId);
  const traces = getDemoTraces(projectId);
  const bestaandNet = getDemoBestaandNet();
  const gereedheid = bepaalStartgereedheid(projectId);
  const zip = new JSZip();

  // 00 — leeswijzer + startgereedheid
  const datum = new Date().toLocaleDateString('nl-NL');
  zip.file(
    '00-leeswijzer.md',
    `# Uitvoeringsmap — ${project.naam}

Project: ${project.projectnummer} · Opdrachtgever: ${project.opdrachtgever}
Samengesteld door InfraEngine op ${datum}.

## Startgereedheid: ${gereedheid.verdict === 'GO' ? 'GO' : 'NO-GO'} (${gereedheid.pct}%)
${gereedheid.samenvatting}

${gereedheid.criteria.map((c) => `- [${c.status === 'gereed' ? 'x' : ' '}] ${c.titel} — ${c.detail}`).join('\n')}

## Inhoud
${items.length} dossierstukken, geordend per hoofdstuk (01-uitvoeringsmap t/m 07-rapporten).
`,
  );

  // 01 — uitvoeringsmap-bundels per tracé
  for (const trace of traces) {
    const map = buildUitvoeringsmap(trace, bestaandNet);
    zip.file(`01-uitvoeringsmap/${veiligeNaam(trace.code)}-uitvoeringsmap.md`, map.inhoud);
  }

  // 02-07 — dossierstukken per type
  const tellers = new Map<string, number>();
  for (const item of items) {
    const mapNaam = TYPE_MAP[item.type] ?? '07-rapporten';
    const volgnr = (tellers.get(mapNaam) ?? 0) + 1;
    tellers.set(mapNaam, volgnr);
    const bestand = `${mapNaam}/${String(volgnr).padStart(3, '0')}-${veiligeNaam(item.naam)}.${extensie(item.formaat)}`;
    zip.file(bestand, item.inhoud);
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${veiligeNaam(project.projectnummer)}-uitvoeringsmap.zip"`,
    },
  });
}
