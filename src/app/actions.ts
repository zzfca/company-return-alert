'use server';

import { db } from '@/db';
import { companies, filings, documents, users, auditLogs, filingHistory } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { seedDatabase } from '@/db/seed';
import {
  getCurrentUser as authGetCurrentUser,
  login,
  logout as authLogout,
  changePassword as authChangePassword,
} from '@/lib/auth';
import type { NewCompany, NewFiling } from '@/db/schema';

function calculateDueDate(registrationDate: string, year: number): string {
  const regDate = new Date(registrationDate);
  const dueDate = new Date(regDate);
  dueDate.setMonth(dueDate.getMonth() + 6);

  const regYear = regDate.getFullYear();
  if (year !== regYear) {
    dueDate.setFullYear(year);
  }

  return dueDate.toISOString().split('T')[0];
}

async function requireAuth() {
  const user = await authGetCurrentUser();
  if (!user) throw new Error('未授权，请先登录');
  return user;
}

export async function authenticateUser(username: string, password: string) {
  await seedDatabase();
  return login(username, password);
}

export async function logout() {
  return authLogout();
}

export async function changePassword(oldPassword: string, newPassword: string) {
  return authChangePassword(oldPassword, newPassword);
}

export async function getCurrentUser() {
  return authGetCurrentUser();
}

export async function createCompany(data: Omit<NewCompany, 'createdBy' | 'lastModifiedBy'>) {
  const user = await requireAuth();

  const [company] = await db.insert(companies).values({
    ...data,
    createdBy: user.id,
    lastModifiedBy: user.id,
  }).returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'create',
    entityType: 'company',
    entityId: company.id,
    changes: JSON.stringify(data),
  });

  const registrationYear = new Date(data.registrationDate).getFullYear();

  await db.insert(filings).values({
    companyId: company.id,
    type: 'annual_report',
    year: registrationYear,
    dueDate: data.registrationDate,
    status: 'pending',
    createdBy: user.id,
  });

  const incomeTaxDueDate = calculateDueDate(data.registrationDate, registrationYear);
  await db.insert(filings).values({
    companyId: company.id,
    type: 'income_tax',
    year: registrationYear,
    dueDate: incomeTaxDueDate,
    status: 'pending',
    createdBy: user.id,
  });

  if (data.requiresGST) {
    const gstDueDate = calculateDueDate(data.registrationDate, registrationYear);
    await db.insert(filings).values({
      companyId: company.id,
      type: 'gst',
      year: registrationYear,
      dueDate: gstDueDate,
      status: 'pending',
      createdBy: user.id,
    });
  }

  return company;
}

export async function updateCompany(
  id: number,
  data: Partial<Omit<NewCompany, 'createdBy' | 'lastModifiedBy'>>,
) {
  const user = await requireAuth();

  const [oldCompany] = await db.select().from(companies).where(eq(companies.id, id));

  const [updated] = await db.update(companies)
    .set({ ...data, lastModifiedBy: user.id, updatedAt: new Date().toISOString() })
    .where(eq(companies.id, id))
    .returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'update',
    entityType: 'company',
    entityId: id,
    changes: JSON.stringify({ old: oldCompany, new: data }),
  });

  if (oldCompany && data.requiresGST !== undefined && data.requiresGST !== oldCompany.requiresGST) {
    const currentYear = new Date().getFullYear();

    if (data.requiresGST) {
      const existingGST = await db.select().from(filings)
        .where(and(
          eq(filings.companyId, id),
          eq(filings.type, 'gst'),
          eq(filings.year, currentYear),
        ));

      if (existingGST.length === 0) {
        const gstDueDate = calculateDueDate(oldCompany.registrationDate, currentYear);
        await db.insert(filings).values({
          companyId: id,
          type: 'gst',
          year: currentYear,
          dueDate: gstDueDate,
          status: 'pending',
          createdBy: user.id,
        });
      }
    } else {
      await db.update(filings)
        .set({ status: 'cancelled' })
        .where(and(
          eq(filings.companyId, id),
          eq(filings.type, 'gst'),
          eq(filings.status, 'pending'),
        ));
    }
  }

  return updated;
}

export async function deleteCompany(id: number) {
  const user = await requireAuth();

  await db.delete(companies).where(eq(companies.id, id));
  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'delete',
    entityType: 'company',
    entityId: id,
  });
}

export async function getCompanies(sortBy: 'registration' | 'filing' = 'registration') {
  const allCompanies = await db.select().from(companies).orderBy(desc(companies.registrationDate));

  if (sortBy === 'filing') {
    const companiesWithFilings = await Promise.all(
      allCompanies.map(async (company) => {
        const nextFiling = await db.select().from(filings)
          .where(and(eq(filings.companyId, company.id), eq(filings.status, 'pending')))
          .orderBy(filings.dueDate)
          .limit(1);
        return { ...company, nextFilingDate: nextFiling[0]?.dueDate || '9999-12-31' };
      }),
    );
    return companiesWithFilings.sort((a, b) => a.nextFilingDate.localeCompare(b.nextFilingDate));
  }

  return allCompanies;
}

