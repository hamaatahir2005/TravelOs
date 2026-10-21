import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { loadData } from '@/lib/data';
import { failure } from '@/lib/http';
export async function GET() {
  try {
    const staff = await authorize('dashboard');
    return NextResponse.json(await loadData(staff));
  } catch (e) {
    return failure(e);
  }
}
