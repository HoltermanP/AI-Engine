import type { OnderzoekType } from '@/lib/research/types';

export type ProcessStepId =
  | 'ontwerp'
  | 'data_verzamelen'
  | 'toets_trace'
  | 'onderzoek_check'
  | 'quickscan_bodem'
  | 'quickscan_natura2000'
  | 'quickscan_archeologie'
  | 'quickscan_ecologie'
  | 'quickscan_nge'
  | 'kl_inventarisatie'
  | 'berekenen'
  | 'tekenen'
  | 'vergunning_checklist'
  | 'aanvragen'
  | 'ai_analyse'
  | 'dossier';

export type StepStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend' | 'niet_nodig';

/** Stap telt als voltooid voor workflow-voortgang (toets ook bij blokkades). */
export function isProcessStepVoltooid(stepId: ProcessStepId, status?: StepStatus): boolean {
  if (!status) return false;
  if (stepId === 'toets_trace') {
    return status === 'gereed' || status === 'blokkerend';
  }
  return status === 'gereed';
}

export function zijnVereisteStappenVoltooid(
  vereist: ProcessStepId[] | undefined,
  stepStatuses: Partial<Record<ProcessStepId, StepStatus>>
): boolean {
  if (!vereist?.length) return true;
  return vereist.every((req) => isProcessStepVoltooid(req, stepStatuses[req]));
}

export interface ProcessStep {
  id: ProcessStepId;
  label: string;
  fase: number;
  beschrijving: string;
  vereist?: ProcessStepId[];
  onderzoekType?: OnderzoekType;
}

export const ENGINEERING_WORKFLOW: ProcessStep[] = [
  { id: 'ontwerp', label: 'Ontwerp', fase: 1, beschrijving: 'Tracéontwerp met coördinaten, discipline en leglocatie' },
  { id: 'data_verzamelen', label: 'Data verzamelen', fase: 2, beschrijving: 'PDOK, BRO, KLIC, waterschap en BRK ophalen voor tracé-bbox', vereist: ['ontwerp'] },
  { id: 'toets_trace', label: 'Toets tracé', fase: 2, beschrijving: 'Conflictdetectie: afstand, dekking, kruisingen', vereist: ['data_verzamelen'] },
  { id: 'onderzoek_check', label: 'Check benodigde onderzoeken', fase: 4, beschrijving: 'Bepaal welke bureauonderzoeken en quick scans nodig zijn', vereist: ['toets_trace'] },
  { id: 'quickscan_bodem', label: 'Quick scan bodem (NEN 5725)', fase: 4, beschrijving: 'Vooronderzoek bodem met historische analyse en BRO-data', vereist: ['toets_trace'], onderzoekType: 'bodem_nen5725' },
  { id: 'quickscan_natura2000', label: 'Natura 2000-toets', fase: 4, beschrijving: 'Passende beoordeling / effectbeoordeling N2000', vereist: ['toets_trace'], onderzoekType: 'natura2000' },
  { id: 'quickscan_archeologie', label: 'Bureauonderzoek archeologie', fase: 4, beschrijving: 'Historisch onderzoek en archeologische verwachting', vereist: ['toets_trace'], onderzoekType: 'archeologie' },
  { id: 'quickscan_ecologie', label: 'Ecologische quickscan (Wnb)', fase: 4, beschrijving: 'Beschermde soorten, broedseizoen, mitigerende maatregelen', vereist: ['toets_trace'], onderzoekType: 'ecologie_wnb' },
  { id: 'quickscan_nge', label: 'NGE/CE-bureauonderzoek', fase: 4, beschrijving: 'Risico niet-gesprongen explosieven', vereist: ['toets_trace'], onderzoekType: 'nge_ce' },
  { id: 'kl_inventarisatie', label: 'K&L-inventarisatie', fase: 4, beschrijving: 'Analyse KLIC-data met conflicten en kruisingen', vereist: ['toets_trace'], onderzoekType: 'kl_inventarisatie' },
  { id: 'berekenen', label: 'Engineering berekenen', fase: 3, beschrijving: 'Discipline-specifieke berekeningen conform norm', vereist: ['toets_trace'] },
  { id: 'tekenen', label: 'Tekeningen genereren', fase: 3, beschrijving: 'Tracé, lengteprofiel, dwarsprofiel, kruisingsdetail', vereist: ['berekenen'] },
  { id: 'vergunning_checklist', label: 'Vergunningchecklist', fase: 4, beschrijving: 'Welke vergunningen en meldingen nodig op basis van belemmeringen', vereist: ['onderzoek_check'] },
  { id: 'aanvragen', label: 'Aanvragen & documenten', fase: 4, beschrijving: 'Concept-aanvragen en brieven genereren', vereist: ['vergunning_checklist'] },
  { id: 'ai_analyse', label: 'AI-conflictanalyse', fase: 4, beschrijving: 'Samenvatting conflicten en oplossingsrichtingen', vereist: ['toets_trace'] },
  { id: 'dossier', label: 'Dossier samenstellen', fase: 4, beschrijving: 'Alle documenten, tekeningen en rapporten bundelen', vereist: ['berekenen', 'tekenen', 'aanvragen'] },
];
