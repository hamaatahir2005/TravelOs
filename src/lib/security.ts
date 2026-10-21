import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export function encryptionKey() {
  const value = process.env.PASSPORT_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error('PASSPORT_ENCRYPTION_KEY must be 32 random bytes in hex');
  return Buffer.from(value, 'hex');
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map((x) => x.toString('base64url')).join('.');
}
export function decrypt(value: string) {
  const [iv, tag, bytes] = value.split('.').map((x) => Buffer.from(x, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(bytes), decipher.final()]).toString('utf8');
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configured = process.env.APP_URL;
  const expected = configured ? new URL(configured).origin : new URL(request.url).origin;
  if (!origin || origin !== expected) throw new HttpError(403, 'Invalid request origin');
}
