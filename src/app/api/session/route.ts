import { NextResponse } from 'next/server';
import { currentStaff } from '@/lib/auth';
export async function GET() {
  const staff = await currentStaff();
  return NextResponse.json(
    staff ? { id: staff.id, name: staff.name, role: staff.role, agency: staff.agency } : null,
    { status: staff ? 200 : 401 },
  );
}
