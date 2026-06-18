import { NextResponse } from 'next/server';
import { seedDatabase } from '@/db/seed';
import { login } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 },
      );
    }

    await seedDatabase();
    const result = await login(username, password);
    return NextResponse.json(result, { status: result.success ? 200 : 401 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || '登录失败' },
      { status: 500 },
    );
  }
}
