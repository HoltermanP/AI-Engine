/**
 * In-memory netontwerp-store (demo-store-conventie: geen DB-migraties).
 * Eén netontwerp per project; overrides mergen over de seed heen.
 */

import type { Netontwerp } from '@/lib/netontwerp/types';
import { DEMO_NETONTWERPEN } from '@/demo/netontwerpen';

const overrides = new Map<string, Netontwerp>();

export function getDemoNetontwerp(projectId: string): Netontwerp | null {
  const override = overrides.get(projectId);
  if (override) return override;
  return DEMO_NETONTWERPEN.find((n) => n.projectId === projectId) ?? null;
}

export function saveDemoNetontwerp(ontwerp: Netontwerp): Netontwerp {
  const bijgewerkt = { ...ontwerp, bijgewerktOp: new Date().toISOString() };
  overrides.set(ontwerp.projectId, bijgewerkt);
  return bijgewerkt;
}

export function resetDemoNetontwerp(projectId: string): void {
  overrides.delete(projectId);
}
