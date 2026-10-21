import { authorize } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
export async function GET() {
  try {
    const staff = await authorize('dashboard');
    if (!staff.agency.logoDocumentId) throw new HttpError(404, 'No agency logo');
    const logo = await db.document.findFirst({
      where: { id: staff.agency.logoDocumentId, agencyId: staff.agencyId },
    });
    if (!logo || !['image/png', 'image/jpeg'].includes(logo.mimeType))
      throw new HttpError(404, 'No agency logo');
    return new Response(
      Buffer.from(decrypt(Buffer.from(logo.encryptedContent).toString()), 'base64'),
      { headers: { 'Content-Type': logo.mimeType, 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
