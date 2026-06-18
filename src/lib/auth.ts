'use server';

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { seedDatabase } from '@/db/seed';

const SALT_ROUNDS = 10;
const SESSION_COOKIE = 'userId';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(username: string, password: string) {
  await seedDatabase();

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    return { success: false, message: '用户名或密码错误' };
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return { success: false, message: '用户名或密码错误' };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id.toString(), {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return {
    success: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { success: true };
}

export async function getCurrentUser() {
  await seedDatabase();

  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1);
  if (!user) return null;

  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('未授权，请先登录');
  return user;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const currentUser = await requireCurrentUser();
  const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
  if (!user) throw new Error('用户不存在');

  const valid = await verifyPassword(oldPassword, user.password);
  if (!valid) throw new Error('原密码错误');

  const hashed = await hashPassword(newPassword);
  await db.update(users).set({ password: hashed }).where(eq(users.id, currentUser.id));

  return { success: true };
}
