'use client';

import { Printer } from 'lucide-react';

export function PrintKnop({ label = 'Afdrukken / PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D6FE8] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2563d4] print:hidden"
    >
      <Printer className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
