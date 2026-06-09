/**
 * NLCS 5.1 — lijnstijlen, lijndiktes en kleuren voor SVG-tekeningen.
 * Waarden omgerekend naar px bij 96 dpi (~3.78 px/mm); A3 @ 900px ≈ 0.35 mm/px.
 */

/** Lijndikte in px (NLCS-lijnweight × schaalfactor tekening) */
export const NLCS_LIJNDIKTE = {
  dun: 0.5,
  normaal: 0.75,
  medium: 1,
  dik: 1.5,
  hoofdlijn: 2,
  constructie: 2.5,
} as const;

/** NLCS lijnstijlen — dasharray in user units */
export const NLCS_LIJNTYPE = {
  doorlopend: undefined as string | undefined,
  stippel: '1,2',
  streep: '6,3',
  streepStip: '8,3,1,3',
  streepPunt: '12,3,1,3,1,3',
  vrij: '4,2',
} as const;

/** NLCS kleuren (RGB-hex) — utiliteit / infrastructuur */
export const NLCS_KLEUR = {
  achtergrond: '#ffffff',
  tekenkader: '#1a1a1a',
  hulplijn: '#b0b0b0',
  maatlijn: '#333333',
  maattekst: '#1a1a1a',
  maaiveld: '#8B6914',
  grond: '#C4A574',
  verharding: '#4a4a4a',
  verhardingLicht: '#888888',
  water: '#4A90D9',
  bouwvlak: '#E8E8E8',
  bouwvlakRand: '#999999',
  noordpijl: '#1a1a1a',
  snede: '#CC0000',
} as const;

/** IMKL / KLIC kleuren — conform IMKL 2.0 */
export const IMKL_LIJN = {
  ontwerp: { width: NLCS_LIJNDIKTE.constructie, dash: NLCS_LIJNTYPE.doorlopend },
  bestaand: { width: NLCS_LIJNDIKTE.medium, dash: NLCS_LIJNTYPE.streep },
  tijdelijk: { width: NLCS_LIJNDIKTE.normaal, dash: NLCS_LIJNTYPE.streepStip },
  hulplijn: { width: NLCS_LIJNDIKTE.dun, dash: NLCS_LIJNTYPE.stippel },
  maatvoering: { width: NLCS_LIJNDIKTE.dun, dash: NLCS_LIJNTYPE.doorlopend },
  snede: { width: NLCS_LIJNDIKTE.dik, dash: NLCS_LIJNTYPE.streepPunt },
} as const;

export const TEKENING_NORMEN = [
  'NLCS 5.1 — Lijnstijlen, lijndiktes en legenda',
  'IMKL 2.0 / KLIC-WIN — Bestaand net',
  'NEN 7171 — Utiliteitsstroken en legdiepte',
  'NEN-EN 81346 — Referentiebenamingen',
  'COINS 2.0 — Uitwisseling ondergrondse infrastructuur',
  'RD EPSG:28992 — Coördinatensysteem',
] as const;

export function nlcsStrokeAttrs(
  opts: { width: number; dash?: string; color: string; opacity?: number }
): string {
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const op = opts.opacity !== undefined ? ` stroke-opacity="${opts.opacity}"` : '';
  return `stroke="${opts.color}" stroke-width="${opts.width}" fill="none"${dash}${op}`;
}
