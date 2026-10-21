import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { db } from '../src/lib/db';
import { createRecord, updateRecord } from '../src/lib/operations';
import { D, post, balance } from '../src/lib/finance';
const suite = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;
suite('PostgreSQL financial workflows and tenant boundaries', () => {
  let actor: { id: string; agencyId: string; role: 'SUPER_ADMIN' };
  let customerId: string;
  let supplierId: string;
  let cashId: string;
  let invoiceId: string;
  let foreignCustomerId: string;
  beforeAll(async () => {
    process.env.PASSPORT_ENCRYPTION_KEY = randomBytes(32).toString('hex');
    const agency = await db.agency.create({
      data: { name: 'Integration Test Agency', isDemo: true },
    });
    actor = { id: 'integration-test', agencyId: agency.id, role: 'SUPER_ADMIN' };
    const foreignAgency = await db.agency.create({
      data: { name: 'Foreign test agency', isDemo: true },
    });
    const customer = await db.customer.create({
      data: { agencyId: agency.id, name: 'Test traveler', phone: '0000' },
    });
    customerId = customer.id;
    foreignCustomerId = (
      await db.customer.create({
        data: { agencyId: foreignAgency.id, name: 'Foreign traveler', phone: '0000' },
      })
    ).id;
    supplierId = (
      await db.supplier.create({ data: { agencyId: agency.id, name: 'Test supplier' } })
    ).id;
    cashId = (
      await db.cashAccount.create({
        data: { agencyId: agency.id, name: 'USD cash', currency: 'USD' },
      })
    ).id;
    await db.$transaction((tx) =>
      post(tx, actor, 'OPEN', 'Opening balance', 'USD', D(1), [
        { account: `CASH:${cashId}`, debit: 1000, credit: 0 },
        { account: 'OPENING_EQUITY', debit: 0, credit: 1000 },
      ]),
    );
  });
  afterAll(() => db.$disconnect());
  const ticket = () => ({
    customerId,
    supplierId,
    passengerName: 'Test traveler',
    airline: 'Test Air',
    origin: 'EBL',
    destination: 'IST',
    departureAt: '2026-11-01T10:00:00Z',
    arrivalAt: '2026-11-01T13:00:00Z',
    pnr: 'ABC123',
    ticketNumber: `TEST-${randomBytes(5).toString('hex')}`,
    purchasePrice: '300',
    sellingPrice: '450',
    serviceFee: '50',
    currency: 'USD',
  });
  it('creates a ticket, invoice and balanced sale/cost postings atomically', async () => {
    const result = (await createRecord('tickets', ticket(), actor)) as {
      id: string;
      invoiceId: string;
    };
    invoiceId = result.invoiceId;
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.total.toString()).toBe('500');
    expect((await balance(db, actor.agencyId, 'RECEIVABLE', customerId, 'USD')).toString()).toBe(
      '500',
    );
    expect((await balance(db, actor.agencyId, 'PAYABLE', supplierId, 'USD')).toString()).toBe(
      '-300',
    );
  });
  it('prevents cross-agency customer references in operations and foreign keys', async () => {
    await expect(
      createRecord('tickets', { ...ticket(), customerId: foreignCustomerId }, actor),
    ).rejects.toThrow('not found');
    await expect(
      db.invoice.create({
        data: {
          agencyId: actor.agencyId,
          customerId: foreignCustomerId,
          number: 'ILLEGAL',
          description: 'Test',
          total: 100,
          currency: 'USD',
          exchangeRate: 1,
          dueAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
  it('does not allow overpayment and keeps receivables consistent', async () => {
    await expect(
      createRecord(
        'payments',
        {
          invoiceId,
          cashAccountId: cashId,
          amount: '501',
          currency: 'USD',
          reference: 'OVER',
          direction: 'IN',
        },
        actor,
      ),
    ).rejects.toThrow('exceeds');
    await createRecord(
      'payments',
      {
        invoiceId,
        cashAccountId: cashId,
        amount: '400',
        currency: 'USD',
        reference: 'RECEIPT-1',
        direction: 'IN',
      },
      actor,
    );
    expect((await balance(db, actor.agencyId, 'RECEIVABLE', customerId, 'USD')).toString()).toBe(
      '100',
    );
  });
  it('refunds the unpaid portion to AR and the paid portion to cash', async () => {
    await createRecord(
      'refunds',
      { invoiceId, amount: '200', reason: 'Test partial refund', cashAccountId: cashId },
      actor,
    );
    expect((await balance(db, actor.agencyId, 'RECEIVABLE', customerId, 'USD')).toString()).toBe(
      '0',
    );
    expect((await balance(db, actor.agencyId, `CASH:${cashId}`, undefined, 'USD')).toString()).toBe(
      '1300',
    );
    await expect(
      createRecord(
        'refunds',
        { invoiceId, amount: '301', reason: 'Invalid refund', cashAccountId: cashId },
        actor,
      ),
    ).rejects.toThrow('exceeds');
  });
  it('rejects outgoing cash above the available balance', async () => {
    await expect(
      createRecord(
        'expenses',
        {
          cashAccountId: cashId,
          amount: '9999',
          currency: 'USD',
          category: 'Office',
          description: 'Invalid',
          date: new Date(),
        },
        actor,
      ),
    ).rejects.toThrow('Insufficient');
  });
  it('makes posted invoices, ledger entries and audit logs immutable in PostgreSQL', async () => {
    await expect(
      db.invoice.update({ where: { id: invoiceId }, data: { total: 1 } }),
    ).rejects.toThrow('immutable');
    const entry = await db.ledgerEntry.findFirstOrThrow({ where: { agencyId: actor.agencyId } });
    await expect(db.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow('immutable');
    const audit = await db.auditLog.findFirstOrThrow({ where: { agencyId: actor.agencyId } });
    await expect(db.auditLog.delete({ where: { id: audit.id } })).rejects.toThrow('immutable');
  });
  it('rejects direct unbalanced journal insertion at commit', async () => {
    await expect(
      db.journal.create({
        data: {
          agencyId: actor.agencyId,
          actorId: actor.id,
          reference: 'INVALID',
          description: 'Unbalanced',
          entries: {
            create: [
              {
                account: 'CASH',
                currency: 'USD',
                exchangeRate: 1,
                debit: 10,
                credit: 0,
                baseDebit: 10,
                baseCredit: 0,
              },
              {
                account: 'SALES',
                currency: 'USD',
                exchangeRate: 1,
                debit: 0,
                credit: 5,
                baseDebit: 0,
                baseCredit: 5,
              },
            ],
          },
        },
      }),
    ).rejects.toThrow('Unbalanced');
  });
  it('encrypts stored passport data and records status history', async () => {
    const visa = (await createRecord(
      'visas',
      {
        customerId,
        supplierId,
        country: 'Türkiye',
        visaType: 'Tourist',
        passportNumber: 'DEMO-P12345',
        passportExpiry: '2030-01-01',
        applicationDate: new Date(),
        supplierFee: '50',
        governmentFee: '10',
        sellingPrice: '100',
        currency: 'USD',
      },
      actor,
    )) as { id: string };
    const row = await db.visaApplication.findUniqueOrThrow({ where: { id: visa.id } });
    expect(row.passportEncrypted).not.toContain('DEMO-P12345');
    await updateRecord(
      'visas',
      { id: visa.id, status: 'SUBMITTED', note: 'Submitted in test' },
      actor,
    );
    expect(await db.visaStatusEvent.count({ where: { visaId: visa.id } })).toBe(2);
  });
  it('limits concurrent payments with serializable transactions', async () => {
    const sale = (await createRecord('tickets', ticket(), actor)) as { invoiceId: string };
    const results = await Promise.allSettled(
      [1, 2].map((n) =>
        createRecord(
          'payments',
          {
            invoiceId: sale.invoiceId,
            cashAccountId: cashId,
            amount: '400',
            currency: 'USD',
            reference: `RACE-${n}`,
            direction: 'IN',
          },
          actor,
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const payments = await db.payment.aggregate({
      where: { invoiceId: sale.invoiceId },
      _sum: { amount: true },
    });
    expect(payments._sum.amount?.toString()).toBe('400');
  });
});

const fxSuite = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;
fxSuite('IQD exchange-rate settlement', () => {
  it('clears receivables at carrying value and posts realized FX', async () => {
    const agency = await db.agency.create({ data: { name: 'IQD test agency', isDemo: true } });
    const actor = { agencyId: agency.id, id: 'fx-test', role: 'SUPER_ADMIN' as const };
    const customer = await db.customer.create({
      data: { agencyId: agency.id, name: 'FX customer', phone: '000' },
    });
    const supplier = await db.supplier.create({
      data: { agencyId: agency.id, name: 'FX supplier' },
    });
    const cash = await db.cashAccount.create({
      data: { agencyId: agency.id, name: 'IQD account', currency: 'IQD' },
    });
    await db.exchangeRate.create({
      data: {
        agencyId: agency.id,
        currency: 'IQD',
        unitsPerUsd: 1000,
        effectiveAt: new Date(Date.now() - 60000),
      },
    });
    const sale = (await createRecord(
      'tickets',
      {
        customerId: customer.id,
        supplierId: supplier.id,
        passengerName: 'FX Customer',
        airline: 'FX Air',
        origin: 'EBL',
        destination: 'IST',
        departureAt: '2026-12-01T10:00:00Z',
        arrivalAt: '2026-12-01T13:00:00Z',
        pnr: 'FX1234',
        ticketNumber: `FX-${agency.id}`,
        purchasePrice: '50000',
        sellingPrice: '100000',
        serviceFee: '0',
        currency: 'IQD',
      },
      actor,
    )) as { invoiceId: string };
    await db.exchangeRate.create({
      data: { agencyId: agency.id, currency: 'IQD', unitsPerUsd: 1250 },
    });
    await createRecord(
      'payments',
      {
        invoiceId: sale.invoiceId,
        cashAccountId: cash.id,
        amount: '100000',
        currency: 'IQD',
        reference: 'FX-RECEIPT',
        direction: 'IN',
      },
      actor,
    );
    const ar = await db.ledgerEntry.aggregate({
      where: { agencyId: agency.id, account: 'RECEIVABLE' },
      _sum: { baseDebit: true, baseCredit: true },
    });
    expect(
      D(ar._sum.baseDebit ?? 0)
        .minus(ar._sum.baseCredit ?? 0)
        .toString(),
    ).toBe('0');
    const fx = await db.ledgerEntry.aggregate({
      where: { agencyId: agency.id, account: 'FX_GAIN_LOSS' },
      _sum: { baseDebit: true, baseCredit: true },
    });
    expect(
      D(fx._sum.baseDebit ?? 0)
        .minus(fx._sum.baseCredit ?? 0)
        .toString(),
    ).toBe('20');
    await createRecord(
      'payments',
      {
        supplierId: supplier.id,
        cashAccountId: cash.id,
        amount: '50000',
        currency: 'IQD',
        reference: 'FX-SUPPLIER',
        direction: 'OUT',
      },
      actor,
    );
    const ap = await db.ledgerEntry.aggregate({
      where: { agencyId: agency.id, account: 'PAYABLE' },
      _sum: { baseDebit: true, baseCredit: true },
    });
    expect(
      D(ap._sum.baseDebit ?? 0)
        .minus(ap._sum.baseCredit ?? 0)
        .toString(),
    ).toBe('0');
  });
});
