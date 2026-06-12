'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaletteItemsAction, type PaletteItem } from '@/lib/actions/command-palette';
import { cn } from '@/lib/utils';
import { FolderKanban, GitBranch, PanelsTopLeft, Search } from 'lucide-react';

const GROEP_ICOON = {
  Projecten: FolderKanban,
  'Tracés': GitBranch,
  "Pagina's": PanelsTopLeft,
} as const;

/**
 * Command palette (⌘K / Ctrl+K): spring direct naar elk project, tracé of
 * elke pagina. Pijltjes + Enter om te kiezen, Esc om te sluiten.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [actief, setActief] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const geladen = useRef(false);

  // Globale sneltoets
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Items lazy laden bij eerste opening
  useEffect(() => {
    if (!open) return;
    setZoek('');
    setActief(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    if (!geladen.current) {
      geladen.current = true;
      getPaletteItemsAction().then(setItems);
    }
  }, [open]);

  const resultaten = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    const basis = q
      ? items.filter((i) =>
          `${i.titel} ${i.ondertitel ?? ''} ${i.groep}`.toLowerCase().includes(q),
        )
      : items;
    return basis.slice(0, 12);
  }, [items, zoek]);

  const kies = useCallback(
    (item: PaletteItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActief((a) => Math.min(a + 1, resultaten.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActief((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && resultaten[actief]) {
      e.preventDefault();
      kies(resultaten[actief]);
    }
  };

  if (!open) return null;

  let vorigeGroep: string | null = null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={zoek}
            onChange={(e) => {
              setZoek(e.target.value);
              setActief(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Zoek project, tracé of pagina…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {resultaten.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {items.length === 0 ? 'Laden…' : 'Geen resultaten'}
            </p>
          )}
          {resultaten.map((item, i) => {
            const Icoon = GROEP_ICOON[item.groep];
            const toonGroep = item.groep !== vorigeGroep;
            vorigeGroep = item.groep;
            return (
              <div key={item.id}>
                {toonGroep && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {item.groep}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => kies(item)}
                  onMouseEnter={() => setActief(i)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left',
                    i === actief ? 'bg-[#2D6FE8]/10 text-[#2D6FE8]' : 'text-foreground',
                  )}
                >
                  <Icoon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.titel}</span>
                    {item.ondertitel && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {item.ondertitel}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          ↑↓ navigeren · Enter openen · ⌘K sluiten
        </div>
      </div>
    </div>
  );
}
