import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

async function runSqlFile(sql: { query: (statement: string) => Promise<unknown> }, filename: string) {
  const path = join(process.cwd(), 'lib/db/migrations', filename);
  const content = readFileSync(path, 'utf-8');
  const statements = content
    .split(';')
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.query(statement);
  }
}

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('placeholder')) {
    throw new Error('DATABASE_URL niet geconfigureerd in .env.local');
  }

  const sql = neon(url);

  console.log('PostGIS extensie activeren…');
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`;

  console.log('Schema migreren (0001_schema.sql)…');
  await runSqlFile(sql, '0001_schema.sql');

  console.log('PostGIS functies migreren (0000_init.sql)…');
  const initSql = readFileSync(
    join(process.cwd(), 'lib/db/migrations/0000_init.sql'),
    'utf-8'
  );
  const functions = initSql.split(/(?=\nCREATE OR REPLACE FUNCTION)/).filter((s) => s.trim());
  for (const fn of functions) {
    if (fn.trim()) await sql.query(fn.trim());
  }

  console.log('Database migratie voltooid.');
}

const isDirectRun = process.argv[1]?.includes('migrate.ts');
if (isDirectRun) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migratie mislukt:', err);
      process.exit(1);
    });
}

export { migrate };
