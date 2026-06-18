
import { NextResponse } from 'next/server';
import { seedDatabase } from '@/db/seed';

export async function GET() {
  try {
    await seedDatabase();
    return NextResponse.json({ success: true, message: '初始化完成' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}