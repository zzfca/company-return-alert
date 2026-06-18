import { db } from '@/db';
import { users, companies } from './schema';
import { hashPassword } from '@/lib/auth';

export async function seedDatabase() {
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
