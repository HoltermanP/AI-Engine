/**
 * Vergunningstatus per project (demo-store-conventie, geen migraties).
 * De startgereedheid-gate gebruikt deze statussen: pas wanneer alle
 * vereiste vergunningen verleend zijn, gaat het criterium op gereed.
 */

export type VergunningStatus = 'niet_ingediend' | 'ingediend' | 'verleend';

export const VERGUNNING_STATUS_LABELS: Record<VergunningStatus, string> = {
  niet_ingediend: 'Niet ingediend',
  ingediend: 'Ingediend — termijn loopt',
  verleend: 'Verleend',
};

export interface VergunningStatusRecord {
  status: VergunningStatus;
  bijgewerktOp: string;
}

// globalThis-singleton: in Next-dev kunnen route- en action-bundles aparte
// module-instanties laden; de gedeelde Map voorkomt dat status "verdwijnt".
const g = globalThis as unknown as {
  __vergunningStatussen?: Map<string, Record<string, VergunningStatusRecord>>;
};
const statussen = (g.__vergunningStatussen ??= new Map());

export function getDemoVergunningStatussen(
  projectId: string,
): Record<string, VergunningStatusRecord> {
  return statussen.get(projectId) ?? {};
}

export function zetDemoVergunningStatus(
  projectId: string,
  vergunningId: string,
  status: VergunningStatus,
): Record<string, VergunningStatusRecord> {
  const huidig = { ...getDemoVergunningStatussen(projectId) };
  huidig[vergunningId] = { status, bijgewerktOp: new Date().toISOString() };
  statussen.set(projectId, huidig);
  return huidig;
}
