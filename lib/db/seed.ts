import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { DEMO_PROJECTS } from '@/demo/projects';
import { DEMO_TRACES } from '@/demo/traces';
import { DEMO_BESTAAND_NET } from '@/demo/klic';
import { DEMO_ORGANISATIE } from '@/lib/auth';
import { getDb, isDatabaseConfigured } from './index';
import { organisatie, project, trace, traceSegment, bestaandNet } from './schema';
import { geomExpr, lineStringZWkt } from './geometry';

config({ path: '.env.local' });

export async function seedDatabase() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL niet geconfigureerd in .env.local');
  }

  const db = getDb()!;

  const existing = await db
    .select({ id: organisatie.id })
    .from(organisatie)
    .where(sql`${organisatie.legacyId} = ${DEMO_ORGANISATIE.id}`)
    .limit(1);

  if (existing.length > 0) {
    console.log('Database al gevuld (demo-org-001 aanwezig) — seed overgeslagen.');
    return { skipped: true };
  }

  console.log('PostGIS extensie activeren…');
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);

  console.log('Organisatie seeden…');
  const [org] = await db
    .insert(organisatie)
    .values({
      legacyId: DEMO_ORGANISATIE.id,
      naam: DEMO_ORGANISATIE.naam,
      clerkOrgId: DEMO_ORGANISATIE.clerkOrgId,
    })
    .returning();

  console.log('Projecten seeden…');
  const projectIdMap = new Map<string, string>();

  for (const p of DEMO_PROJECTS) {
    const [row] = await db
      .insert(project)
      .values({
        legacyId: p.id,
        organisatieId: org.id,
        naam: p.naam,
        omschrijving: p.omschrijving,
        status: p.status,
        gebied: p.gebied,
        metadata: { opdrachtgever: p.opdrachtgever, projectnummer: p.projectnummer },
        updatedAt: new Date(),
      })
      .returning();
    projectIdMap.set(p.id, row.id);
  }

  console.log('Tracés seeden…');
  const traceIdMap = new Map<string, string>();

  for (const t of DEMO_TRACES) {
    const projectUuid = projectIdMap.get(t.projectId);
    if (!projectUuid) continue;

    const wkt = lineStringZWkt(t.coordinates);
    const [row] = await db
      .insert(trace)
      .values({
        legacyId: t.id,
        projectId: projectUuid,
        code: t.code,
        naam: t.naam,
        discipline: t.discipline,
        netType: t.netType,
        fase: t.fase,
        vereisteDekking: t.vereisteDekking,
        metadata: {
          kleur: t.kleur,
          wegnaam: t.wegnaam,
          leglocatie: t.leglocatie,
          traceLines: t.traceLines,
          omschrijving: t.omschrijving,
          segmenten: t.segmenten,
        },
        geom: sql.raw(geomExpr(wkt)),
      })
      .returning();

    traceIdMap.set(t.id, row.id);

    for (const seg of t.segmenten) {
      await db.insert(traceSegment).values({
        traceId: row.id,
        volgorde: seg.volgorde,
        legtechniek: seg.legtechniek,
        lengteM: seg.lengteM,
      });
    }
  }

  console.log('Bestaand net seeden…');
  for (const n of DEMO_BESTAAND_NET) {
    const wkt = lineStringZWkt(n.coordinates);
    await db.insert(bestaandNet).values({
      legacyId: n.id,
      thema: n.thema,
      beheerder: n.beheerder,
      spanningOfDiameter: n.spanningOfDiameter,
      materiaal: n.materiaal,
      nauwkeurigheid: n.nauwkeurigheid,
      diepte: n.diepte,
      vrijTeHoudenAfstand: n.vrijTeHoudenAfstand,
      source: 'demo',
      geom: sql.raw(geomExpr(wkt)),
    });
  }

  console.log(
    `Seed voltooid: 1 organisatie, ${DEMO_PROJECTS.length} projecten, ${DEMO_TRACES.length} tracés, ${DEMO_BESTAAND_NET.length} netten.`
  );
  return { skipped: false };
}

const isDirectRun = process.argv[1]?.includes('seed.ts');
if (isDirectRun) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed mislukt:', err);
      process.exit(1);
    });
}
