/**
 * Orchestratie van het bodem-vooronderzoek: ingest → ruimtelijke signalering.
 *
 * Koppelt de PostGIS-cache (bodem_locatie) en de AHN-dienst aan de pure
 * signaal-regels uit signals.ts, persisteert de signaleringen en geeft alles
 * gebundeld terug voor de API/UI.
 */

import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { bodemRapport, bodemSignalering } from '@/lib/db/schema';
import { fetchAhnElevation } from '@/lib/connectors/pdok/wfs-client';
import type { BodemTraceKruising } from '@/lib/services/bodem-risico/types';
import { ingestWbbVoorGebied, type IngestResult } from './ingest';
import {
  signaalBodemkwaliteit,
  signalenArchiefGat,
  signalenOphogingDemping,
  signalenVanKruisingen,
  type HoogteSample,
} from './signals';
import { genereerNen5725Rapport, type Nen5725Rapport } from './nen5725-rapport';
import type { BodemGebiedRef, BodemSignaal } from './types';

/** Standaard bufferbreedte rond het tracé (m) voor de invloedszone. */
export const DEFAULT_BUFFER_M = 25;

/** Maximaal aantal AHN-samples langs het tracé (beperkt trage WCS-calls). */
const AHN_SAMPLES = 12;

export interface BodemAnalyseResultaat {
  ingest: IngestResult;
  signalen: BodemSignaal[];
  /** Aantal kritische signalen — handig voor samenvattingen. */
  aantalKritisch: number;
  /** Gegenereerd NEN 5725 concept-rapport. */
  rapport: Nen5725Rapport;
}

/** Bouwt een 2D LINESTRING-WKT (RD/28992) uit tracé-coördinaten. */
function traceLineWkt(trace: [number, number, number?][]): string {
  const punten = trace.map(([x, y]) => `${x} ${y}`).join(', ');
  return `LINESTRING (${punten})`;
}

/** Bemonstert een tracé op n gelijkmatig verdeelde punten (RD). */
function sampleTracePunten(
  trace: [number, number, number?][],
  n: number
): { x: number; y: number; chainage: number }[] {
  if (trace.length < 2) return [];
  const seglen: number[] = [];
  let totaal = 0;
  for (let i = 1; i < trace.length; i++) {
    const d = Math.hypot(trace[i][0] - trace[i - 1][0], trace[i][1] - trace[i - 1][1]);
    seglen.push(d);
    totaal += d;
  }
  if (totaal === 0) return [];

  const punten: { x: number; y: number; chainage: number }[] = [];
  for (let k = 0; k < n; k++) {
    const doel = (totaal * k) / (n - 1);
    let acc = 0;
    let seg = 0;
    while (seg < seglen.length - 1 && acc + seglen[seg] < doel) {
      acc += seglen[seg];
      seg++;
    }
    const rest = seglen[seg] === 0 ? 0 : (doel - acc) / seglen[seg];
    const [x1, y1] = trace[seg];
    const [x2, y2] = trace[seg + 1];
    punten.push({
      x: x1 + (x2 - x1) * rest,
      y: y1 + (y2 - y1) * rest,
      chainage: Math.round(doel),
    });
  }
  return punten;
}

/**
 * (1) Bekende verontreiniging — PostGIS-bufferquery van het tracé tegen de
 * gecachte WBB-locaties. Geeft kruisingen terug die signals.ts omzet in signalen.
 */
async function kruisingenUitCache(
  gebiedKey: string,
  trace: [number, number, number?][],
  bufferM: number
): Promise<BodemTraceKruising[]> {
  const db = getDb();
  if (!db) return [];

  const wkt = traceLineWkt(trace);
  const result = await db.execute(sql`
    WITH t AS (SELECT ST_SetSRID(ST_GeomFromText(${wkt}), 28992) AS g)
    SELECT b.locatiecode,
           b.status,
           b.status_oordeel,
           round(ST_Distance(b.geom, t.g)::numeric, 1)::float8 AS afstand,
           ST_Intersects(b.geom, t.g) AS doorsnijdt,
           ST_X(ST_Centroid(b.geom))::float8 AS cx,
           ST_Y(ST_Centroid(b.geom))::float8 AS cy
    FROM bodem_locatie b, t
    WHERE b.gebied_key = ${gebiedKey}
      AND b.geom IS NOT NULL
      AND ST_DWithin(b.geom, t.g, ${bufferM})
    ORDER BY afstand ASC
  `);

  const rows = (Array.isArray(result) ? result : result.rows) as Array<{
    locatiecode: string;
    status: string;
    status_oordeel: string | null;
    afstand: number;
    doorsnijdt: boolean;
    cx: number;
    cy: number;
  }>;

  return rows.map((r) => {
    const verontreinigd = (r.status_oordeel ?? '').toLowerCase().includes('verontreinig');
    return {
      locatieId: r.locatiecode,
      naam: r.status,
      bron: 'bodemloket-wbb',
      risicoklasse: verontreinigd ? 'hoog' : 'onbekend',
      gebiedType: 'bodemlocatie',
      relatie: r.doorsnijdt || r.afstand === 0 ? 'doorschreden' : 'nabij',
      afstandTraceM: Math.round(r.afstand),
      x: r.cx,
      y: r.cy,
    };
  });
}

