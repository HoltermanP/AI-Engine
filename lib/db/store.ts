import { eq, sql } from 'drizzle-orm';
import type { DemoProject } from '@/demo/projects';
import type { DemoTrace } from '@/demo/traces';
import type { DemoBestaandNet } from '@/demo/klic';
import type { TraceSegment } from '@/demo/roads';
import type { Discipline } from './types';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import type { PersistedTraceToets } from '@/lib/services/trace-toets';
import { isCollectedDataCurrent } from '@/lib/services/normalize-collected';
import { DEMO_TRACES } from '@/demo/traces';
import { DEMO_BESTAAND_NET } from '@/demo/klic';
import { getDb, isDatabaseConfigured } from './index';
import {
  organisatie,
  project,
  trace,
  traceSegment,
  bestaandNet,
} from './schema';
import { parseLineStringZ, geomExpr, lineStringZWkt } from './geometry';
import * as demoStore from './demo-store';

interface ProjectMetadata {
  opdrachtgever?: string;
  projectnummer?: string;
}

interface TraceMetadata {
  kleur?: string;
  wegnaam?: string;
  leglocatie?: string;
  traceLines?: [number, number, number][][];
  omschrijving?: string;
  segmenten?: TraceSegment[];
  collectedData?: CollectedTraceData;
  userModified?: boolean;
  autoRouting?: {
    score: number;
    totaleLengteM: number;
    waarschuwingen: string[];
    blokkades: string[];
    alternativeId: string;
    alternativeLabel: string;
    berekendOp: string;
    aiToelichting?: string;
  };
  traceToets?: PersistedTraceToets;
}

function useDatabase() {
  return isDatabaseConfigured() && getDb() !== null;
}

function rowToProject(
  row: typeof project.$inferSelect,
  organisatieLegacyId: string
): DemoProject {
  const meta = (row.metadata ?? {}) as ProjectMetadata;
  return {
    id: row.legacyId ?? row.id,
    organisatieId: organisatieLegacyId,
    naam: row.naam,
    omschrijving: row.omschrijving ?? '',
    status: row.status as DemoProject['status'],
    gebied: row.gebied ?? '',
    opdrachtgever: meta.opdrachtgever ?? '',
    projectnummer: meta.projectnummer ?? '',
  };
}

function rowToTrace(
  row: typeof trace.$inferSelect & { geom_wkt?: string | null },
  projectLegacyId: string
): DemoTrace {
  const meta = (row.metadata ?? {}) as TraceMetadata;
  const coordinates = row.geom_wkt
    ? parseLineStringZ(row.geom_wkt)
    : meta.traceLines
      ? meta.traceLines.flat()
      : [];

  const base: DemoTrace = {
    id: row.legacyId ?? row.id,
    projectId: projectLegacyId,
    code: row.code,
    naam: row.naam,
    discipline: row.discipline as Discipline,
    netType: row.netType ?? '',
    fase: row.fase as DemoTrace['fase'],
    vereisteDekking: row.vereisteDekking,
    coordinates,
    traceLines: meta.traceLines ?? (coordinates.length ? [coordinates] : []),
    kleur: meta.kleur ?? '#2D6FE8',
    wegnaam: meta.wegnaam ?? '',
    leglocatie: meta.leglocatie ?? '',
    segmenten: meta.segmenten ?? [],
    omschrijving: meta.omschrijving ?? '',
  };

  return applyDemoTraceGeometry(base, meta.userModified);
}

function applyDemoTraceGeometry(traceRow: DemoTrace, userModified?: boolean): DemoTrace {
  if (userModified) return traceRow;
  const demo = DEMO_TRACES.find((t) => t.id === traceRow.id);
  if (!demo) return traceRow;
  return {
    ...traceRow,
    naam: demo.naam,
    wegnaam: demo.wegnaam,
    leglocatie: demo.leglocatie,
    omschrijving: demo.omschrijving,
    segmenten: demo.segmenten,
    coordinates: demo.coordinates,
    traceLines: demo.traceLines,
  };
}

