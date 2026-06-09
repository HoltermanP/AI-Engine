import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('placeholder');
}

export function getDb() {
  if (!isDatabaseConfigured()) {
    return null;
  }
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export type Db = NonNullable<ReturnType<typeof getDb>>;
