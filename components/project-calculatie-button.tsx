'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { generateProjectCalculatieAction } from '@/lib/actions/calculatie';
import { downloadBase64 } from '@/lib/export/download';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

interface ProjectCalculatieButtonProps {
  projectId: string;
}

export function ProjectCalculatieButton({ projectId }: ProjectCalculatieButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [totaal, setTotaal] = useState<number | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await generateProjectCalculatieAction(projectId);
      setTotaal(res.calculatie.samenvatting.totaalInclBtw);
      downloadBase64(
        res.excelBase64,
        res.filename,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className="h-7 gap-1 border-emerald-500/40 text-[10px] text-emerald-800 hover:bg-emerald-500/10"
    >
      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
      {totaal != null
        ? `Calculatie €${Math.round(totaal).toLocaleString('nl-NL')}`
        : 'Project-calculatie'}
    </Button>
  );
}
