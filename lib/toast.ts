/**
 * Minimale toast-helper: vuur vanuit elke client-component een melding af;
 * de ToastViewport (in AppShell) luistert en toont ze rechtsonder.
 */

export type ToastType = 'succes' | 'fout' | 'info';

export interface ToastBericht {
  id: number;
  type: ToastType;
  titel: string;
  detail?: string;
}

let teller = 0;

export function toast(type: ToastType, titel: string, detail?: string): void {
  if (typeof window === 'undefined') return;
  teller += 1;
  window.dispatchEvent(
    new CustomEvent<ToastBericht>('infra-toast', {
      detail: { id: teller, type, titel, detail },
    }),
  );
}
