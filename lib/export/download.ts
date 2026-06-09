import type { DossierItem } from '@/lib/dossier/store';
import { dossierItemToMarkdown } from '@/lib/dossier/document-content';
import { markdownToPrintHtml } from '@/lib/reports/markdown';
import {
  paginatePrintDocument,
  PDF_PAGE_HEIGHT_PX,
  PDF_PAGE_WIDTH_PX,
} from '@/lib/export/pdf-pagination';

/** docx lazy laden — statisch bundelen geeft een SyntaxError in de Turbopack client-chunk. */
async function loadDownloadMarkdownAsWord() {
  const { downloadMarkdownAsWord } = await import('@/lib/export/docx');
  return downloadMarkdownAsWord;
}

export function downloadBase64(
  base64: string,
  filename: string,
  mime = 'application/octet-stream',
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderHtmlToPdf(html: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PDF_PAGE_WIDTH_PX}px`,
    height: `${PDF_PAGE_HEIGHT_PX}px`,
    border: 'none',
    visibility: 'hidden',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('PDF-render iframe niet beschikbaar');
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise<void>((resolve) => {
    if (doc.readyState === 'complete') {
      resolve();
      return;
    }
    iframe.addEventListener('load', () => resolve(), { once: true });
  });

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  try {
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const pages = paginatePrintDocument(doc.body, doc);
    if (pages.length === 0) {
      throw new Error('Geen PDF-paginas gegenereerd');
    }

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pageWidthMm = pdf.internal.pageSize.getWidth();
    const pageHeightMm = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index]!;
      iframe.style.height = `${PDF_PAGE_HEIGHT_PX}px`;
      doc.body.innerHTML = '';
      doc.body.appendChild(page);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas.default(page, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: PDF_PAGE_WIDTH_PX,
        height: PDF_PAGE_HEIGHT_PX,
        windowWidth: PDF_PAGE_WIDTH_PX,
        windowHeight: PDF_PAGE_HEIGHT_PX,
        scrollX: 0,
        scrollY: 0,
      });

      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidthMm, pageHeightMm);
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function downloadMarkdownAsPdf(
  markdown: string,
  filename: string,
  title: string,
  meta?: { subtitel?: string; periode?: string; gegenereerd?: string; status?: string }
): Promise<void> {
  const html = markdownToPrintHtml(markdown, title, meta);
  await renderHtmlToPdf(html, filename);
}

export async function downloadSvgAsPdf(svg: string, title: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #fff; }
  .pdf-page-content { padding: 24px; }
  h1 { font-size: 14px; margin: 0 0 16px; color: #1a2332; font-weight: 600; }
  svg { width: 100%; height: auto; }
</style></head>
<body><div class="doc-body"><h1>${title}</h1>${svg}</div></body></html>`;
  await renderHtmlToPdf(html, `${title.replace(/\s+/g, '_')}.pdf`);
}

export async function downloadDossierItemPdf(item: DossierItem): Promise<void> {
  if (item.formaat === 'svg') {
    await downloadSvgAsPdf(item.inhoud, item.naam);
    return;
  }
  const markdown = dossierItemToMarkdown(item);
  await downloadMarkdownAsPdf(
    markdown,
    `${item.naam.replace(/\s+/g, '_')}.pdf`,
    item.naam
  );
}

export async function downloadDossierItemWord(item: DossierItem): Promise<void> {
  const markdown = dossierItemToMarkdown(item);
  const downloadMarkdownAsWord = await loadDownloadMarkdownAsWord();
  await downloadMarkdownAsWord(
    markdown,
    `${item.naam.replace(/\s+/g, '_')}.docx`,
    item.naam
  );
}

export async function downloadAllDossierItemsPdf(
  items: DossierItem[],
  projectNaam: string
): Promise<void> {
  const sections = items.map((item) => {
    const header = `\n\n---\n## ${item.naam} (${item.type})\n`;
    if (item.formaat === 'svg') {
      return `${header}\n*[SVG-tekening: ${item.naam}]*\n`;
    }
    return `${header}\n${dossierItemToMarkdown(item)}\n`;
  });

  const bundle = `# Dossierbundel — ${projectNaam}

**Gegenereerd:** ${new Date().toLocaleString('nl-NL')}  
**Documenten:** ${items.length}

${sections.join('')}`;

  await downloadMarkdownAsPdf(
    bundle,
    `${projectNaam.replace(/\s+/g, '_')}_dossier_bundel.pdf`,
    `Dossierbundel — ${projectNaam}`
  );
}

export async function downloadAllDossierItemsWord(
  items: DossierItem[],
  projectNaam: string
): Promise<void> {
  const sections = items.map((item) => {
    const header = `\n\n---\n## ${item.naam} (${item.type})\n`;
    if (item.formaat === 'svg') {
      return `${header}\n*[SVG-tekening: ${item.naam}]*\n`;
    }
    return `${header}\n${dossierItemToMarkdown(item)}\n`;
  });

  const bundle = `# Dossierbundel — ${projectNaam}

**Gegenereerd:** ${new Date().toLocaleString('nl-NL')}  
**Documenten:** ${items.length}

${sections.join('')}`;

  const downloadMarkdownAsWord = await loadDownloadMarkdownAsWord();
  await downloadMarkdownAsWord(
    bundle,
    `${projectNaam.replace(/\s+/g, '_')}_dossier_bundel.docx`,
    `Dossierbundel — ${projectNaam}`
  );
}
