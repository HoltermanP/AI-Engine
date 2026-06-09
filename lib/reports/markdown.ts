/** Gedeelde markdown-naar-HTML renderer voor rapportweergave */

import { PRINT_DOCUMENT_CSS, buildPrintCoverHtml } from '@/lib/reports/print-styles';

export type ReportTheme = 'light' | 'dark';

type ThemeClasses = {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  blockquote: string;
  th: string;
  td: string;
  li: string;
  oli: string;
  p: string;
  hr: string;
  tableWrap: string;
  strong: string;
  calloutNote: string;
  calloutWarning: string;
  calloutSuccess: string;
  calloutKpi: string;
};

const THEMES: Record<ReportTheme, ThemeClasses> = {
  light: {
    h1: 'text-2xl font-bold text-[#0D1428] mt-0 mb-5 pb-4 border-b-2 border-[#2D6FE8]',
    h2: 'text-base font-bold text-[#0D1428] mt-10 mb-4 pl-3 py-2 border-l-4 border-[#2D6FE8] bg-slate-50 rounded-r-lg',
    h3: 'text-sm font-semibold text-slate-800 mt-6 mb-2',
    h4: 'text-xs font-semibold text-slate-600 mt-4 mb-1.5 uppercase tracking-wide',
    blockquote:
      'border-l-4 border-[#2D6FE8] bg-gradient-to-r from-[#2D6FE8]/8 to-slate-50 pl-5 py-4 my-5 text-slate-700 rounded-r-lg text-sm leading-relaxed shadow-sm',
    th: 'border border-slate-200 bg-[#0D1428] px-4 py-2.5 text-left text-xs font-semibold text-white',
    td: 'border border-slate-200 px-4 py-2.5 text-xs text-slate-600',
    li: 'ml-5 text-slate-600 list-disc leading-relaxed',
    oli: 'ml-5 text-slate-600 list-decimal leading-relaxed',
    p: 'my-3 text-sm text-slate-600 leading-relaxed',
    hr: 'border-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-8',
    tableWrap: 'my-5 overflow-x-auto rounded-lg border border-slate-200 shadow-sm',
    strong: 'text-slate-900 font-semibold',
    calloutNote: 'rounded-lg border border-blue-200 bg-blue-50/80 p-4 my-5',
    calloutWarning: 'rounded-lg border border-amber-200 bg-amber-50/80 p-4 my-5',
    calloutSuccess: 'rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 my-5',
    calloutKpi: 'rounded-xl border border-slate-200 bg-white shadow-sm my-6 overflow-hidden',
  },
  dark: {
    h1: 'text-xl font-semibold text-white mt-6 mb-3 border-b border-white/10 pb-2',
    h2: 'text-base font-semibold text-white/95 mt-5 mb-2',
    h3: 'text-sm font-medium text-white/85 mt-3 mb-1.5',
    h4: 'text-xs font-medium text-white/70 mt-2 mb-1',
    blockquote:
      'border-l-2 border-[#2D6FE8] bg-[#2D6FE8]/10 pl-3 py-2 my-3 text-white/90 rounded-r',
    th: 'border border-white/15 bg-white/10 px-3 py-1.5 text-left text-xs font-medium text-white',
    td: 'border border-white/10 px-3 py-1.5 text-xs text-white/75',
    li: 'ml-5 text-white/75 list-disc',
    oli: 'ml-5 text-white/75 list-decimal',
    p: 'my-2 text-white/75',
    hr: 'border-white/10 my-4',
    tableWrap: 'my-3 overflow-x-auto rounded-md border border-white/10',
    strong: 'text-white font-medium',
    calloutNote: 'rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 my-4',
    calloutWarning: 'rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 my-4',
    calloutSuccess: 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 my-4',
    calloutKpi: 'rounded-lg border border-white/10 bg-white/5 p-0 my-4 overflow-hidden',
  },
};

const CALLOUT_LABELS: Record<string, string> = {
  note: 'Toelichting',
  warning: 'Aandachtspunt',
  success: 'Positief',
  kpi: 'Kerncijfers',
};