/** (2) AHN-hoogtesamples langs het tracé ophalen (sequentieel, nulls overslaan). */
async function hoogteSamples(
  trace: [number, number, number?][]
): Promise<HoogteSample[]> {
  const punten = sampleTracePunten(trace, AHN_SAMPLES);
  const samples: HoogteSample[] = [];
  for (const p of punten) {
    try {
      const h = await fetchAhnElevation(p.x, p.y);
      if (h !== null) samples.push({ chainage: p.chainage, hoogteNap: h });
    } catch {
      // AHN-punt overslaan; we fabriceren geen hoogte.
    }
  }
  return samples;
}

/** Persisteert de signaleringen voor een project/tracé (vervangt bestaande set). */
async function persistSignalen(
  ref: BodemGebiedRef,
  signalen: BodemSignaal[]
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  // Zonder project-/tracé-scope niet persisteren (voorkomt ophoping bij bbox-only).
  if (!ref.projectId && !ref.traceId) return false;
  if (ref.projectId) {
    await db.delete(bodemSignalering).where(eq(bodemSignalering.projectId, ref.projectId));
  } else if (ref.traceId) {
    await db.delete(bodemSignalering).where(eq(bodemSignalering.traceId, ref.traceId));
  }

  const rijen = signalen.map((s) => ({
    projectId: ref.projectId ?? null,
    traceId: ref.traceId ?? null,
    type: s.type,
    ernst: s.ernst,
    automatiseerbaar: s.automatiseerbaar,
    bron: s.bron,
    bronDatum: new Date(s.bronDatum),
    locatiecode: s.locatiecode ?? null,
    afstandM: s.afstandM ?? null,
    toelichting: s.toelichting,
    metadata: { titel: s.titel, handmatigeVerificatie: s.handmatigeVerificatie },
  }));
  if (rijen.length > 0) await db.insert(bodemSignalering).values(rijen);
  return true;
}

/** Persisteert het concept-rapport (vervangt bestaand rapport voor project/tracé). */
async function persistRapport(ref: BodemGebiedRef, rapport: Nen5725Rapport): Promise<void> {
  const db = getDb();
  if (!db) return;
  if (!ref.projectId && !ref.traceId) return;
  if (ref.projectId) {
    await db.delete(bodemRapport).where(eq(bodemRapport.projectId, ref.projectId));
  } else if (ref.traceId) {
    await db.delete(bodemRapport).where(eq(bodemRapport.traceId, ref.traceId));
  }
  await db.insert(bodemRapport).values({
    projectId: ref.projectId ?? null,
    traceId: ref.traceId ?? null,
    titel: rapport.titel,
    secties: rapport.secties,
    markdown: rapport.markdown,
    status: rapport.status,
  });
}

/**
 * Voert het volledige bodem-vooronderzoek uit voor een gebied: ingest WBB,
 * leidt de vier signaaltypes af en persisteert ze. Werkt met een tracé (buffer-
 * en AHN-analyse) of alleen een bbox (gebied-overzicht).
 */
export async function analyseerBodemVooronderzoek(
  ref: BodemGebiedRef,
  opts: { forceRefresh?: boolean } = {}
): Promise<BodemAnalyseResultaat> {
  const bufferM = ref.bufferM ?? DEFAULT_BUFFER_M;

  const ingest = await ingestWbbVoorGebied(ref.bbox, ref.gebiedKey, {
    projectId: ref.projectId,
    forceRefresh: opts.forceRefresh,
  });
  const bronDatum = ingest.fetchedAt;

  const signalen: BodemSignaal[] = [];

  // (1) Bekende verontreiniging.
  if (ref.trace && ref.trace.length >= 2) {
    const kruisingen = await kruisingenUitCache(ref.gebiedKey, ref.trace, bufferM);
    signalen.push(...signalenVanKruisingen(kruisingen, bronDatum));

    // (2) Ophoging/demping via AHN.
    const samples = await hoogteSamples(ref.trace);
    signalen.push(...signalenOphogingDemping(samples, bronDatum));
  } else if (ingest.aantal > 0) {
    // Alleen bbox: aggregeer tot één gebied-signaal (geen afstandsanalyse mogelijk).
    signalen.push({
      type: 'bekende_verontreiniging',
      ernst: 'let_op',
      automatiseerbaar: true,
      handmatigeVerificatie: false,
      bron: 'Bodemloket WBB (Wet bodembescherming)',
      bronDatum,
      titel: `${ingest.aantal} bekende bodemlocatie(s) in projectgebied`,
      toelichting:
        'Er zijn bekende (potentieel) verontreinigde locaties in het gebied. Definieer een tracé voor afstands- en doorsnijdingsanalyse.',
    });
  }

  // (3) Bodemkwaliteitsklasse (altijd, handmatig).
  signalen.push(signaalBodemkwaliteit(bronDatum));

  // (4) Archief-gat (altijd, handmatig).
  signalen.push(...signalenArchiefGat(bronDatum));

  const heeftTrace = !!(ref.trace && ref.trace.length >= 2);
  const rapport = genereerNen5725Rapport(signalen, {
    gebiedOmschrijving: ref.omschrijving ?? ref.gebiedKey,
    bufferM,
    heeftTrace,
  });

  await persistSignalen(ref, signalen);
  await persistRapport(ref, rapport);

  return {
    ingest,
    signalen,
    aantalKritisch: signalen.filter((s) => s.ernst === 'kritisch').length,
    rapport,
  };
}
