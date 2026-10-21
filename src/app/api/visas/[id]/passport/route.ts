import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorize } from '@/lib/auth';
import { sameOrigin, decrypt, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const staff = await authorize('visas');
    const { id } = await context.params;
    const record = await db.visaApplication.findFirst({
      where: { id, agencyId: staff.agencyId },
      select: { passportEncrypted: true },
    });
    if (!record) throw new HttpError(404, 'Application not found');
    await db.auditLog.create({
      data: {
        agencyId: staff.agencyId,
        actorId: staff.id,
        action: 'REVEAL_PASSPORT',
        entity: 'VisaApplication',
        entityId: id,
        metadata: {},
      },
    });
    return NextResponse.json(
      { passportNumber: decrypt(record.passportEncrypted) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
