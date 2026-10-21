import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { digest, createSession } from '@/lib/auth';
import { sameOrigin, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({ email: z.email().max(200), password: z.string().min(1).max(128) })
      .parse(await request.json());
    const key = digest(input.email.toLowerCase());
    const limited = await db.$transaction(async (tx) => {
      const attempt = await tx.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1 },
        update: { count: { increment: 1 } },
      });
      if (Date.now() - attempt.windowStart.getTime() > 15 * 60 * 1000) {
        await tx.loginAttempt.update({
          where: { key },
          data: { count: 1, windowStart: new Date() },
        });
        return false;
      }
      return attempt.count > 10;
    });
    if (limited) throw new HttpError(429, 'Too many attempts. Try again in 15 minutes.');
    const staff = await db.staff.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { agency: true },
    });
    const valid = await compare(
      input.password,
      staff?.passwordHash ?? '$2b$12$KIXx7MC4J4w2N7MdDJ9Wgu7qvNgVnPZOgFqtQ7Jk7K/7jTqhpS2l6',
    );
    if (
      !staff ||
      !valid ||
      !staff.active ||
      staff.agency.isDemo !== (process.env.DEMO_MODE === 'true')
    )
      throw new HttpError(401, 'Email or password is incorrect');
    await createSession(staff.id);
    await db.loginAttempt.deleteMany({ where: { key } });
    await db.auditLog.create({
      data: {
        agencyId: staff.agencyId,
        actorId: staff.id,
        action: 'LOGIN',
        entity: 'Staff',
        entityId: staff.id,
        metadata: {},
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
