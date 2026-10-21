import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { digest, sessionCookie } from '@/lib/auth';
import { sameOrigin } from '@/lib/security';
import { failure } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const jar = await cookies();
    const token = jar.get(sessionCookie)?.value;
    if (token) await db.session.deleteMany({ where: { id: digest(token) } });
    jar.delete(sessionCookie);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
