import { createClient } from '@libsql/client';
const c = createClient({ url: 'file:db.sqlite' });
const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log('Tables:', tables.rows.map(r => r.name));
const users = await c.execute('SELECT * FROM users');
console.log('Users:', JSON.stringify(users.rows));
const filings = await c.execute('SELECT count(*) as cnt FROM filings');
console.log('Filings count:', filings.rows[0]?.cnt);
c.close();