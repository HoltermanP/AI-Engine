/**
 * Uitvoeringsmap-export: het overdrachtspakket voor de uitvoerende aannemer
 * als ZIP met léésbare formaten:
 * - tekstdocumenten (leeswijzer, uitvoeringsmap, rapporten, onderzoeken,
 *   vergunningen) → PDF
 * - berekeningen → Excel-werkboek (+ projectcalculatie en materiaallijsten)
 * - tekeningen → PDF (gerasterd) én DXF (CAD)
 *
 * GET /api/uitvoeringsmap?projectId=…
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getDemoProject, getDemoTraces, getDemoBestaandNet } from '@/lib/db/demo-store';
import { getDossierItems, type DossierItem } from '@/lib/dossier/store';
import { buildUitvoeringsmap } from '@/lib/dossier/uitvoeringsmap';
import { bepaalStartgereedheid } from '@/lib/services/startgereedheid';
import { markdownNaarPdf, svgNaarPdf } from '@/lib/export/server-pdf';
import { genereerBerekeningenExcel } from '@/lib/export/berekeningen-excel';
import { dxfVariant } from '@/lib/export/dxf-varianten';
import { buildMateriaalLijst, generateMateriaalExcel } from '@/lib/calculatie/materiaal';
import { runProjectCalculatie, generateProjectCalculatieExcel } from '@/lib/calculatie';
import { sleuflozeSegmenten } from '@/lib/bore';

export const maxDuration = 60;

function veiligeNaam(naam: string): string {
  return naam.replace(/[^a-zA-Z0-9à-ÿÀ-Ÿ ._()-]+/g, '-').slice(0, 120);
}

function tekstItemNaarPdf(item: DossierItem): Uint8Array {
  const inhoud =
    item.formaat === 'json'
      ? `# ${item.naam}\n\n\`\`\`\n${item.inhoud.slice(0, 8000)}\n\`\`\``
      : item.inhoud;
  return markdownNaarPdf(inhoud, {
    titel: item.naam,
    voettekst: `InfraEngine · ${new Date(item.createdAt).toLocaleDateString('nl-NL')}`,
  });
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
  const problemen: string[] = [];

  // ── 00 Leeswijzer + startgereedheid (PDF) ───────────────────────────
  const datum = new Date().toLocaleDateString('nl-NL');
  const leeswijzer = `Project: ${project.projectnummer} · Opdrachtgever: ${project.opdrachtgever}
Samengesteld door InfraEngine op ${datum}.

## Startgereedheid: ${gereedheid.verdict === 'GO' ? 'GO' : 'NO-GO'} (${gereedheid.pct}%)

${gereedheid.samenvatting}

${gereedheid.criteria.map((c) => `- [${c.status === 'gereed' ? 'x' : ' '}] ${c.titel} — ${c.detail}`).join('\n')}

## Inhoud van dit pakket

- 01-uitvoeringsmap — werkmap per tracé (PDF)
- 02-tekeningen — alle tekeningen als PDF (gerasterd) en DXF (CAD)
- 03-berekeningen — normberekeningen in één Excel-werkboek
- 04-onderzoeken — onderzoeksrapporten (PDF)
- 05-vergunningen — aanvragen en checklists (PDF)
- 06-calculatie — projectcalculatie en materiaallijsten (Excel)
- 07-rapporten — overige rapporten en analyses (PDF)
`;
  zip.file(
    '00-leeswijzer.pdf',
    markdownNaarPdf(leeswijzer, { titel: `Uitvoeringsmap — ${project.naam}`, voettekst: `InfraEngine · ${datum}` }),
  );

  // ── 01 Uitvoeringsmap per tracé (PDF) ───────────────────────────────
  for (const trace of traces) {
    const map = buildUitvoeringsmap(trace, bestaandNet);
    zip.file(
      `01-uitvoeringsmap/${veiligeNaam(trace.code)}-uitvoeringsmap.pdf`,
      markdownNaarPdf(map.inhoud, { titel: `Uitvoeringsmap ${trace.code}`, voettekst: `InfraEngine · ${datum}` }),
    );
  }

  // ── 02 Tekeningen: PDF (uit dossier-SVG's) + DXF per tracé ──────────
  const tekeningen = items.filter((i) => i.type === 'tekening');
  tekeningen.forEach((item, idx) => {
    const basis = `02-tekeningen/${String(idx + 1).padStart(3, '0')}-${veiligeNaam(item.naam)}`;
    try {
      zip.file(`${basis}.pdf`, svgNaarPdf(item.inhoud, item.naam));
    } catch {
      problemen.push(`Tekening "${item.naam}" kon niet naar PDF worden gerasterd — als SVG bijgevoegd.`);
      zip.file(`${basis}.svg`, item.inhoud);
    }
  });
  for (const trace of traces) {
    const varianten = ['situatie', 'werktekening', ...(sleuflozeSegmenten(trace).length ? ['boorplan', 'boorprofiel'] : [])];
    for (const variant of varianten) {
      try {
        const res = dxfVariant(trace, variant);
        if (res) zip.file(`02-tekeningen/dxf/${veiligeNaam(trace.code)}${res.suffix || '-situatie'}.dxf`, res.dxf);
      } catch {
        problemen.push(`DXF-variant ${variant} voor ${trace.code} kon niet worden gegenereerd.`);
      }
    }
  }

  // ── 03 Berekeningen (Excel) ─────────────────────────────────────────
  const berekeningen = items.filter((i) => i.type === 'berekening');
  if (berekeningen.length > 0) {
    zip.file('03-berekeningen/berekeningen.xlsx', await genereerBerekeningenExcel(berekeningen));
  }

  // ── 04/05/07 Tekstdocumenten (PDF) ─────────────────────────────────
  const tekstMappen: [string, (i: DossierItem) => boolean][] = [
    ['04-onderzoeken', (i) => i.type === 'onderzoek'],
    ['05-vergunningen', (i) => i.type === 'aanvraag'],
    ['07-rapporten', (i) => i.type === 'rapport' || i.type === 'ai'],
  ];
  for (const [map, filter] of tekstMappen) {
    items.filter(filter).forEach((item, idx) => {
      try {
        zip.file(`${map}/${String(idx + 1).padStart(3, '0')}-${veiligeNaam(item.naam)}.pdf`, tekstItemNaarPdf(item));
      } catch {
        problemen.push(`Document "${item.naam}" kon niet naar PDF — als tekst bijgevoegd.`);
        zip.file(`${map}/${String(idx + 1).padStart(3, '0')}-${veiligeNaam(item.naam)}.md`, item.inhoud);
      }
    });
  }

  // ── 06 Calculatie + materiaallijsten (Excel) ───────────────────────
  try {
    const calculatie = runProjectCalculatie(traces, project);
    const calcBuffer = await generateProjectCalculatieExcel(calculatie);
    zip.file(`06-calculatie/${veiligeNaam(project.projectnummer)}-projectcalculatie.xlsx`, Buffer.from(calcBuffer));
  } catch {
    problemen.push('Projectcalculatie kon niet worden gegenereerd.');
  }
  try {
    const lijsten = traces.map((t) => buildMateriaalLijst(t));
    if (lijsten.length > 0) {
      const matBuffer = await generateMateriaalExcel(lijsten);
      zip.file('06-calculatie/materiaallijsten.xlsx', Buffer.from(matBuffer));
    }
  } catch {
    problemen.push('Materiaallijsten konden niet worden gegenereerd.');
  }

  if (problemen.length > 0) {
    zip.file('99-opmerkingen.txt', problemen.join('\n'));
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${veiligeNaam(project.projectnummer)}-uitvoeringsmap.zip"`,
    },
  });
}
