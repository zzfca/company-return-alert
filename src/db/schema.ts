
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  registrationNumber: text('registration_number'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  province: text('province').notNull().default('BC'),
  postalCode: text('postal_code'),
  phone: text('phone'),
  email: text('email'),
  registrationDate: text('registration_date').notNull(),
  profitLoss: real('profit_loss').default(0),
  notes: text('notes'),
  requiresGST: integer('requires_gst', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  createdBy: integer('created_by').references(() => users.id),
  lastModifiedBy: integer('last_modified_by').references(() => users.id),
});

export const filings = sqliteTable('filings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  year: integer('year').notNull(),
  dueDate: text('due_date').notNull(),
  filedDate: text('filed_date'),
  status: text('status').notNull().default('pending'),
  amount: real('amount').default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  createdBy: integer('created_by').references(() => users.id),
});

export const filingHistory = sqliteTable('filing_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  year: integer('year').notNull(),
  filedDate: text('filed_date').notNull(),
  amount: real('amount').default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  createdBy: integer('created_by').references(() => users.id),
});

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  filingId: integer('filing_id').references(() => filings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type'),
  uploadedAt: text('uploaded_at').notNull().default(sql`(datetime('now'))`),
  uploadedBy: integer('uploaded_by').references(() => users.id),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  changes: text('changes'),
  timestamp: text('timestamp').notNull().default(sql`(datetime('now'))`),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Filing = typeof filings.$inferSelect;
export type NewFiling = typeof filings.$inferInsert;
export type FilingHistory = typeof filingHistory.$inferSelect;
export type NewFilingHistory = typeof filingHistory.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;