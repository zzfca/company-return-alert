import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { users, companies } from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const databaseUrl = process.env.DATABASE_URL || 'file:db.sqlite';
const client = createClient({ url: databaseUrl });
const db = drizzle({ client, schema });

async function ensureTables() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      registration_number TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      province TEXT NOT NULL DEFAULT 'BC',
      postal_code TEXT,
      phone TEXT,
      email TEXT,
      registration_date TEXT NOT NULL,
      profit_loss REAL DEFAULT 0,
      notes TEXT,
      requires_gst INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id),
      last_modified_by INTEGER REFERENCES users(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS filings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      year INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      filed_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS filing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      year INTEGER NOT NULL,
      filed_date TEXT NOT NULL,
      amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      filing_id INTEGER REFERENCES filings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      mime_type TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      uploaded_by INTEGER REFERENCES users(id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      changes TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export async function seedDatabase() {
  await ensureTables();

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    return { initialized: true, message: '数据库已初始化' };
  }

  const [xieHash, adminHash] = await Promise.all([
    hashPassword('xie123'),
    hashPassword('admin123'),
  ]);

  await db.insert(users).values([
    { username: 'xie', password: xieHash, name: 'Xie', role: 'admin' },
    { username: 'admin', password: adminHash, name: 'Admin', role: 'admin' },
  ]);

  await db.insert(companies).values([
    {
      name: '示例科技有限公司',
      registrationNumber: 'BC1234567',
      address: '123 Main St',
      city: 'Vancouver',
      province: 'BC',
      postalCode: 'V6B 1A1',
      phone: '604-555-0001',
      email: 'info@example.com',
      registrationDate: '2022-03-15',
      profitLoss: 50000,
      requiresGST: true,
      createdBy: 1,
      lastModifiedBy: 1,
    },
    {
      name: '枫叶贸易公司',
      registrationNumber: 'BC7654321',
      address: '456 Robson St',
      city: 'Vancouver',
      province: 'BC',
      postalCode: 'V6Z 2B3',
      phone: '604-555-0002',
      email: 'maple@trade.com',
      registrationDate: '2021-08-20',
      profitLoss: -12000,
      requiresGST: false,
      createdBy: 1,
      lastModifiedBy: 1,
    },
  ]);

  return { initialized: true, message: '数据库初始化完成' };
}
