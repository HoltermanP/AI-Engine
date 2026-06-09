'use client';

import { renderReportMarkdown } from '@/lib/reports/markdown';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

export interface DocumentMetaItem {
  label: string;
  value: string;
}

interface DocumentPreviewProps {
  markdown?: string;
  html?: string;
  compact?: boolean;
  className?: string;
  /** Optioneel documenthoofd boven de inhoud */
  title?: string;
  subtitle?: string;
  meta?: DocumentMetaItem[];
  showBrandHeader?: boolean;
}

export function DocumentPreview({
  markdown,
  html,
  compact = false,
  className,
  title,
  subtitle,
  meta,
  showBrandHeader = false,
}: DocumentPreviewProps) {
  const bodyHtml = html ?? (markdown ? renderReportMarkdown(markdown, 'light') : '');
  const hasHeader = showBrandHeader || title || subtitle || (meta && meta.length > 0);

  return (
    <div
      className={cn(
        'mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60',
        compact ? 'max-w-full' : 'max-w-4xl',
        className
      )}
    >
      {hasHeader && (
        <div className="bg-gradient-to-br from-[#0D1428] via-[#152040] to-[#2D6FE8] px-6 py-8 text-white md:px-10 md:py-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                Infra Engine
              </p>
              {title && (
                <h2 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-xl font-bold leading-tight md:text-2xl">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 text-sm leading-relaxed text-white/85">{subtitle}</p>
              )}
            </div>
            <div className="hidden shrink-0 rounded-xl bg-white/10 p-3 sm:block">
              <FileText className="h-6 w-6 text-white/80" />
            </div>
          </div>
          {meta && meta.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {meta.map((m) => (
                <span
                  key={m.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm"
                >
                  <span className="text-white/50">{m.label}:</span>
                  <span className="font-medium">{m.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <article className={cn(compact ? 'p-5 md:p-6' : 'p-8 md:p-12')}>
        <div className="report-document" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </article>
    </div>
  );
}