export async function getCompanyWithDetails(id: number) {
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  if (!company) return null;

  const companyFilings = await db.select().from(filings)
    .where(eq(filings.companyId, id))
    .orderBy(desc(filings.year));

  const companyDocuments = await db.select().from(documents)
    .where(eq(documents.companyId, id))
    .orderBy(desc(documents.uploadedAt));

  const history = await getFilingHistory(id);

  const lastModifier = company.lastModifiedBy
    ? await db.select().from(users).where(eq(users.id, company.lastModifiedBy)).then((rows) => rows[0])
    : null;

  return {
    ...company,
    filings: companyFilings,
    documents: companyDocuments,
    history,
    lastModifiedByUser: lastModifier?.name,
  };
}

export async function createFiling(data: Omit<NewFiling, 'createdBy'>) {
  const user = await requireAuth();

  const [filing] = await db.insert(filings).values({
    ...data,
    createdBy: user.id,
  }).returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'create',
    entityType: 'filing',
    entityId: filing.id,
    changes: JSON.stringify(data),
  });

  return filing;
}

export async function getFilings() {
  return await db.select().from(filings).orderBy(filings.dueDate);
}

export async function markFilingCompleted(filingId: number) {
  const user = await requireAuth();

  const [filing] = await db.select().from(filings).where(eq(filings.id, filingId));
  if (!filing) throw new Error('申报记录不存在');

  const now = new Date().toISOString();
  await db.update(filings)
    .set({ status: 'filed', filedDate: now })
    .where(eq(filings.id, filingId));

  await db.insert(filingHistory).values({
    companyId: filing.companyId,
    type: filing.type,
    year: filing.year,
    filedDate: now,
    amount: filing.amount || 0,
    notes: filing.notes,
    createdBy: user.id,
  });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'update',
    entityType: 'filing',
    entityId: filingId,
    changes: JSON.stringify({ status: 'filed', filedDate: now }),
  });

  const [company] = await db.select().from(companies).where(eq(companies.id, filing.companyId));
  const nextYear = filing.year + 1;

  const existing = await db.select().from(filings)
    .where(and(
      eq(filings.companyId, filing.companyId),
      eq(filings.type, filing.type),
      eq(filings.year, nextYear),
    ));

  if (company && existing.length === 0) {
    let nextDueDate: string;
    if (filing.type === 'annual_report') {
      const regDate = new Date(company.registrationDate);
      regDate.setFullYear(nextYear);
      nextDueDate = regDate.toISOString().split('T')[0];
    } else {
      nextDueDate = calculateDueDate(company.registrationDate, nextYear);
    }

    if (filing.type !== 'gst' || company.requiresGST) {
      await db.insert(filings).values({
        companyId: filing.companyId,
        type: filing.type,
        year: nextYear,
        dueDate: nextDueDate,
        status: 'pending',
        createdBy: user.id,
      });
    }
  }
}

export async function cancelFiling(filingId: number) {
  const user = await requireAuth();

  await db.update(filings)
    .set({ status: 'cancelled' })
    .where(eq(filings.id, filingId));

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'cancel_filing',
    entityType: 'filing',
    entityId: filingId,
  });
}

export async function restoreFiling(filingId: number) {
  const user = await requireAuth();

  await db.update(filings)
    .set({ status: 'pending' })
    .where(eq(filings.id, filingId));

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'restore_filing',
    entityType: 'filing',
    entityId: filingId,
  });
}

export async function deleteFiling(id: number) {
  const user = await requireAuth();

  await db.delete(filings).where(eq(filings.id, id));
  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'delete',
    entityType: 'filing',
    entityId: id,
  });
}

export async function getFilingHistory(companyId: number) {
  return await db.select()
    .from(filingHistory)
    .where(eq(filingHistory.companyId, companyId))
    .orderBy(desc(filingHistory.year), desc(filingHistory.filedDate));
}

export async function uploadDocument(data: {
  companyId: number;
  filingId?: number;
  name: string;
  type: string;
  fileUrl: string;
  mimeType?: string;
}) {
  const user = await requireAuth();

  const [doc] = await db.insert(documents).values({
    ...data,
    uploadedBy: user.id,
  }).returning();

  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'create',
    entityType: 'document',
    entityId: doc.id,
    changes: JSON.stringify({ companyId: data.companyId, name: data.name, type: data.type }),
  });

  return doc;
}

export async function getDocuments(companyId?: number, filingId?: number) {
  const conditions = [];
  if (companyId) conditions.push(eq(documents.companyId, companyId));
  if (filingId) conditions.push(eq(documents.filingId, filingId));

  const query = conditions.length > 0
    ? db.select().from(documents).where(and(...conditions as [ReturnType<typeof eq>]))
    : db.select().from(documents);

  return await query.orderBy(desc(documents.uploadedAt));
}

export async function deleteDocument(id: number) {
  const user = await requireAuth();

  await db.delete(documents).where(eq(documents.id, id));
  await db.insert(auditLogs).values({
    userId: user.id,
    action: 'delete',
    entityType: 'document',
    entityId: id,
  });
}

export async function getUsers() {
  return await db.select({
    id: users.id,
    username: users.username,
    name: users.name,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users);
}

export async function getAuditLogs(limit = 100) {
  return await db.select({
    id: auditLogs.id,
    userId: auditLogs.userId,
    action: auditLogs.action,
    entityType: auditLogs.entityType,
    entityId: auditLogs.entityId,
    changes: auditLogs.changes,
    timestamp: auditLogs.timestamp,
    username: users.name,
  })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}