function inline(text: string, strongClass: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${strongClass}">$1</strong>`)
    .replace(/✓/g, '<span class="text-emerald-600 font-semibold">✓</span>')
    .replace(/✗/g, '<span class="text-red-600 font-semibold">✗</span>')
    .replace(/↑/g, '<span class="text-emerald-600">↑</span>')
    .replace(/↓/g, '<span class="text-red-600">↓</span>')
    .replace(/→/g, '<span class="text-slate-500">→</span>');
}

function renderTable(tableLines: string[], t: ThemeClasses, zebra = true): string {
  const rows = tableLines.filter((l) => !l.includes('---'));
  if (rows.length === 0) return '';

  const parse = (row: string) =>
    row
      .split('|')
      .filter(Boolean)
      .map((c) => c.trim());

  const [header, ...body] = rows;
  const headerCells = parse(header);

  const thead = `<thead><tr>${headerCells.map((c) => `<th class="${t.th}">${inline(c, t.strong)}</th>`).join('')}</tr></thead>`;
  const tbody = body
    .map(
      (row, idx) =>
        `<tr class="${zebra && idx % 2 === 1 ? 'bg-slate-50/80' : ''}">${parse(row).map((c) => `<td class="${t.td}">${inline(c, t.strong)}</td>`).join('')}</tr>`
    )
    .join('');

  return `<div class="${t.tableWrap}"><table class="w-full border-collapse">${thead}<tbody>${tbody}</tbody></table></div>`;
}

function renderKpiGrid(lines: string[], t: ThemeClasses, forPrint = false): string {
  const cells = lines.map((line) => {
    const [label, value, note] = line.split('|').map((s) => s.trim());
    if (forPrint) {
      return `<div class="kpi-cell"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${note ? `<div class="kpi-note">${note}</div>` : ''}</div>`;
    }
    return `<div class="flex-1 border-r border-slate-100 px-5 py-4 text-center last:border-r-0"><p class="text-[10px] font-medium uppercase tracking-wider text-slate-500">${label}</p><p class="mt-1 font-mono text-2xl font-bold text-[#0D1428]">${value}</p>${note ? `<p class="mt-1 text-[10px] text-slate-500">${note}</p>` : ''}</div>`;
  });

  if (forPrint) {
    return `<div class="callout callout-kpi"><div class="kpi-grid">${cells.join('')}</div></div>`;
  }
  return `<div class="${t.calloutKpi}"><div class="flex divide-x divide-slate-100">${cells.join('')}</div></div>`;
}

function renderCallout(
  type: string,
  title: string | null,
  bodyLines: string[],
  t: ThemeClasses,
  forPrint = false
): string {
  if (type === 'kpi') {
    return renderKpiGrid(bodyLines, t, forPrint);
  }

  const cls = type === 'warning' ? t.calloutWarning : type === 'success' ? t.calloutSuccess : t.calloutNote;
  const printCls = `callout callout-${type}`;
  const label = title ?? CALLOUT_LABELS[type] ?? type;
  const body = bodyLines.map((l) => inline(l, t.strong)).join(forPrint ? '<br/>' : '</p><p class="' + t.p + '">');

  if (forPrint) {
    return `<div class="${printCls}"><div class="callout-title">${label}</div><p>${body}</p></div>`;
  }
  return `<div class="${cls}"><p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">${label}</p><p class="${t.p} mt-0">${body}</p></div>`;
}

function parseCallout(
  lines: string[],
  start: number,
  t: ThemeClasses,
  forPrint = false
): { html: string; next: number } {
  const open = lines[start];
  const match = open.match(/^:::(note|warning|success|kpi)(?:\s+(.+))?$/);
  const type = match?.[1] ?? 'note';
  const title = match?.[2]?.trim() ?? null;
  const bodyLines: string[] = [];
  let i = start + 1;
  while (i < lines.length && lines[i] !== ':::') {
    if (lines[i].trim()) bodyLines.push(lines[i]);
    i++;
  }
  return { html: renderCallout(type, title, bodyLines, t, forPrint), next: i + 1 };
}