function rowToBestaandNet(
  row: typeof bestaandNet.$inferSelect & { geom_wkt?: string | null }
): DemoBestaandNet {
  const base: DemoBestaandNet = {
    id: row.legacyId ?? row.id,
    thema: row.thema,
    beheerder: row.beheerder,
    spanningOfDiameter: row.spanningOfDiameter ?? '',
    materiaal: row.materiaal ?? '',
    nauwkeurigheid: row.nauwkeurigheid as DemoBestaandNet['nauwkeurigheid'],
    diepte: row.diepte ?? 0,
    vrijTeHoudenAfstand: row.vrijTeHoudenAfstand ?? 0,
    coordinates: parseLineStringZ(row.geom_wkt ?? null),
  };
  const demo = DEMO_BESTAAND_NET.find((n) => n.id === base.id);
  if (!demo) return base;
  return { ...base, coordinates: demo.coordinates, parallelAan: demo.parallelAan };
}

async function getOrganisatieLegacyId(): Promise<string> {
  const db = getDb()!;
  const [org] = await db.select().from(organisatie).limit(1);
  return org?.legacyId ?? 'demo-org-001';
}

export async function getOrganisatie() {
  if (!useDatabase()) return demoStore.getDemoOrganisatie();
  const db = getDb()!;
  const [org] = await db.select().from(organisatie).limit(1);
  if (!org) return demoStore.getDemoOrganisatie();
  return {
    id: org.legacyId ?? org.id,
    naam: org.naam,
    clerkOrgId: org.clerkOrgId ?? undefined,
  };
}

export async function getProjecten(): Promise<DemoProject[]> {
  if (!useDatabase()) return demoStore.getDemoProjecten();
  const db = getDb()!;
  const orgLegacyId = await getOrganisatieLegacyId();
  const rows = await db.select().from(project).orderBy(project.createdAt);
  return rows.map((r) => rowToProject(r, orgLegacyId));
}

export async function getProject(id: string): Promise<DemoProject | null> {
  if (!useDatabase()) return demoStore.getDemoProject(id);
  const db = getDb()!;
  const orgLegacyId = await getOrganisatieLegacyId();
  const [row] = await db
    .select()
    .from(project)
    .where(eq(project.legacyId, id))
    .limit(1);
  return row ? rowToProject(row, orgLegacyId) : null;
}

export async function getTraces(projectId?: string): Promise<DemoTrace[]> {
  if (!useDatabase()) return demoStore.getDemoTraces(projectId);
  const db = getDb()!;

  let projectUuid: string | undefined;
  if (projectId) {
    const [p] = await db
      .select({ id: project.id, legacyId: project.legacyId })
      .from(project)
      .where(eq(project.legacyId, projectId))
      .limit(1);
    if (!p) return [];
    projectUuid = p.id;
  }

  const rows = await db.execute<{ legacy_id: string; project_legacy_id: string } & Record<string, unknown>>(sql`
    SELECT
      t.*,
      ST_AsText(t.geom) AS geom_wkt,
      p.legacy_id AS project_legacy_id
    FROM trace t
    JOIN project p ON p.id = t.project_id
    ${projectUuid ? sql`WHERE t.project_id = ${projectUuid}` : sql``}
    ORDER BY t.code
  `);

  return rows.rows.map((row) => {
    const traceRow = {
      id: row.id as string,
      legacyId: row.legacy_id as string,
      projectId: row.project_id as string,
      code: row.code as string,
      naam: row.naam as string,
      discipline: row.discipline as string,
      netType: row.net_type as string | null,
      fase: row.fase as string,
      vereisteDekking: row.vereiste_dekking as number,
      metadata: row.metadata,
      geom_wkt: row.geom_wkt as string | null,
      createdAt: row.created_at as Date,
    } as typeof trace.$inferSelect & { geom_wkt?: string | null };

    return rowToTrace(traceRow, row.project_legacy_id as string);
  });
}

