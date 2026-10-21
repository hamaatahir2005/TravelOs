import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db';
import { HttpError } from './security';
import { can, type Module } from './permissions';
export const sessionCookie =
  process.env.NODE_ENV === 'production' ? '__Host-travel-os' : 'travel-os';
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export async function currentStaff() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: digest(token) },
    include: { staff: { include: { agency: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.staff.active) return null;
  if (session.staff.agency.isDemo !== (process.env.DEMO_MODE === 'true')) return null;
  const { passwordHash: _passwordHash, ...staff } = session.staff;
  void _passwordHash;
  return staff;
}
export async function authorize(module: Module, write = false) {
  const staff = await currentStaff();
  if (!staff) throw new HttpError(401, 'Please sign in');
  if (!can(staff.role, module, write))
    throw new HttpError(403, 'Your role does not have access to this action');
  return staff;
}
export async function createSession(staffId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  await db.session.create({ data: { id: digest(token), staffId, expiresAt } });
  (await cookies()).set(sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
}
