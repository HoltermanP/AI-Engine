import { eq, sql } from 'drizzle-orm';
import type { CollectedTraceData } from '@/lib/services/collect-trace-data';
import { getDb, isDatabaseConfigured } from './index';
import * as demoStore from './demo-store';
import {
  trace,
  databron,
  bestaandNet,
  maaiveld,
  sondering,
  grondwater,
  perceel,
  belemmering,
} from './schema';
import { geomExpr, lineStringZWkt, pointWkt, polygonWkt } from './geometry';
import { getTraceInternalId } from './store';

export async function persistCollectedTraceData(
  traceLegacyId: string,
  data: CollectedTraceData
): Promise<void> {
  const db = getDb();
  if (!db) {
    if (isDatabaseConfigured()) return;
    demoStore.saveDemoTraceSession(traceLegacyId, { collectedData: data });
    return;
  }

  const traceUuid = await getTraceInternalId(traceLegacyId);
  if (!traceUuid) return;

  await db.delete(databron).where(eq(databron.traceId, traceUuid));
  await db.delete(bestaandNet).where(eq(bestaandNet.traceId, traceUuid));
  await db.delete(maaiveld).where(eq(maaiveld.traceId, traceUuid));
  await db.delete(sondering).where(eq(sondering.traceId, traceUuid));
  await db.delete(grondwater).where(eq(grondwater.traceId, traceUuid));
  await db.delete(perceel).where(eq(perceel.traceId, traceUuid));
  await db.delete(belemmering).where(eq(belemmering.traceId, traceUuid));

  for (const [bron, source] of Object.entries(data.sources)) {
    await db.insert(databron).values({
      traceId: traceUuid,
      bron,
      leverancier: bron.split('-')[0],
      source,
      opgehaaldOp: new Date(data.collectedAt),
    });
  }

  for (const n of data.bestaandNet) {
    const wkt = lineStringZWkt(n.coordinates);
    await db.insert(bestaandNet).values({
      // Scoped id — globale seed gebruikt dezelfde legacy_id zonder trace_id
      legacyId: `${traceLegacyId}:${n.id}`,
      traceId: traceUuid,
      thema: n.thema,
      beheerder: n.beheerder,
      spanningOfDiameter: n.spanningOfDiameter,
      materiaal: n.materiaal,
      nauwkeurigheid: n.nauwkeurigheid,
      diepte: n.diepte,
      vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
      source: n._source,
      geom: sql.raw(geomExpr(wkt)),
    });
  }

  for (const m of data.maaiveld) {
    await db.insert(maaiveld).values({
      traceId: traceUuid,
      chainage: m.chainage,
      hoogteNap: m.hoogteNap,
      geom: sql.raw(geomExpr(pointWkt(m.x, m.y, m.hoogteNap))),
      source: data.sources['pdok-ahn'] ?? 'demo',
    });
  }

  for (const s of data.sonderingen) {
    await db.insert(sondering).values({
      traceId: traceUuid,
      qc: s.qc,
      grondsoort: s.grondsoort,
      geom: sql.raw(geomExpr(pointWkt(s.x, s.y))),
      source: data.sources['bro-cpt'] ?? 'demo',
    });
  }

  for (const g of data.grondwater) {
    await db.insert(grondwater).values({
      traceId: traceUuid,
      standNap: g.standNap,
      geom: sql.raw(geomExpr(pointWkt(g.x, g.y))),
      source: data.sources['bro-grondwater'] ?? 'demo',
    });
  }

  for (const p of data.percelen) {
    const ring = p.polygon.length > 0 ? [...p.polygon, p.polygon[0]] : p.polygon;
    await db.insert(perceel).values({
      traceId: traceUuid,
      perceelnummer: p.perceelnummer,
      geom: ring.length >= 4 ? sql.raw(geomExpr(polygonWkt(ring))) : undefined,
      source: data.sources['pdok-brk-kaart'] ?? 'demo',
    });
  }

  for (const b of data.belemmeringen) {
    const wkt = lineStringZWkt(b.coordinates.map(([x, y]) => [x, y, 0]));
    await db.insert(belemmering).values({
      traceId: traceUuid,
      categorie: b.categorie,
      beheerder: b.beheerder,
      eisDekking: b.eisDekking,
      source: b._source,
      geom: sql.raw(geomExpr(wkt)),
    });
  }

  const [existing] = await db
    .select({ metadata: trace.metadata })
    .from(trace)
    .where(eq(trace.id, traceUuid))
    .limit(1);

  const prevMeta = (existing?.metadata ?? {}) as Record<string, unknown>;
  await db
    .update(trace)
    .set({
      metadata: { ...prevMeta, collectedData: data },
    })
    .where(eq(trace.id, traceUuid));
}
