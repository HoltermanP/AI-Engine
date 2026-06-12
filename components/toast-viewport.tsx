'use client';

import { useEffect, useState } from 'react';
import type { ToastBericht } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

const STIJL = {
  succes: { icoon: CheckCircle2, rand: 'border-emerald-500/40', accent: 'text-emerald-500' },
  fout: { icoon: CircleAlert, rand: 'border-red-500/40', accent: 'text-red-500' },
  info: { icoon: Info, rand: 'border-[#2D6FE8]/40', accent: 'text-[#2D6FE8]' },
} as const;

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastBericht[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const bericht = (e as CustomEvent<ToastBericht>).detail;
      setToasts((prev) => [...prev.slice(-3), bericht]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== bericht.id));
      }, bericht.type === 'fout' ? 9000 : 5000);
    };
    window.addEventListener('infra-toast', onToast);
    return () => window.removeEventListener('infra-toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[110] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const stijl = STIJL[t.type];
        const Icoon = stijl.icoon;
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur animate-in slide-in-from-bottom-2',
              stijl.rand,
            )}
          >
            <Icoon className={cn('mt-0.5 h-4 w-4 shrink-0', stijl.accent)} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{t.titel}</p>
              {t.detail && (
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.detail}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Sluiten"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
