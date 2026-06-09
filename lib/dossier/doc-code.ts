/**
 * Documentcodering conform projectconventie:
 * [PROJECT]-[FASE]-[TYPE]-[VOLGNR]-[VERSIE], bijv. NOP01-DO-RAP-003-v1.2
 */

import type { ProjectFaseId } from '@/lib/process/fasen';

export type DocumentTypeCode =
  | 'RAP' // rapport
  | 'NOT' // notitie (o.a. uitgangspuntennotitie)
  | 'TEK' // tekening
  | 'BER' // berekening
  | 'PLN' // planning / plan
  | 'CAL' // calculatie
  | 'LST' // lijst (o.a. materiaallijst)
  | 'VGP'; // V&G-plan

const FASE_CODES: Record<ProjectFaseId, string> = {
  verkenning: 'VH',
  vo: 'VO',
  do: 'DO',
  uo: 'UO',
  werkvoorbereiding: 'WVB',
  uitvoering: 'UIT',
};

export interface DocCodeInput {
  /** Projectcode, bijv. "NOP01". Niet-alfanumerieke tekens worden gestript. */
  projectCode: string;
  fase: ProjectFaseId;
  type: DocumentTypeCode;
  volgnummer: number;
  /** Major.minor, bijv. { major: 1, minor: 0 } → v1.0 */
  versie?: { major: number; minor: number };
}

export function formatDocCode(input: DocCodeInput): string {
  const project = input.projectCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'PROJ';
  const fase = FASE_CODES[input.fase];
  const volgnr = String(input.volgnummer).padStart(3, '0');
  const versie = input.versie ?? { major: 1, minor: 0 };
  return `${project}-${fase}-${input.type}-${volgnr}-v${versie.major}.${versie.minor}`;
}
