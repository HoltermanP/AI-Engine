/**
 * Ingest + PostGIS-cache van Bodemloket WBB-vector per projectgebied.
 *
 * Bodemloket is traag en soms offline, daarom halen we per gebied éénmalig binnen
 * en cachen we als PostGIS-geometrie (RD/28992) met fetched_at. Bij elke render
 * lezen we uit de cache; pas na verloop van tijd (maxAge) verversen we live.
 */

import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { bodemLocatie } from '@/lib/db/schema';
import { geomFromGeoJsonExpr } from '@/lib/db/geometry';
import { fetchWbbLocaties } from '@/lib/connectors/bodem/wbb-arcgis';
import type { BboxQuery } from '@/lib/connectors/types';

/** Standaard cache-levensduur: 30 dagen (bodemarchief verandert traag). */
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Aantal rijen per insert-batch (neon-http: beperk round-trips). */
const INSERT_CHUNK = 100;

/** Stabiele cache-sleutel voor een bbox (afgerond op hele meters). */
export function gebiedKeyVoorBbox(bbox: BboxQuery): string {
  const r = (n: number) => Math.round(n);
  return `bbox:${r(bbox.minX)}:${r(bbox.minY)}:${r(bbox.maxX)}:${r(bbox.maxY)}`;
}

/** Cache-sleutel voor een tracé met buffer. */
export function gebiedKeyVoorTrace(traceId: string, bufferM: number): string {
  return `trace:${traceId}:buf${Math.round(bufferM)}`;
}

export interface IngestOpties {
  projectId?: string;
  /** Maximale cache-leeftijd voordat we live verversen. */
  maxAgeMs?: number;
  /** Forceer verversen ongeacht cache-leeftijd. */
  forceRefresh?: boolean;
  /** Plafond op aantal opgehaalde features. */
  maxFeatures?: number;
}

export interface IngestResult {
  aantal: number;
  /** ISO-datum waarop de brondata is opgehaald (cache of vers). */
  fetchedAt: string;
  /** Of het resultaat uit de bestaande cache komt. */
  uitCache: boolean;
  /** Of de data daadwerkelijk in PostGIS is opgeslagen (false in demo/offline). */
  gepersisteerd: boolean;
  /** Of het feature-plafond is geraakt (gebied mogelijk afgekapt). */
  afgekapt: boolean;
}

/**
 * Haalt WBB-locaties voor een gebied op en cachet ze in PostGIS (28992).
 * Geeft de bestaande cache terug als die nog vers genoeg is.
 */
export async function ingestWbbVoorGebied(
  bbox: BboxQuery,
  gebiedKey: string,
  opts: IngestOpties = {}
): Promise<IngestResult> {
  const {
    projectId,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    forceRefresh = false,
    maxFeatures,
  } = opts;

  const db = getDb();

  // Zonder DB (demo/offline): live ophalen, niet cachen.
  if (!db) {
    const res = await fetchWbbLocaties(bbox, 'EPSG:28992', maxFeatures);
    return {
      aantal: res.aantal,
      fetchedAt: new Date().toISOString(),
      uitCache: false,
      gepersisteerd: false,
      afgekapt: res.afgekapt,
    };
  }

  // Cache-versheid checken.
  if (!forceRefresh) {
    const [latest] = await db
      .select({
        fetchedAt: sql<string | null>`max(${bodemLocatie.fetchedAt})`,
        n: sql<number>`count(*)::int`,
      })
      .from(bodemLocatie)
      .where(eq(bodemLocatie.gebiedKey, gebiedKey));

    if (latest?.fetchedAt) {
      const age = Date.now() - new Date(latest.fetchedAt).getTime();
      if (age < maxAgeMs) {
        return {
          aantal: Number(latest.n) || 0,
          fetchedAt: new Date(latest.fetchedAt).toISOString(),
          uitCache: true,
          gepersisteerd: true,
          afgekapt: false,
        };
      }
    }
  }

  // Vers ophalen (RD voor opslag) en cache vervangen.
  const res = await fetchWbbLocaties(bbox, 'EPSG:28992', maxFeatures);
  const fetchedAt = new Date();

  const rijen = res.featureCollection.features
    .map((f, i) => ({ f, loc: res.locaties[i] }))
    .filter(({ f }) => f.geometry)
    .map(({ f, loc }) => ({
      projectId: projectId ?? null,
      gebiedKey,
      locatiecode: loc.locatiecode,
      dossier: loc.dossier ?? null,
      status: loc.status,
      vervolgWbb: loc.vervolgWbb ?? null,
      statusOordeel: loc.statusOordeel ?? null,
      bron: 'bodemloket-wbb' as const,
      geom: sql.raw(geomFromGeoJsonExpr(f.geometry as object)),
      fetchedAt,
      source: 'live' as const,
    }));

  await db.delete(bodemLocatie).where(eq(bodemLocatie.gebiedKey, gebiedKey));

  for (let i = 0; i < rijen.length; i += INSERT_CHUNK) {
    await db.insert(bodemLocatie).values(rijen.slice(i, i + INSERT_CHUNK));
  }

  return {
    aantal: rijen.length,
    fetchedAt: fetchedAt.toISOString(),
    uitCache: false,
    gepersisteerd: true,
    afgekapt: res.afgekapt,
  };
}

/** Eén gecachte WBB-locatie zoals teruggelezen voor de kaart. */
export interface CachedWbbLocatie {
  id: string;
  locatiecode: string;
  status: string;
  statusOordeel: string | null;
  geometry: GeoJSON.Geometry;
}

/**
 * Leest de gecachte WBB-locaties terug als GeoJSON in WGS84 (4326) voor MapLibre.
 * Reprojectie gebeurt in PostGIS (ST_Transform) — geen client-side reprojectie.
 */
export async function leesWbbCacheGeoJson(
  gebiedKey: string
): Promise<GeoJSON.FeatureCollection> {
  const db = getDb();
  if (!db) return { type: 'FeatureCollection', features: [] };

  const result = await db.execute(sql`
    SELECT id::text AS id,
           locatiecode,
           status,
           status_oordeel,
           ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson
    FROM bodem_locatie
    WHERE gebied_key = ${gebiedKey} AND geom IS NOT NULL
  `);

  // neon-http levert { rows }, sommige drivers leveren direct een array.
  const rows = (Array.isArray(result) ? result : result.rows) as Array<{
    id: string;
    locatiecode: string;
    status: string;
    status_oordeel: string | null;
    geojson: string;
  }>;

  return {
    type: 'FeatureCollection',
    features: rows.map((r) => ({
      type: 'Feature',
      id: r.id,
      geometry: JSON.parse(r.geojson) as GeoJSON.Geometry,
      properties: {
        id: r.id,
        locatiecode: r.locatiecode,
        status: r.status,
        statusOordeel: r.status_oordeel,
      },
    })),
  };
}
