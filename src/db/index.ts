import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// 与 drizzle.config.ts 保持一致，使用项目根目录下的 db.sqlite
const client = createClient({ url: 'file:db.sqlite' });
export const db = drizzle({ client, schema });
