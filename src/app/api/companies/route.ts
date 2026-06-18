import { NextResponse } from 'next/server';
import { createCompany } from '@/app/actions';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const company = await createCompany(data);
    return NextResponse.json({ success: true, company });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
