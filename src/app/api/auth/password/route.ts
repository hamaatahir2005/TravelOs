import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authorize, createSession } from '@/lib/auth';
import { sameOrigin, HttpError } from '@/lib/security';
import { audit } from '@/lib/finance';
import { failure } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const staff = await authorize('dashboard');
    const input = z
      .object({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(12).max(128),
      })
      .parse(await request.json());
    const user = await db.staff.findUniqueOrThrow({ where: { id: staff.id } });
    if (!(await compare(input.currentPassword, user.passwordHash)))
      throw new HttpError(400, 'Current password is incorrect');
    const passwordHash = await hash(input.newPassword, 12);
    await db.$transaction(async (tx) => {
      await tx.staff.update({ where: { id: staff.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { staffId: staff.id } });
      await audit(tx, staff, 'CHANGE_PASSWORD', 'Staff', staff.id);
    });
    await createSession(staff.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