function parseMarkdownLines(
  lines: string[],
  t: ThemeClasses,
  forPrint = false
): string {
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith(':::')) {
      const { html, next } = parseCallout(lines, i, t, forPrint);
      parts.push(html);
      i = next;
      continue;
    }
    if (line.startsWith('# ')) {
      parts.push(forPrint ? `<h1>${inline(line.slice(2), '')}</h1>` : `<h1 class="${t.h1}">${inline(line.slice(2), t.strong)}</h1>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      parts.push(forPrint ? `<h2>${inline(line.slice(3), '')}</h2>` : `<h2 class="${t.h2}">${inline(line.slice(3), t.strong)}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      parts.push(forPrint ? `<h3>${inline(line.slice(4), '')}</h3>` : `<h3 class="${t.h3}">${inline(line.slice(4), t.strong)}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      parts.push(forPrint ? `<h4>${inline(line.slice(5), '')}</h4>` : `<h4 class="${t.h4}">${inline(line.slice(5), t.strong)}</h4>`);
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const content = inline(quoteLines.join('<br/>'), t.strong);
      parts.push(
        forPrint
          ? `<blockquote>${content}</blockquote>`
          : `<blockquote class="${t.blockquote}">${content}</blockquote>`
      );
      continue;
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      parts.push(renderTable(tableLines, t, !forPrint));
      continue;
    }
    if (line === '---') {
      parts.push(forPrint ? '<hr/>' : `<hr class="${t.hr}"/>`);
      i++;
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      const lis = items.map((it) => `<li${forPrint ? '' : ` class="${t.oli}"`}>${inline(it, t.strong)}</li>`).join('');
      parts.push(forPrint ? `<ol>${lis}</ol>` : `<ol class="my-3 space-y-1.5">${lis}</ol>`);
      continue;
    }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      const lis = items.map((it) => `<li${forPrint ? '' : ` class="${t.li}"`}>${inline(it, t.strong)}</li>`).join('');
      parts.push(forPrint ? `<ul>${lis}</ul>` : `<ul class="my-3 space-y-1.5">${lis}</ul>`);
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    parts.push(forPrint ? `<p>${inline(line, '')}</p>` : `<p class="${t.p}">${inline(line, t.strong)}</p>`);
    i++;
  }

  return parts.join('\n');
}

export function renderReportMarkdown(text: string, theme: ReportTheme = 'light'): string {
  return parseMarkdownLines(text.split('\n'), THEMES[theme], false);
}

/** Plain HTML zonder Tailwind — geschikt voor PDF-export */
export function renderPlainReportMarkdown(text: string): string {
  return parseMarkdownLines(text.split('\n'), THEMES.light, true);
}

export function wrapReportHtmlDocument(
  bodyHtml: string,
  meta: {
    titel: string;
    status?: string;
    subtitel?: string;
    periode?: string;
    gegenereerd?: string;
  }
): string {
  const cover = buildPrintCoverHtml({
    titel: meta.titel,
    subtitel: meta.subtitel,
    status: meta.status ?? 'Definitief',
    periode: meta.periode,
    gegenereerd: meta.gegenereerd ?? new Date().toLocaleString('nl-NL'),
  });

  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8"/>
  <title>${meta.titel}</title>
  <style>${PRINT_DOCUMENT_CSS}</style>
</head>
<body>
  ${cover}
  <div class="doc-body">${bodyHtml}</div>
  <div class="doc-footer">Infra Engine · Automatisch gegenereerd document · Vertrouwelijk</div>
</body>
</html>`;
}

export function markdownToPrintHtml(
  markdown: string,
  title: string,
  meta?: { subtitel?: string; periode?: string; gegenereerd?: string; status?: string }
): string {
  let bodyHtml = renderPlainReportMarkdown(markdown);
  const normalizedTitle = title.trim().toLowerCase();
  bodyHtml = bodyHtml.replace(/^\s*<h1>([\s\S]*?)<\/h1>/i, (match, heading) =>
    heading.trim().toLowerCase() === normalizedTitle ? '' : match
  );

  return wrapReportHtmlDocument(bodyHtml, {
    titel: title,
    status: meta?.status ?? 'Definitief',
    ...meta,
  });
}