export async function getTrace(id: string): Promise<DemoTrace | null> {
  if (!useDatabase()) return demoStore.getDemoTrace(id);
  const db = getDb()!;

  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT
      t.*,
      ST_AsText(t.geom) AS geom_wkt,
      p.legacy_id AS project_legacy_id
    FROM trace t
    JOIN project p ON p.id = t.project_id
    WHERE t.legacy_id = ${id}
    LIMIT 1
  `);

  const row = result.rows[0];
  if (!row) return null;

  const traceRow = {
    id: row.id as string,
    legacyId: row.legacy_id as string,
    projectId: row.project_id as string,
    code: row.code as string,
    naam: row.naam as string,
    discipline: row.discipline as string,
    netType: row.net_type as string | null,
    fase: row.fase as string,
    vereisteDekking: row.vereiste_dekking as number,
    metadata: row.metadata,
    geom_wkt: row.geom_wkt as string | null,
    createdAt: row.created_at as Date,
  } as typeof trace.$inferSelect & { geom_wkt?: string | null };

  return rowToTrace(traceRow, row.project_legacy_id as string);
}

export async function getTraceByDiscipline(
  discipline: Discipline
): Promise<DemoTrace | null> {
  if (!useDatabase()) return demoStore.getDemoTraceByDiscipline(discipline);
  const traces = await getTraces();
  return traces.find((t) => t.discipline === discipline) ?? null;
}

export async function getBestaandNet(): Promise<DemoBestaandNet[]> {
  if (!useDatabase()) return demoStore.getDemoBestaandNet();
  const db = getDb()!;

  const result = await db.execute<Record<string, unknown>>(sql`
    SELECT bn.*, ST_AsText(bn.geom) AS geom_wkt
    FROM bestaand_net bn
    ORDER BY bn.thema, bn.beheerder
  `);

  return result.rows.map((row) =>
    rowToBestaandNet({
      id: row.id as string,
      legacyId: row.legacy_id as string | null,
      traceId: row.trace_id as string | null,
      thema: row.thema as string,
      beheerder: row.beheerder as string,
      spanningOfDiameter: row.spanning_of_diameter as string | null,
      materiaal: row.materiaal as string | null,
      nauwkeurigheid: row.nauwkeurigheid as string,
      diepte: row.diepte as number | null,
      vrijTeHoudenAfstand: row.vrij_te_houden_afstand as number | null,
      source: row._source as string,
      geom: null,
      geom_wkt: row.geom_wkt as string | null,
    })
  );
}

export async function getCollectedTraceData(
  traceLegacyId: string
): Promise<CollectedTraceData | null> {
  if (!useDatabase()) {
    const data = demoStore.getDemoTraceSession(traceLegacyId)?.collectedData ?? null;
    return isCollectedDataCurrent(data) ? data : null;
  }
  const db = getDb()!;

  const [row] = await db
    .select({ metadata: trace.metadata })
    .from(trace)
    .where(eq(trace.legacyId, traceLegacyId))
    .limit(1);

  const meta = (row?.metadata ?? {}) as TraceMetadata;
  const data = meta.collectedData ?? null;
  if (!isCollectedDataCurrent(data)) return null;
  return data;
}

export async function getPersistedTraceToets(
  traceLegacyId: string
): Promise<PersistedTraceToets | null> {
  if (!useDatabase()) {
    return demoStore.getDemoTraceSession(traceLegacyId)?.traceToets ?? null;
  }
  const db = getDb()!;

  const [row] = await db
    .select({ metadata: trace.metadata })
    .from(trace)
    .where(eq(trace.legacyId, traceLegacyId))
    .limit(1);

  const meta = (row?.metadata ?? {}) as TraceMetadata;
  return meta.traceToets ?? null;
}

export async function persistTraceToets(
  traceLegacyId: string,
  toets: PersistedTraceToets
): Promise<void> {
  if (!useDatabase()) {
    demoStore.saveDemoTraceSession(traceLegacyId, { traceToets: toets });
    return;
  }

  const db = getDb()!;
  const traceUuid = await getTraceInternalId(traceLegacyId);
  if (!traceUuid) return;

  const [current] = await db
    .select({ metadata: trace.metadata })
    .from(trace)
    .where(eq(trace.id, traceUuid))
    .limit(1);

  const prevMeta = (current?.metadata ?? {}) as TraceMetadata;
  await db
    .update(trace)
    .set({
      metadata: { ...prevMeta, traceToets: toets },
    })
    .where(eq(trace.id, traceUuid));
}

export async function getTraceInternalId(
  traceLegacyId: string
): Promise<string | null> {
  if (!useDatabase()) return null;
  const db = getDb()!;
  const [row] = await db
    .select({ id: trace.id })
    .from(trace)
    .where(eq(trace.legacyId, traceLegacyId))
    .limit(1);
  return row?.id ?? null;
}

export interface SaveTraceGeometryInput {
  traceLegacyId: string;
  coordinates: [number, number, number][];
  traceLines: [number, number, number][][];
  segmenten: TraceSegment[];
  wegnaam?: string;
  leglocatie?: string;
  autoRouting?: TraceMetadata['autoRouting'];
}

export async function saveTraceGeometry(
  input: SaveTraceGeometryInput
): Promise<{ ok: true; trace: DemoTrace } | { ok: false; error: string }> {
  const existing = await getTrace(input.traceLegacyId);
  if (!existing) {
    return { ok: false, error: `Tracé ${input.traceLegacyId} niet gevonden` };
  }

  const merged: DemoTrace = {
    ...existing,
    coordinates: input.coordinates,
    traceLines: input.traceLines,
    segmenten: input.segmenten,
    wegnaam: input.wegnaam ?? existing.wegnaam,
    leglocatie: input.leglocatie ?? existing.leglocatie,
  };

  if (!useDatabase()) {
    demoStore.saveDemoTraceOverride(input.traceLegacyId, {
      ...merged,
      userModified: true,
    } as DemoTrace & { userModified?: boolean });
    demoStore.saveDemoTraceSession(input.traceLegacyId, { traceToets: undefined });
    return { ok: true, trace: merged };
  }

  const db = getDb()!;
  const traceUuid = await getTraceInternalId(input.traceLegacyId);
  if (!traceUuid) {
    return { ok: false, error: 'Tracé UUID niet gevonden' };
  }

  const [current] = await db
    .select({ metadata: trace.metadata })
    .from(trace)
    .where(eq(trace.id, traceUuid))
    .limit(1);

  const prevMeta = (current?.metadata ?? {}) as TraceMetadata;
  const wkt = lineStringZWkt(input.coordinates);

  await db
    .update(trace)
    .set({
      geom: sql.raw(geomExpr(wkt)),
      metadata: {
        ...prevMeta,
        kleur: prevMeta.kleur ?? merged.kleur,
        wegnaam: merged.wegnaam,
        leglocatie: merged.leglocatie,
        traceLines: input.traceLines,
        segmenten: input.segmenten,
        userModified: true,
        autoRouting: input.autoRouting,
        traceToets: undefined,
      },
    })
    .where(eq(trace.id, traceUuid));

  await db.delete(traceSegment).where(eq(traceSegment.traceId, traceUuid));

  for (const seg of input.segmenten) {
    const line = input.traceLines[seg.volgorde - 1] ?? input.coordinates;
    const segWkt = lineStringZWkt(line);
    await db.insert(traceSegment).values({
      traceId: traceUuid,
      volgorde: seg.volgorde,
      legtechniek: seg.legtechniek,
      lengteM: seg.lengteM,
      geom: sql.raw(geomExpr(segWkt)),
    });
  }

  return { ok: true, trace: merged };
}

/** Sync fallback voor demo-modus — deprecated, gebruik async varianten. */
export {
  getDemoOrganisatie,
  getDemoProjecten,
  getDemoProject,
  getDemoTraces,
  getDemoTrace,
  getDemoTraceByDiscipline,
  getDemoBestaandNet,
} from './demo-store';
