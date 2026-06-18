'use server';

import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(username: string, password: string) {
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (result.length === 0) {
    return { success: false, message: '用户名或密码错误' };
  }

  const user = result[0];
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return { success: false, message: '用户名或密码错误' };
  }

  const cookieStore = await cookies();
  cookieStore.set('userId', user.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return {
    success: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('userId');
  return { success: true };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) return null;

  const result = await db.select().from(users).where(eq(users.id, parseInt(userId))).limit(1);
  if (result.length === 0) return null;

  const user = result[0];
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('未授权');

  const result = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
  if (result.length === 0) throw new Error('用户不存在');

  const valid = await verifyPassword(oldPassword, result[0].password);
  if (!valid) throw new Error('原密码错误');

  const hashed = await hashPassword(newPassword);
  await db.update(users).set({ password: hashed }).where(eq(users.id, currentUser.id));

  return { success: true };
}
