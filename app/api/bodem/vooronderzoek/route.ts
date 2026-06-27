import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import type { BboxQuery } from '@/lib/connectors/types';
import { getDb } from '@/lib/db';
import { parseLineStringZ } from '@/lib/db/geometry';
import { getTraceInternalId } from '@/lib/db/store';
import {
  analyseerBodemVooronderzoek,
  DEFAULT_BUFFER_M,
} from '@/lib/services/bodem-vooronderzoek/analyse';
import {
  gebiedKeyVoorBbox,
  gebiedKeyVoorTrace,
  leesWbbCacheGeoJson,
} from '@/lib/services/bodem-vooronderzoek/ingest';
import type { BodemGebiedRef } from '@/lib/services/bodem-vooronderzoek/types';

interface VooronderzoekBody {
  bbox?: BboxQuery;
  trace?: [number, number, number?][];
  traceId?: string;
  projectId?: string;
  bufferM?: number;
  omschrijving?: string;
  forceRefresh?: boolean;
}

/** Bbox rond een tracé met marge (RD/28992). */
function bboxVanTrace(trace: [number, number, number?][], margeM: number): BboxQuery {
  const xs = trace.map((p) => p[0]);
  const ys = trace.map((p) => p[1]);
  return {
    minX: Math.min(...xs) - margeM,
    minY: Math.min(...ys) - margeM,
    maxX: Math.max(...xs) + margeM,
    maxY: Math.max(...ys) + margeM,
  };
}

/** Haalt tracé-coördinaten (RD) op uit de trace-tabel via legacy-id. */
async function traceCoordsUitDb(
  traceId: string
): Promise<[number, number, number?][] | null> {
  const db = getDb();
  if (!db) return null;
  const result = await db.execute(sql`
    SELECT ST_AsText(geom) AS wkt FROM trace WHERE legacy_id = ${traceId} LIMIT 1
  `);
  const rows = (Array.isArray(result) ? result : result.rows) as Array<{ wkt: string | null }>;
  const wkt = rows[0]?.wkt ?? null;
  if (!wkt) return null;
  const coords = parseLineStringZ(wkt);
  return coords.length >= 2 ? coords : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VooronderzoekBody;
    const bufferM = body.bufferM ?? DEFAULT_BUFFER_M;

    // Tracé-coördinaten: expliciet meegegeven of uit de DB via traceId.
    let trace = body.trace;
    if ((!trace || trace.length < 2) && body.traceId) {
      trace = (await traceCoordsUitDb(body.traceId)) ?? undefined;
    }

    // Bbox: expliciet, anders afgeleid van het tracé.
    let bbox = body.bbox;
    if (!bbox && trace && trace.length >= 2) {
      bbox = bboxVanTrace(trace, bufferM + 50);
    }
    if (!bbox) {
      return NextResponse.json(
        { error: 'Geef een bbox of een tracé (trace/traceId) op' },
        { status: 400 }
      );
    }

    const gebiedKey =
      body.traceId && trace
        ? gebiedKeyVoorTrace(body.traceId, bufferM)
        : gebiedKeyVoorBbox(bbox);

    // De bodem-tabellen koppelen op de interne trace-uuid; de UI levert de
    // legacy-id. Resolve hier zodat de FK klopt (legacy-id blijft cache-sleutel).
    const traceUuid = body.traceId ? await getTraceInternalId(body.traceId) : null;

    const ref: BodemGebiedRef = {
      bbox,
      trace,
      traceId: traceUuid ?? undefined,
      bufferM,
      gebiedKey,
      omschrijving: body.omschrijving,
    };

    const resultaat = await analyseerBodemVooronderzoek(ref, {
      forceRefresh: body.forceRefresh,
    });
    const geojson = await leesWbbCacheGeoJson(gebiedKey);

    return NextResponse.json({
      gebiedKey,
      ingest: resultaat.ingest,
      signalen: resultaat.signalen,
      aantalKritisch: resultaat.aantalKritisch,
      rapport: resultaat.rapport,
      geojson,
    });
  } catch (err) {
    console.error('[api/bodem/vooronderzoek]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bodem-vooronderzoek mislukt' },
      { status: 500 }
    );
  }
}

/** Kaart-GeoJSON (WGS84) voor een eerder geanalyseerd gebied — cachebaar. */
export async function GET(request: Request) {
  try {
    const gebiedKey = new URL(request.url).searchParams.get('gebiedKey');
    if (!gebiedKey) {
      return NextResponse.json({ error: 'gebiedKey is verplicht' }, { status: 400 });
    }
    const geojson = await leesWbbCacheGeoJson(gebiedKey);
    return NextResponse.json(
      { gebiedKey, geojson },
      { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (err) {
    console.error('[api/bodem/vooronderzoek][GET]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ophalen mislukt' },
      { status: 500 }
    );
  }
}
