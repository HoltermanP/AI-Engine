'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { maakProjectAction } from '@/lib/actions/project';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { FolderPlus, Loader2, X } from 'lucide-react';

/**
 * Nieuw-project-wizard: naam, gebied en opdrachtgever → direct door naar
 * het projectoverzicht waar netontwerp en tracés gestart kunnen worden.
 */
export function NieuwProjectWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fout, setFout] = useState<string | null>(null);
  const [vorm, setVorm] = useState({ naam: '', gebied: '', opdrachtgever: '', omschrijving: '' });

  const veld = (k: keyof typeof vorm, label: string, placeholder: string, lang = false) => (
    <label className="block">
      <span className="text-xs font-medium">{label}</span>
      {lang ? (
        <textarea
          value={vorm[k]}
          onChange={(e) => setVorm((v) => ({ ...v, [k]: e.target.value }))}
          placeholder={placeholder}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={vorm[k]}
          onChange={(e) => setVorm((v) => ({ ...v, [k]: e.target.value }))}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      )}
    </label>
  );

  const maak = () => {
    setFout(null);
    startTransition(async () => {
      const res = await maakProjectAction(vorm);
      if (!res.ok) {
        setFout(res.error);
        return;
      }
      toast('succes', 'Project aangemaakt', `${vorm.naam} — start met het netontwerp of teken het eerste tracé.`);
      setOpen(false);
      router.push(`/project/${res.projectId}`);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D6FE8]/40 bg-[#2D6FE8]/10 px-3 py-1.5 text-xs font-medium text-[#2D6FE8] transition-colors hover:bg-[#2D6FE8]/20"
      >
        <FolderPlus className="h-3.5 w-3.5" />
        Nieuw project
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Nieuw project starten</h2>
              <button
                type="button"
                aria-label="Sluiten"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Na het aanmaken kun je direct het netontwerp starten (belastingen → kabels → stations)
              of een eerste tracé schetsen.
            </p>

            <div className="mt-4 space-y-3">
              {veld('naam', 'Projectnaam *', 'Bijv. Netverzwaring Lelystad Haven')}
              {veld('gebied', 'Gebied / plaats', 'Bijv. Lelystad — Haven')}
              {veld('opdrachtgever', 'Opdrachtgever', 'Bijv. Liander')}
              {veld('omschrijving', 'Omschrijving', 'Korte scope-omschrijving (optioneel)', true)}
            </div>

            {fout && <p className="mt-3 text-xs text-red-600">{fout}</p>}

            <button
              type="button"
              onClick={maak}
              disabled={pending}
              className={cn(
                'mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2D6FE8] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2563d4]',
                pending && 'opacity-60',
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
              Project aanmaken
            </button>
          </div>
        </div>
      )}
    </>
  );
}
