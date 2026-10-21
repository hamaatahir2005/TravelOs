import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { sameOrigin, HttpError } from '@/lib/security';
import { failure } from '@/lib/http';
import { schemas } from '@/lib/validation';
import { createRecord, updateRecord, type Resource } from '@/lib/operations';
import type { Module } from '@/lib/permissions';
const permissions: Record<string, Module> = {
  customers: 'customers',
  suppliers: 'suppliers',
  tickets: 'tickets',
  visas: 'visas',
  payments: 'accounting',
  expenses: 'accounting',
  refunds: 'accounting',
  cashAccounts: 'accounting',
  exchangeRates: 'settings',
  employees: 'employees',
  settings: 'settings',
};
async function mutate(
  request: Request,
  context: { params: Promise<{ resource: string }> },
  update: boolean,
) {
  try {
    sameOrigin(request);
    const { resource } = await context.params;
    if (!(resource in schemas)) throw new HttpError(404, 'Unknown module');
    const staff = await authorize(permissions[resource], true);
    if (Number(request.headers.get('content-length')) > 64000)
      throw new HttpError(413, 'Request too large');
    const input = await request.json();
    return NextResponse.json(
      update
        ? await updateRecord(resource, input, staff)
        : await createRecord(resource as Resource, input, staff),
      { status: update ? 200 : 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
export const POST = (r: Request, c: { params: Promise<{ resource: string }> }) =>
  mutate(r, c, false);
export const PATCH = (r: Request, c: { params: Promise<{ resource: string }> }) =>
  mutate(r, c, true);
