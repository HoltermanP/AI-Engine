import type { DetectedConflict } from '@/lib/services/conflict-detection';
import { normalizeTraceCoordinates } from '@/lib/trace-edit';

export type PersistedTraceToetsStatus = 'gereed' | 'blokkerend';

export interface PersistedTraceToets {
  status: PersistedTraceToetsStatus;
  toetsedAt: string;
  geometryFingerprint: string;
  conflicten: DetectedConflict[];
}

export function traceGeometryFingerprint(
  coordinates: [number, number, number?][]
): string {
  const normalized = normalizeTraceCoordinates(coordinates);
  if (!normalized.length) return '';
  return normalized
    .map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`)
    .join(';');
}

export function toetsStatusFromConflicts(
  conflicten: DetectedConflict[]
): PersistedTraceToetsStatus {
  return conflicten.some((c) => c.ernst === 'blokkerend') ? 'blokkerend' : 'gereed';
}

export function isPersistedToetsValidForGeometry(
  toets: PersistedTraceToets | null | undefined,
  coordinates: [number, number, number?][]
): boolean {
  if (!toets) return false;
  const fp = traceGeometryFingerprint(coordinates);
  return fp.length > 0 && fp === toets.geometryFingerprint;
}
