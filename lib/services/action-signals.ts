import type { ProjectAction } from '@/demo/project-actions';

export type SignaalKleur = 'groen' | 'oranje' | 'rood';

export interface ActionMetSignaal extends ProjectAction {
  signaal: SignaalKleur;
  dagenTotDeadline: number | null;
  planningWeek?: string;
  toegewezenAan?: string;
  startDatum?: string;
}

export function berekenSignaal(action: ProjectAction, today = new Date()): SignaalKleur {
  if (action.status === 'afgerond') return 'groen';
  if (action.status === 'blokkerend') return 'rood';

  if (!action.deadline) {
    return action.status === 'bezig' ? 'oranje' : 'groen';
  }

  const deadline = new Date(action.deadline);
  const diffMs = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'rood';
  if (diffDays <= 7) return 'oranje';
  return 'groen';
}

export function dagenTotDeadline(deadline?: string, today = new Date()): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function enrichActions(actions: ProjectAction[]): ActionMetSignaal[] {
  return actions.map((a) => ({
    ...a,
    signaal: berekenSignaal(a),
    dagenTotDeadline: dagenTotDeadline(a.deadline),
    planningWeek: a.planningWeek,
    toegewezenAan: a.toegewezenAan,
    startDatum: a.startDatum,
  }));
}

export const SIGNAAL_STIJL: Record<
  SignaalKleur,
  { label: string; bg: string; text: string; ring: string; dot: string }
> = {
  groen: {
    label: 'Op schema',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  oranje: {
    label: 'Aandacht',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    ring: 'ring-amber-500/30',
    dot: 'bg-amber-500',
  },
  rood: {
    label: 'Kritiek',
    bg: 'bg-red-500/10',
    text: 'text-red-700',
    ring: 'ring-red-500/30',
    dot: 'bg-red-500',
  },
};
