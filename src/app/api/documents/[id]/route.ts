import { authorize } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const staff = await authorize('dashboard');
    const { id } = await context.params;
    const record = await db.document.findFirst({ where: { id, agencyId: staff.agencyId } });
    if (!record) throw new HttpError(404, 'Document not found');
    await authorize(record.visaId ? 'visas' : record.ticketId ? 'tickets' : 'settings');
    await db.auditLog.create({
      data: {
        agencyId: staff.agencyId,
        actorId: staff.id,
        action: 'DOWNLOAD',
        entity: 'Document',
        entityId: id,
        metadata: {},
      },
    });
    const bytes = Buffer.from(decrypt(Buffer.from(record.encryptedContent).toString()), 'base64');
    return new Response(bytes, {
      headers: {
        'Content-Type': record.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.name)}`,
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
