import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from './security';
import { readLanguage } from './server-language';
import { translate } from './i18n';
import { validationMessage } from './validation-i18n';
export async function failure(error: unknown) {
  const lang = await readLanguage();
  const t = (key: string) => translate(lang, key);
  if (error instanceof HttpError)
    return NextResponse.json({ error: t(error.message) }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json({ error: validationMessage(error, lang) }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: t('A record with that reference already exists') },
        { status: 409 },
      );
    if (error.code === 'P2025' || error.code === 'P2003')
      return NextResponse.json({ error: t('Record not found in your agency') }, { status: 404 });
    if (error.code === 'P2034')
      return NextResponse.json(
        { error: t('Another transaction changed this record. Please try again.') },
        { status: 409 },
      );
  }
  console.error('Travel OS request failed', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json(
    { error: t('The request could not be completed. Please contact your administrator.') },
    { status: 500 },
  );
}
