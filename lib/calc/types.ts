import type { Discipline } from '@/lib/db/types';
import { IMKL_COLORS } from '@/lib/discipline-colors';

export type CalcCategorie = 'elektra' | 'gas' | 'water' | 'stations' | 'algemeen';

export const CALC_CATEGORIE_LABELS: Record<CalcCategorie, string> = {
  elektra: 'Elektra',
  gas: 'Gas',
  water: 'Water',
  stations: 'Stations',
  algemeen: 'Algemeen',
};

export const CALC_CATEGORIE_KLEUREN: Record<CalcCategorie, string> = {
  elektra: IMKL_COLORS.laagspanning,
  gas: IMKL_COLORS.gasLageDruk,
  water: IMKL_COLORS.water,
  stations: IMKL_COLORS.middenspanning,
  algemeen: '#64748B',
};

export interface CalcResult {
  type: string;
  discipline: Discipline;
  categorie?: CalcCategorie;
  normReferentie: string;
  invoer: Record<string, number | string | boolean>;
  resultaat: Record<string, number | string | boolean>;
  aannames: string[];
  conclusie: string;
}

export interface CalcInput {
  lengteM: number;
  netType: string;
  vereisteDekking: number;
  diepteNap?: number;
  discipline: Discipline;
  legtechniek?: string;
  maaiveldNap?: number;
  sectieMm2?: number;
  diameterMm?: number;
  materiaal?: 'Al' | 'Cu' | 'PE' | 'Staal' | 'Gietijzer';
  spanningKV?: number;
}
