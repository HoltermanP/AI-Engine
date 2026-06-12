/**
 * Server-side PDF-generatie voor de uitvoeringsmap:
 * - markdownNaarPdf: tekstdocumenten (rapporten, plannen, leeswijzer) → A4-PDF
 * - svgNaarPdf: tekeningen (SVG) → gerasterde A3-liggend-PDF via resvg
 */

import { jsPDF } from 'jspdf';
import { Resvg } from '@resvg/resvg-js';

const A4 = { w: 210, h: 297, marge: 18 };

interface MarkdownPdfOpties {
  titel?: string;
  voettekst?: string;
}

/** Eenvoudige maar nette markdown-rendering: koppen, lijsten, tabellen, vet. */
export function markdownNaarPdf(markdown: string, opties: MarkdownPdfOpties = {}): Uint8Array {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const breed = A4.w - 2 * A4.marge;
  let y = A4.marge;
  let pagina = 1;

  const voet = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(opties.voettekst ?? 'InfraEngine', A4.marge, A4.h - 8);
    doc.text(`pagina ${pagina}`, A4.w - A4.marge, A4.h - 8, { align: 'right' });
    doc.setTextColor(30);
  };

  const nieuwePagina = () => {
    voet();
    doc.addPage();
    pagina += 1;
    y = A4.marge;
  };

  const ruimte = (nodig: number) => {
    if (y + nodig > A4.h - 16) nieuwePagina();
  };

  const schrijf = (tekst: string, opts: { size: number; stijl?: 'bold' | 'normal'; mono?: boolean; indent?: number; extra?: number }) => {
    const indent = opts.indent ?? 0;
    doc.setFont(opts.mono ? 'courier' : 'helvetica', opts.stijl ?? 'normal');
    doc.setFontSize(opts.size);
    const schoon = tekst.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1');
    const regels = doc.splitTextToSize(schoon, breed - indent) as string[];
    for (const regel of regels) {
      ruimte(opts.size * 0.5);
      doc.text(regel, A4.marge + indent, y);
      y += opts.size * 0.45;
    }
    y += opts.extra ?? 1;
  };

  if (opties.titel) {
    schrijf(opties.titel, { size: 16, stijl: 'bold', extra: 2 });
    doc.setDrawColor(45, 111, 232);
    doc.setLineWidth(0.8);
    doc.line(A4.marge, y, A4.marge + breed, y);
    y += 6;
  }

  const regels = markdown.split(/\r?\n/);
  let inTabel = false;

  for (const ruwe of regels) {
    const regel = ruwe.trimEnd();

    if (/^\s*\|/.test(regel)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(regel)) continue; // scheidingsregel
      inTabel = true;
      const cellen = regel.split('|').slice(1, -1).map((c) => c.trim());
      schrijf(cellen.join('  ·  '), { size: 7.5, mono: true, indent: 2, extra: 0.5 });
      continue;
    }
    if (inTabel && !/^\s*\|/.test(regel)) {
      inTabel = false;
      y += 2;
    }

    if (!regel.trim()) {
      y += 2;
      continue;
    }
    if (regel.startsWith('### ')) {
      y += 1.5;
      schrijf(regel.slice(4), { size: 10.5, stijl: 'bold', extra: 1.5 });
    } else if (regel.startsWith('## ')) {
      y += 2.5;
      schrijf(regel.slice(3), { size: 12, stijl: 'bold', extra: 2 });
    } else if (regel.startsWith('# ')) {
      y += 3;
      schrijf(regel.slice(2), { size: 14, stijl: 'bold', extra: 2 });
    } else if (/^\s*[-*]\s+\[[ x]\]/i.test(regel)) {
      const af = /\[x\]/i.test(regel);
      schrijf(`${af ? '☑' : '☐'} ${regel.replace(/^\s*[-*]\s+\[[ x]\]\s*/i, '')}`, { size: 9, indent: 3, extra: 0.5 });
    } else if (/^\s*[-*]\s+/.test(regel)) {
      schrijf(`• ${regel.replace(/^\s*[-*]\s+/, '')}`, { size: 9, indent: 3, extra: 0.5 });
    } else if (/^\s*\d+\.\s+/.test(regel)) {
      schrijf(regel.trim(), { size: 9, indent: 3, extra: 0.5 });
    } else if (regel.startsWith('> ')) {
      schrijf(regel.slice(2), { size: 8.5, indent: 4, extra: 0.5 });
    } else {
      schrijf(regel, { size: 9 });
    }
  }

  voet();
  return new Uint8Array(doc.output('arraybuffer'));
}

/** Tekening-SVG → A3-liggend-PDF (gerasterd op 2× voor scherpte). */
export function svgNaarPdf(svg: string, titel: string): Uint8Array {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 2200 },
    background: '#ffffff',
    font: { loadSystemFonts: true },
  });
  const render = resvg.render();
  const png = render.asPng();
  const breedte = render.width;
  const hoogte = render.height;

  // A3 liggend (420×297), tekening passend met marge en titelregel
  const doc = new jsPDF({ unit: 'mm', format: 'a3', orientation: 'landscape' });
  const marge = 12;
  const maxW = 420 - 2 * marge;
  const maxH = 297 - 2 * marge - 8;
  const schaal = Math.min(maxW / breedte, maxH / hoogte);
  const w = breedte * schaal;
  const h = hoogte * schaal;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(titel, marge, marge - 3);
  doc.addImage(Buffer.from(png).toString('base64'), 'PNG', marge + (maxW - w) / 2, marge + 5, w, h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('InfraEngine — gerasterde weergave; zie bijgevoegde DXF voor CAD', marge, 297 - 6);

  return new Uint8Array(doc.output('arraybuffer'));
}
