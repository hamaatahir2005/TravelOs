import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'node:crypto';
import { authorize } from '@/lib/auth';
import { db } from '@/lib/db';
import { sameOrigin, encrypt, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
import { audit } from '@/lib/finance';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (Number(request.headers.get('content-length')) > 3500000)
      throw new HttpError(413, 'Maximum upload size is 3 MB');
    const form = await request.formData();
    const kind = String(form.get('kind'));
    const entityId = String(form.get('entityId') ?? '');
    const staff = await authorize(
      kind === 'visa' ? 'visas' : kind === 'ticket' ? 'tickets' : 'settings',
      true,
    );
    if (!['visa', 'ticket', 'logo'].includes(kind))
      throw new HttpError(400, 'Invalid document type');
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 3 * 1024 * 1024 || file.size === 0)
      throw new HttpError(400, 'Choose a PDF, JPEG, or PNG up to 3 MB');
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          ? 'image/jpeg'
          : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? 'image/png'
            : null;
    if (!mime || (kind === 'logo' && mime === 'application/pdf'))
      throw new HttpError(400, 'Unsupported file content');
    const result = await db.$transaction(async (tx) => {
      if (
        kind === 'visa' &&
        !(await tx.visaApplication.findFirst({ where: { id: entityId, agencyId: staff.agencyId } }))
      )
        throw new HttpError(404, 'Visa not found');
      if (
        kind === 'ticket' &&
        !(await tx.ticket.findFirst({ where: { id: entityId, agencyId: staff.agencyId } }))
      )
        throw new HttpError(404, 'Ticket not found');
      const record = await tx.document.create({
        data: {
          agencyId: staff.agencyId,
          ticketId: kind === 'ticket' ? entityId : undefined,
          visaId: kind === 'visa' ? entityId : undefined,
          name: file.name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 150),
          mimeType: mime,
          size: file.size,
          storageKey: randomUUID(),
          sha256: createHash('sha256').update(bytes).digest('hex'),
          encryptedContent: Buffer.from(encrypt(bytes.toString('base64'))),
        },
        select: { id: true, name: true },
      });
      if (kind === 'logo')
        await tx.agency.update({
          where: { id: staff.agencyId },
          data: { logoDocumentId: record.id },
        });
      await audit(tx, staff, 'UPLOAD', 'Document', record.id, { kind });
      return record;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
