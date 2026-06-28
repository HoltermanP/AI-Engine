'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { downloadMarkdownAsPdf } from '@/lib/export/download';
import { Download, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentDownloadButtonsProps {
  markdown: string;
  title: string;
  filename: string;
  size?: 'sm' | 'default';
  className?: string;
  /** Knoppen staan op een donkere achtergrond (bv. donkere PageHero) — geef de
   * Word-knop dan witte tekst/rand zodat hij leesbaar blijft. */
  onDark?: boolean;
  pdfMeta?: {
    subtitel?: string;
    periode?: string;
    gegenereerd?: string;
    status?: string;
  };
}

export function DocumentDownloadButtons({
  markdown,
  title,
  filename,
  size = 'sm',
  className,
  onDark = false,
  pdfMeta,
}: DocumentDownloadButtonsProps) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);

  async function handlePdf() {
    setDownloadingPdf(true);
    try {
      await downloadMarkdownAsPdf(markdown, `${filename}.pdf`, title, pdfMeta);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleWord() {
    setDownloadingWord(true);
    try {
      // docx lazy laden — statisch bundelen geeft een SyntaxError in de Turbopack client-chunk
      const { downloadMarkdownAsWord } = await import('@/lib/export/docx');
      await downloadMarkdownAsWord(markdown, `${filename}.docx`, title);
    } finally {
      setDownloadingWord(false);
    }
  }

  const btnClass = size === 'sm' ? 'h-8' : undefined;

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      <Button
        size={size}
        className={cn(size !== 'sm' && 'bg-[#2D6FE8] hover:bg-[#2D6FE8]/90', btnClass)}
        onClick={handlePdf}
        disabled={downloadingPdf}
      >
        <Download className="mr-1 h-3 w-3" />
        {downloadingPdf ? 'PDF genereren…' : 'PDF'}
      </Button>
      <Button
        size={size}
        variant="outline"
        className={cn(
          btnClass,
          // Op een donkere banner is de standaard outline-knop nauwelijks
          // leesbaar; geef hem dan witte tekst, rand en een subtiele vulling.
          onDark &&
            'border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:border-white/40 dark:bg-white/10 dark:hover:bg-white/20'
        )}
        onClick={handleWord}
        disabled={downloadingWord}
      >
        <FileType className="mr-1 h-3 w-3" />
        {downloadingWord ? 'Word genereren…' : 'Word'}
      </Button>
    </div>
  );
}
