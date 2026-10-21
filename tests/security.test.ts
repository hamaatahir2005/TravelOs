import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import { can } from '../src/lib/permissions';
import { encrypt, decrypt, sameOrigin } from '../src/lib/security';
import { assertBalanced, D } from '../src/lib/finance';
import { schemas, ticketUpdate } from '../src/lib/validation';
describe('Role authorization', () => {
  it('restricts operational and administrative writes by role', () => {
    expect(can('TICKET_AGENT', 'tickets', true)).toBe(true);
    expect(can('TICKET_AGENT', 'visas', true)).toBe(false);
    expect(can('VISA_OFFICER', 'tickets', true)).toBe(false);
    expect(can('ACCOUNTANT', 'employees', true)).toBe(false);
    expect(can('AGENCY_MANAGER', 'settings', true)).toBe(true);
    expect(can('TICKET_AGENT', 'suppliers', true)).toBe(false);
  });
});
describe('Passport encryption', () => {
  beforeEach(() => {
    process.env.PASSPORT_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  });
  it('round trips with randomized authenticated encryption', () => {
    const a = encrypt('DEMO123456');
    const b = encrypt('DEMO123456');
    expect(a).not.toBe(b);
    expect(a).not.toContain('DEMO123456');
    expect(decrypt(a)).toBe('DEMO123456');
  });
  it('rejects tampering and the wrong key', () => {
    const value = encrypt('DEMO123456').split('.');
    value[1] = Buffer.alloc(16).toString('base64url');
    expect(() => decrypt(value.join('.'))).toThrow();
    const a = encrypt('DEMO123456');
    process.env.PASSPORT_ENCRYPTION_KEY = randomBytes(32).toString('hex');
    expect(() => decrypt(a)).toThrow();
  });
});
describe('Server validation & financial arithmetic', () => {
  it('uses decimal arithmetic for fractional money', () => {
    expect(D('0.1').plus('0.2').toString()).toBe('0.3');
    assertBalanced([
      { debit: '0.30', credit: 0 },
      { debit: 0, credit: '0.30' },
    ]);
  });
  it('rejects unbalanced and negative entries', () => {
    expect(() =>
      assertBalanced([
        { debit: 100, credit: 0 },
        { debit: 0, credit: 99 },
      ]),
    ).toThrow();
    expect(() =>
      assertBalanced([
        { debit: -1, credit: 0 },
        { debit: 0, credit: -1 },
      ]),
    ).toThrow();
  });
  it('rejects negative, excessive precision, and ambiguous currency inputs', () => {
    const base = {
      category: 'Rent',
      description: 'Office',
      currency: 'USD',
      cashAccountId: 'cash',
      date: '2026-10-21',
    };
    for (const amount of ['-1', '12.345', 'NaN', '1e5'])
      expect(schemas.expenses.safeParse({ ...base, amount }).success).toBe(false);
    expect(schemas.expenses.safeParse({ ...base, amount: '100.25' }).success).toBe(true);
  });
  it('strips financial price changes from operational ticket edits', () => {
    expect(
      ticketUpdate.parse({ id: 'ticket', sellingPrice: '1', notes: 'Updated' }),
    ).not.toHaveProperty('sellingPrice');
  });
  it('blocks cross origin and missing origin mutations', () => {
    process.env.APP_URL = 'https://agency.example';
    expect(() =>
      sameOrigin(
        new Request('https://agency.example/api', { headers: { origin: 'https://evil.example' } }),
      ),
    ).toThrow();
    expect(() => sameOrigin(new Request('https://agency.example/api'))).toThrow();
    expect(() =>
      sameOrigin(
        new Request('https://agency.example/api', {
          headers: { origin: 'https://agency.example' },
        }),
      ),
    ).not.toThrow();
    process.env.APP_URL = 'http://localhost:3000';
  });
});

import { csvCell } from '../src/lib/csv';
it('neutralizes spreadsheet formulas in CSV exports', () => {
  expect(csvCell('=HYPERLINK("https://evil.example")')).toMatch(/^"'/);
  expect(csvCell('safe, quoted "data"')).toBe('"safe, quoted ""data"""');
});
