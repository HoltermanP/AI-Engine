import type { Discipline } from '@/lib/db/types';

/**
 * Kleurcodering ondergrondse netten volgens IMKL PMKL Handreiking visualisatie 2.0
 * (Informatiemodel Kabels en Leidingen — standaard voor KLIC-tekeningen).
 *
 * Waar geen IMKL-thema van toepassing is (bijv. algemeen), wordt een neutrale kleur gebruikt.
 */
export const IMKL_COLORS = {
  datatransport: '#00ff00',
  gasLageDruk: '#ffd750',
  gasHogeDruk: '#ffaf3c',
  hoogspanning: '#ff0000',
  middenspanning: '#c80000',
  laagspanning: '#960000',
  chemie: '#b64a00',
  rioolVrijverfall: '#ba38a8',
  rioolOnderOverdruk: '#800080',
  warmte: '#008080',
  water: '#0000ff',
  wees: '#918a6f',
  overig: '#6f5c10',
} as const;

/** Kleuren per projectdiscipline (InfraEngine datamodel) */
export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  elektra_ls: IMKL_COLORS.laagspanning,
  elektra_ms: IMKL_COLORS.middenspanning,
  gas_hd: IMKL_COLORS.gasHogeDruk,
  gas_ld: IMKL_COLORS.gasLageDruk,
  water: IMKL_COLORS.water,
  stations: IMKL_COLORS.middenspanning,
};

/** KLIC/IMKL thema (grovere indeling in bestaand-net data) */
export type UtilityThema = 'elektra' | 'gas' | 'water' | 'telecom' | 'media' | 'riool' | 'warmte';

export const UTILITY_THEMA_COLORS: Record<UtilityThema, string> = {
  elektra: IMKL_COLORS.laagspanning,
  gas: IMKL_COLORS.gasLageDruk,
  water: IMKL_COLORS.water,
  telecom: IMKL_COLORS.datatransport,
  media: IMKL_COLORS.datatransport,
  riool: IMKL_COLORS.rioolVrijverfall,
  warmte: IMKL_COLORS.warmte,
};

/** Extra disciplines in AVOI-profielen (niet in Discipline union) */
const AVOI_EXTRA_COLORS: Record<string, string> = {
  telecom: IMKL_COLORS.datatransport,
  media: IMKL_COLORS.datatransport,
  riool: IMKL_COLORS.rioolVrijverfall,
  warmte: IMKL_COLORS.warmte,
};

export function disciplineColor(discipline: Discipline | string): string {
  if (discipline in DISCIPLINE_COLORS) {
    return DISCIPLINE_COLORS[discipline as Discipline];
  }
  if (discipline in AVOI_EXTRA_COLORS) {
    return AVOI_EXTRA_COLORS[discipline];
  }
  if (discipline in UTILITY_THEMA_COLORS) {
    return UTILITY_THEMA_COLORS[discipline as UtilityThema];
  }
  return IMKL_COLORS.overig;
}

export function utilityThemaColor(
  thema: string,
  opts?: { spanning?: 'ls' | 'ms' | 'hs'; druk?: 'ld' | 'hd' }
): string {
  if (thema === 'elektra') {
    if (opts?.spanning === 'ms') return IMKL_COLORS.middenspanning;
    if (opts?.spanning === 'hs') return IMKL_COLORS.hoogspanning;
    return IMKL_COLORS.laagspanning;
  }
  if (thema === 'gas') {
    return opts?.druk === 'hd' ? IMKL_COLORS.gasHogeDruk : IMKL_COLORS.gasLageDruk;
  }
  if (thema in UTILITY_THEMA_COLORS) {
    return UTILITY_THEMA_COLORS[thema as UtilityThema];
  }
  return IMKL_COLORS.overig;
}

/** Legenda-labels voor tekeningen en kaart */
export const DISCIPLINE_COLOR_LABELS: Partial<Record<Discipline | UtilityThema | 'telecom' | 'warmte', string>> = {
  elektra_ls: 'Elektra LS (IMKL laagspanning)',
  elektra_ms: 'Elektra MS (IMKL middenspanning)',
  gas_hd: 'Gas HD (IMKL hoge druk)',
  gas_ld: 'Gas LD (IMKL lage druk)',
  water: 'Water',
  stations: 'MS-station',
  telecom: 'Datatransport / media',
  media: 'Datatransport / media',
  riool: 'Riool vrijverval',
  warmte: 'Warmte',
  elektra: 'Elektra',
  gas: 'Gas',
};
