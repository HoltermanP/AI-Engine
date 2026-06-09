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
        className={btnClass}
        onClick={handleWord}
        disabled={downloadingWord}
      >
        <FileType className="mr-1 h-3 w-3" />
        {downloadingWord ? 'Word genereren…' : 'Word'}
      </Button>
    </div>
  );
}
