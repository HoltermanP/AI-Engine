/**
 * Wis verouderde collectedData uit trace-metadata (na dataVersion-bump).
 * Run: npx tsx scripts/clear-collected.ts
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../lib/db/index';
import { COLLECTED_DATA_VERSION } from '../lib/services/collect-trace-data';

config({ path: '.env.local' });

async function main() {
  if (!isDatabaseConfigured()) {
    console.log('Geen database');
    return;
  }
  const db = getDb()!;
  await db.execute(sql`
    UPDATE trace
    SET metadata = metadata - 'collectedData'
    WHERE metadata->'collectedData'->>'dataVersion' IS DISTINCT FROM ${String(COLLECTED_DATA_VERSION)}
  `);
  console.log(`Verouderde collectedData gewist (huidige versie: ${COLLECTED_DATA_VERSION}).`);
  console.log('Open elk tracé en klik opnieuw op "Data verzamelen".');
}

main();
