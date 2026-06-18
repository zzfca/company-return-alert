import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL || 'file:db.sqlite';
const client = createClient({ url: databaseUrl });
export const db = drizzle({ client, schema });
