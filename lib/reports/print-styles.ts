/** Gedeelde print-/PDF-stijlen voor professionele documentexport */

export const PRINT_DOCUMENT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    line-height: 1.65;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
    background: #fff;
    overflow: visible;
  }
  body {
    width: 794px;
    max-width: 794px;
  }

  .pdf-page-content {
    width: 100%;
  }

  .pdf-page-content > *:first-child {
    margin-top: 0;
  }

  .pdf-page-content > *:last-child {
    margin-bottom: 0;
  }

  .doc-cover {
    background: linear-gradient(135deg, #0D1428 0%, #1a2d5a 55%, #2D6FE8 100%);
    color: #fff;
    padding: 2.75rem 2.25rem;
    margin: 0 0 2.5rem;
    border-radius: 8px;
    page-break-after: avoid;
    overflow: visible;
  }
  .doc-cover-brand {
    font-size: 8pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.75;
    margin-bottom: 1.25rem;
  }
  .doc-cover h1 {
    font-size: 21pt;
    font-weight: 700;
    margin: 0 0 0.65rem;
    color: #fff;
    border: none;
    padding: 0.1rem 0 0;
    line-height: 1.35;
    overflow: visible;
  }
  .doc-cover-sub {
    font-size: 11pt;
    opacity: 0.9;
    margin: 0 0 1.5rem;
    line-height: 1.45;
  }
  .doc-cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    font-size: 8.5pt;
    opacity: 0.85;
  }
  .doc-cover-meta span { white-space: nowrap; }

  .doc-body { padding: 0 0.25rem; }

  h1 {
    font-size: 17pt;
    font-weight: 700;
    color: #0D1428;
    border-bottom: 2px solid #2D6FE8;
    padding-bottom: 0.65rem;
    margin: 0 0 1.25rem;
    line-height: 1.3;
    page-break-after: avoid;
  }
  h2 {
    font-size: 12.5pt;
    font-weight: 700;
    color: #0D1428;
    margin: 1.5rem 0 0.85rem;
    padding: 0.55rem 0.85rem 0.55rem 1rem;
    border-left: 4px solid #2D6FE8;
    background: #f8fafc;
    line-height: 1.35;
    page-break-after: avoid;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 600;
    color: #334155;
    margin: 1.35rem 0 0.6rem;
    line-height: 1.35;
    page-break-after: avoid;
  }
  h4 {
    font-size: 9.5pt;
    font-weight: 600;
    color: #475569;
    margin: 1.1rem 0 0.45rem;
    line-height: 1.35;
  }

  p { margin: 0.55rem 0 0.85rem; color: #475569; line-height: 1.65; }

  strong { font-weight: 600; color: #0f172a; }

  blockquote {
    border-left: 4px solid #2D6FE8;
    background: linear-gradient(90deg, #eff6ff 0%, #f8fafc 100%);
    padding: 1rem 1.25rem 1rem 1.35rem;
    margin: 1.25rem 0;
    border-radius: 0 6px 6px 0;
    color: #334155;
    font-size: 10pt;
    line-height: 1.6;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1.75rem 0;
  }

  ul, ol { margin: 0.65rem 0 1.1rem; padding-left: 1.6rem; }
  li {
    margin: 0.35rem 0;
    color: #475569;
    line-height: 1.6;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.25rem 0 1.5rem;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  th {
    background: #0D1428;
    color: #fff;
    font-weight: 600;
    padding: 0.7rem 1rem;
    text-align: left;
    border: 1px solid #0D1428;
    line-height: 1.4;
  }
  td {
    padding: 0.65rem 1rem;
    border: 1px solid #e2e8f0;
    color: #475569;
    line-height: 1.5;
  }
  tr:nth-child(even) td { background: #f8fafc; }

  .callout {
    border-radius: 6px;
    padding: 1rem 1.15rem;
    margin: 1.25rem 0;
    font-size: 9.5pt;
    line-height: 1.6;
    page-break-inside: avoid;
  }
  .callout-title {
    font-weight: 700;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.45rem;
  }
  .callout-note { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
  .callout-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
  .callout-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .callout-kpi { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
  .kpi-cell {
    padding: 0.85rem 1rem;
    border-right: 1px solid #e2e8f0;
    text-align: center;
  }
  .kpi-cell:last-child { border-right: none; }
  .kpi-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 14pt; font-weight: 700; color: #0D1428; margin: 0.2rem 0; }
  .kpi-note { font-size: 7.5pt; color: #64748b; }

  .doc-footer {
    margin-top: 2.75rem;
    padding-top: 1.15rem;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
    line-height: 1.5;
  }
`;

export function buildPrintCoverHtml(meta: {
  titel: string;
  subtitel?: string;
  status?: string;
  periode?: string;
  gegenereerd?: string;
}): string {
  const metaItems = [
    meta.periode && `Periode: ${meta.periode}`,
    meta.status && `Status: ${meta.status}`,
    meta.gegenereerd && `Gegenereerd: ${meta.gegenereerd}`,
  ].filter(Boolean);

  return `<div class="doc-cover">
    <div class="doc-cover-brand">Infra Engine · Rapportage</div>
    <h1>${meta.titel}</h1>
    ${meta.subtitel ? `<p class="doc-cover-sub">${meta.subtitel}</p>` : ''}
    ${metaItems.length ? `<div class="doc-cover-meta">${metaItems.map((m) => `<span>${m}</span>`).join('')}</div>` : ''}
  </div>`;
}
