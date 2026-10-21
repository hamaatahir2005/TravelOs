import { Prisma, type Currency } from '@prisma/client';
import { HttpError } from './security';
export const D = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
export const round = (value: Prisma.Decimal.Value) => D(value).toDecimalPlaces(2);
export function assertBalanced(
  lines: { debit: Prisma.Decimal.Value; credit: Prisma.Decimal.Value }[],
) {
  const debit = lines.reduce((v, l) => v.plus(l.debit), D(0));
  const credit = lines.reduce((v, l) => v.plus(l.credit), D(0));
  if (
    lines.length < 2 ||
    !debit.equals(credit) ||
    lines.some(
      (l) =>
        D(l.debit).isNegative() ||
        D(l.credit).isNegative() ||
        (D(l.debit).gt(0) && D(l.credit).gt(0)),
    )
  )
    throw new HttpError(400, 'Journal is not balanced');
}
export type Tx = Prisma.TransactionClient;
export type Actor = { agencyId: string; id: string; at?: Date };
export async function audit(
  tx: Tx,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) {
  return tx.auditLog.create({
    data: { agencyId: actor.agencyId, actorId: actor.id, action, entity, entityId, metadata },
  });
}
export async function rate(tx: Tx, agencyId: string, currency: Currency) {
  if (currency === 'USD') return D(1);
  const entry = await tx.exchangeRate.findFirst({
    where: { agencyId, currency, effectiveAt: { lte: new Date() } },
    orderBy: { effectiveAt: 'desc' },
  });
  if (!entry) throw new HttpError(400, 'Configure an exchange rate first');
  return entry.unitsPerUsd;
}
export async function post(
  tx: Tx,
  actor: Actor,
  reference: string,
  description: string,
  currency: Currency,
  exchangeRate: Prisma.Decimal,
  lines: {
    account: string;
    partyId?: string;
    sourceInvoiceId?: string;
    baseDebit?: Prisma.Decimal.Value;
    baseCredit?: Prisma.Decimal.Value;
    debit: Prisma.Decimal.Value;
    credit: Prisma.Decimal.Value;
  }[],
  adjustmentAccount = 'FX_ROUNDING',
) {
  assertBalanced(lines);
  const base = lines.map((l) => ({
    ...l,
    baseDebit: l.baseDebit !== undefined ? round(l.baseDebit) : round(D(l.debit).div(exchangeRate)),
    baseCredit:
      l.baseCredit !== undefined ? round(l.baseCredit) : round(D(l.credit).div(exchangeRate)),
  }));
  const delta = base.reduce((v, l) => v.plus(l.baseDebit).minus(l.baseCredit), D(0));
  if (!delta.isZero())
    base.push({
      account: adjustmentAccount,
      debit: D(0),
      credit: D(0),
      baseDebit: delta.lt(0) ? delta.abs() : D(0),
      baseCredit: delta.gt(0) ? delta : D(0),
    });
  const journal = await tx.journal.create({
    data: {
      agencyId: actor.agencyId,
      actorId: actor.id,
      reference,
      description,
      createdAt: actor.at,
      entries: { create: base.map((l) => ({ ...l, currency, exchangeRate })) },
    },
  });
  await audit(tx, actor, 'POST', 'Journal', journal.id, { reference });
  return journal;
}
export async function balance(
  tx: Tx,
  agencyId: string,
  account: string,
  partyId?: string,
  currency?: Currency,
) {
  const sum = await tx.ledgerEntry.aggregate({
    where: { agencyId, account, partyId, currency },
    _sum: { debit: true, credit: true },
  });
  return D(sum._sum.debit ?? 0).minus(sum._sum.credit ?? 0);
}
export async function checkCash(
  tx: Tx,
  actor: Actor,
  id: string,
  currency: Currency,
  amount?: Prisma.Decimal,
) {
  const cash = await tx.cashAccount.findFirst({
    where: { id, agencyId: actor.agencyId, currency },
  });
  if (!cash) throw new HttpError(400, 'Select a cash account in the transaction currency');
  if (amount && (await balance(tx, actor.agencyId, `CASH:${id}`, undefined, currency)).lt(amount))
    throw new HttpError(400, 'Insufficient cash account balance');
  return cash;
}
export async function invoiceOutstanding(tx: Tx, agencyId: string, id: string) {
  const invoice = await tx.invoice.findFirst({
    where: { id, agencyId },
    include: { payments: true, refunds: true },
  });
  if (!invoice) throw new HttpError(404, 'Invoice not found');
  return {
    invoice,
    outstanding: invoice.total
      .minus(invoice.payments.reduce((s, p) => s.plus(p.amount), D(0)))
      .minus(invoice.refunds.reduce((s, p) => s.plus(p.amount), D(0)))
      .toDecimalPlaces(2),
  };
}

export async function baseBalance(
  tx: Tx,
  agencyId: string,
  account: string,
  partyId: string,
  currency: Currency,
  sourceInvoiceId?: string,
) {
  const sums = await tx.ledgerEntry.aggregate({
    where: { agencyId, account, partyId, currency, sourceInvoiceId },
    _sum: { baseDebit: true, baseCredit: true },
  });
  return D(sums._sum.baseDebit ?? 0).minus(sums._sum.baseCredit ?? 0);
}
