/**
 * Calculatieniveau per projectfase: raming (VO, ±30%), budget (DO, ±15%),
 * inschrijf-/directiebegroting (UO/werkvoorbereiding, ±5%).
 */

import type { ProjectFaseId } from '@/lib/process/fasen';

export interface CalculatieNiveau {
  id: 'raming' | 'budget' | 'inschrijfbegroting';
  label: string;
  /** Bandbreedte in % (±). */
  bandbreedte: number;
  /** Opslag onvoorzien dat bij dit niveau gangbaar is (%). */
  onvoorzienPct: number;
}

export const CALCULATIE_NIVEAUS: Record<CalculatieNiveau['id'], CalculatieNiveau> = {
  raming: { id: 'raming', label: 'Kostenraming', bandbreedte: 30, onvoorzienPct: 20 },
  budget: { id: 'budget', label: 'Budgetcalculatie', bandbreedte: 15, onvoorzienPct: 10 },
  inschrijfbegroting: {
    id: 'inschrijfbegroting',
    label: 'Inschrijf-/directiebegroting',
    bandbreedte: 5,
    onvoorzienPct: 5,
  },
};

export function niveauVoorFase(fase: ProjectFaseId): CalculatieNiveau {
  switch (fase) {
    case 'verkenning':
    case 'vo':
      return CALCULATIE_NIVEAUS.raming;
    case 'do':
      return CALCULATIE_NIVEAUS.budget;
    default:
      return CALCULATIE_NIVEAUS.inschrijfbegroting;
  }
}

export interface NiveauBandbreedte {
  niveau: CalculatieNiveau;
  ondergrens: number;
  bovengrens: number;
}

/** Bandbreedte rond een calculatietotaal voor het gegeven fase-niveau. */
export function bandbreedteVoorTotaal(totaal: number, fase: ProjectFaseId): NiveauBandbreedte {
  const niveau = niveauVoorFase(fase);
  return {
    niveau,
    ondergrens: Math.round(totaal * (1 - niveau.bandbreedte / 100)),
    bovengrens: Math.round(totaal * (1 + niveau.bandbreedte / 100)),
  };
}
