import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from './security';
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 400 },
    );
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002')
      return NextResponse.json(
        { error: 'A record with that reference already exists' },
        { status: 409 },
      );
    if (error.code === 'P2025' || error.code === 'P2003')
      return NextResponse.json({ error: 'Record not found in your agency' }, { status: 404 });
    if (error.code === 'P2034')
      return NextResponse.json(
        { error: 'Another transaction changed this record. Please try again.' },
        { status: 409 },
      );
  }
  console.error('Travel OS request failed', error instanceof Error ? error.name : 'UnknownError');
  return NextResponse.json(
    { error: 'The request could not be completed. Please contact your administrator.' },
    { status: 500 },
  );
}
