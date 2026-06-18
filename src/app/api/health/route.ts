import { NextResponse } from 'next/server';
import { seedDatabase } from '@/db/seed';

export async function GET() {
  try {
    await seedDatabase();
    return NextResponse.json({
      ok: true,
      app: 'company-return-alert',
      version: 'api-health-v2',
      databaseUrl: process.env.DATABASE_URL || 'file:db.sqlite',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        app: 'company-return-alert',
        version: 'api-health-v2',
        databaseUrl: process.env.DATABASE_URL || 'file:db.sqlite',
        error: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
