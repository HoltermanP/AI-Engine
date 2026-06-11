import type { DemoTrace } from '@/demo/traces';
import { DEMO_TRACES } from '@/demo/traces';
import { DEMO_PROJECTS, getDemoProjectById } from '@/demo/projects';
import { DEMO_BESTAAND_NET } from '@/demo/klic';
import { DEMO_SONDERINGEN, DEMO_GRONDWATER } from '@/demo/bro';
import { DEMO_PERCELEN, DEMO_BELEMMERINGEN } from '@/demo/pdok';
import { DEMO_ORGANISATIE } from '@/lib/auth';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { PersistedTraceToets } from '@/lib/services/trace-toets';
import type { Discipline } from './types';

const traceOverrides = new Map<string, Partial<DemoTrace>>();

interface DemoTraceSession {
  collectedData?: CollectedTraceData;
  traceToets?: PersistedTraceToets;
}

const traceSessions = new Map<string, DemoTraceSession>();

export function saveDemoTraceSession(
  traceId: string,
  patch: Partial<DemoTraceSession>
): void {
  traceSessions.set(traceId, { ...traceSessions.get(traceId), ...patch });
}

export function getDemoTraceSession(traceId: string): DemoTraceSession | undefined {
  return traceSessions.get(traceId);
}

export function saveDemoTraceOverride(traceId: string, data: Partial<DemoTrace>): void {
  traceOverrides.set(traceId, { ...traceOverrides.get(traceId), ...data });
}

export function getDemoTraceOverride(traceId: string): Partial<DemoTrace> | undefined {
  return traceOverrides.get(traceId);
}

function mergeTrace(base: DemoTrace): DemoTrace {
  const override = traceOverrides.get(base.id);
  if (!override) return base;
  return { ...base, ...override };
}

export function getDemoOrganisatie() {
  return DEMO_ORGANISATIE;
}

export function getDemoProjecten() {
  return DEMO_PROJECTS;
}

export function getDemoProject(id: string) {
  return getDemoProjectById(id);
}

export function getDemoTraces(projectId?: string) {
  const traces = projectId
    ? DEMO_TRACES.filter((t) => t.projectId === projectId)
    : DEMO_TRACES;
  return traces.map(mergeTrace);
}

export function getDemoTrace(id: string) {
  const base = DEMO_TRACES.find((t) => t.id === id);
  return base ? mergeTrace(base) : null;
}

export function getDemoTraceByDiscipline(discipline: Discipline) {
  return DEMO_TRACES.find((t) => t.discipline === discipline) ?? null;
}

/**
 * Geüploade of via API geladen K&L-lagen van netbeheerders/waterbedrijven.
 * In-memory naast de demo-data (geen DB-migraties); per bron vervangbaar.
 */
const externeNetten = new Map<string, (typeof DEMO_BESTAAND_NET)[number][]>();

export function setDemoExterneNetLaag(
  bronId: string,
  items: (typeof DEMO_BESTAAND_NET)[number][]
): void {
  externeNetten.set(bronId, items);
}

export function getDemoExterneNetLagen(): { bronId: string; aantal: number }[] {
  return [...externeNetten.entries()].map(([bronId, items]) => ({
    bronId,
    aantal: items.length,
  }));
}

export function getDemoBestaandNet() {
  const extern = [...externeNetten.values()].flat();
  return extern.length > 0 ? [...DEMO_BESTAAND_NET, ...extern] : DEMO_BESTAAND_NET;
}

/** Bestek per project: leidend voor alle calculaties zodra geüpload. */
const bestekken = new Map<string, { naam: string; inhoud: string; geuploadOp: string }>();

export function setDemoBestek(projectId: string, naam: string, inhoud: string): void {
  bestekken.set(projectId, { naam, inhoud, geuploadOp: new Date().toISOString() });
}

export function getDemoBestek(
  projectId: string
): { naam: string; inhoud: string; geuploadOp: string } | null {
  return bestekken.get(projectId) ?? null;
}

/**
 * Referentietracés: eerder ontworpen (goedgekeurde) tracés die als
 * leervoorbeeld zijn geüpload. De router gebruikt ze als voorkeurscorridors.
 */
export interface DemoReferentieTrace {
  id: string;
  naam: string;
  bron: string;
  coordinates: [number, number][];
}

const referentieTraces: DemoReferentieTrace[] = [];

export function addDemoReferentieTraces(items: DemoReferentieTrace[]): void {
  referentieTraces.push(...items);
}

export function getDemoReferentieTraces(): DemoReferentieTrace[] {
  return referentieTraces;
}

export function getDemoSonderingen() {
  return DEMO_SONDERINGEN;
}

export function getDemoGrondwater() {
  return DEMO_GRONDWATER;
}

export function getDemoPercelen() {
  return DEMO_PERCELEN;
}

export function getDemoBelemmeringen() {
  return DEMO_BELEMMERINGEN;
}
