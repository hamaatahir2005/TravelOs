import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { schemas, ticketUpdate, visaUpdate } from './validation';
import { encrypt, HttpError } from './security';
import {
  D,
  round,
  baseBalance,
  rate,
  post,
  audit,
  balance,
  checkCash,
  invoiceOutstanding,
  type Actor,
  type Tx,
} from './finance';
import type { Role } from '@prisma/client';
export type Resource = keyof typeof schemas;
async function parties(tx: Tx, actor: Actor, customerId: string, supplierId: string) {
  if (
    !(await tx.customer.findFirst({ where: { id: customerId, agencyId: actor.agencyId } })) ||
    !(await tx.supplier.findFirst({ where: { id: supplierId, agencyId: actor.agencyId } }))
  )
    throw new HttpError(404, 'Customer or supplier not found');
}
export async function createRecord(
  resource: Resource,
  input: unknown,
  actor: Actor & { role: Role },
) {
  const parsed = schemas[resource].parse(input);
  const passwordHash =
    resource === 'employees'
      ? await hash((parsed as z.infer<typeof schemas.employees>).password, 12)
      : '';
  return db.$transaction(
    async (tx) => {
      const agencyId = actor.agencyId;
      switch (resource) {
        case 'customers': {
          const record = await tx.customer.create({
            data: { ...schemas.customers.parse(input), agencyId },
          });
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'suppliers': {
          const record = await tx.supplier.create({
            data: { ...schemas.suppliers.parse(input), agencyId },
          });
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'tickets':
        case 'visas': {
          const isTicket = resource === 'tickets';
          const shared = isTicket ? schemas.tickets.parse(input) : schemas.visas.parse(input);
          await parties(tx, actor, shared.customerId, shared.supplierId);
          const exchangeRate = await rate(tx, agencyId, shared.currency);
          let id: string;
          let cost: Prisma.Decimal;
          let total: Prisma.Decimal;
          let description: string;
          let dueAt: Date;
          if (isTicket) {
            const data = schemas.tickets.parse(input);
            const record = await tx.ticket.create({
              data: { ...data, agencyId, createdAt: actor.at, exchangeRate },
            });
            id = record.id;
            cost = D(data.purchasePrice);
            total = D(data.sellingPrice).plus(data.serviceFee);
            description = `${data.airline} · ${data.origin} → ${data.destination} · ${data.passengerName}`;
            dueAt = data.departureAt;
          } else {
            const { passportNumber, ...data } = schemas.visas.parse(input);
            const record = await tx.visaApplication.create({
              data: {
                ...data,
                agencyId,
                createdAt: actor.at,
                exchangeRate,
                passportEncrypted: encrypt(passportNumber),
                timeline: {
                  create: { status: 'DRAFT', actorId: actor.id, note: 'Application created' },
                },
              },
            });
            id = record.id;
            cost = D(data.supplierFee).plus(data.governmentFee);
            total = D(data.sellingPrice);
            description = `${data.country} · ${data.visaType} visa`;
            dueAt = data.reminderAt ?? new Date(Date.now() + 14 * 86400000);
          }
          if (total.lte(0)) throw new HttpError(400, 'Selling total must be greater than zero');
          const agency = await tx.agency.update({
            where: { id: agencyId },
            data: { invoiceSequence: { increment: 1 } },
          });
          const invoice = await tx.invoice.create({
            data: {
              agencyId,
              customerId: shared.customerId,
              ...(isTicket ? { ticketId: id } : { visaId: id }),
              number: `${agency.invoicePrefix}-${agency.invoiceSequence}`,
              description,
              total,
              createdAt: actor.at,
              currency: shared.currency,
              exchangeRate,
              dueAt,
            },
          });
          await post(tx, actor, invoice.number, description, shared.currency, exchangeRate, [
            {
              account: 'RECEIVABLE',
              partyId: shared.customerId,
              sourceInvoiceId: invoice.id,
              debit: total,
              credit: 0,
            },
            { account: isTicket ? 'TICKET_REVENUE' : 'VISA_REVENUE', debit: 0, credit: total },
            { account: 'COST_OF_SALES', debit: cost, credit: 0 },
            { account: 'PAYABLE', partyId: shared.supplierId, debit: 0, credit: cost },
          ]);
          await audit(tx, actor, 'CREATE', resource, id);
          return { id, invoiceId: invoice.id };
        }
        case 'payments': {
          const data = schemas.payments.parse(input);
          const amount = D(data.amount);
          if (amount.lte(0)) throw new HttpError(400, 'Payment must be positive');
          await checkCash(
            tx,
            actor,
            data.cashAccountId,
            data.currency,
            data.direction === 'OUT' ? amount : undefined,
          );
          const exchangeRate = await rate(tx, agencyId, data.currency);
          let carrying = D(0);
          let customerId: string | undefined;
          if (data.direction === 'IN') {
            const result = await invoiceOutstanding(tx, agencyId, data.invoiceId!);
            if (result.invoice.currency !== data.currency || amount.gt(result.outstanding))
              throw new HttpError(400, 'Payment exceeds invoice balance or currency differs');
            customerId = result.invoice.customerId;
            carrying = round(
              (
                await baseBalance(
                  tx,
                  agencyId,
                  'RECEIVABLE',
                  result.invoice.customerId,
                  data.currency,
                  result.invoice.id,
                )
              )
                .mul(amount)
                .div(result.outstanding),
            );
          } else {
            if (!(await tx.supplier.findFirst({ where: { agencyId, id: data.supplierId } })))
              throw new HttpError(404, 'Supplier not found');
            const payable = (
              await balance(tx, agencyId, 'PAYABLE', data.supplierId, data.currency)
            ).negated();
            if (amount.gt(payable)) throw new HttpError(400, 'Payment exceeds supplier balance');
            carrying = round(
              (await baseBalance(tx, agencyId, 'PAYABLE', data.supplierId!, data.currency))
                .negated()
                .mul(amount)
                .div(payable),
            );
          }
          const record = await tx.payment.create({
            data: {
              ...data,
              invoiceId: data.direction === 'IN' ? data.invoiceId : undefined,
              supplierId: data.direction === 'OUT' ? data.supplierId : undefined,
              customerId,
              exchangeRate,
              agencyId,
              createdAt: actor.at,
            },
          });
          await post(
            tx,
            actor,
            record.reference,
            'Payment',
            data.currency,
            exchangeRate,
            data.direction === 'IN'
              ? [
                  { account: `CASH:${data.cashAccountId}`, debit: amount, credit: 0 },
                  {
                    account: 'RECEIVABLE',
                    partyId: customerId,
                    sourceInvoiceId: data.invoiceId,
                    debit: 0,
                    credit: amount,
                    baseCredit: carrying,
                  },
                ]
              : [
                  {
                    account: 'PAYABLE',
                    partyId: data.supplierId,
                    debit: amount,
                    credit: 0,
                    baseDebit: carrying,
                  },
                  { account: `CASH:${data.cashAccountId}`, debit: 0, credit: amount },
                ],
            'FX_GAIN_LOSS',
          );
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'expenses': {
          const data = schemas.expenses.parse(input);
          const amount = D(data.amount);
          if (amount.lte(0)) throw new HttpError(400, 'Expense must be positive');
          await checkCash(tx, actor, data.cashAccountId, data.currency, amount);
          const exchangeRate = await rate(tx, agencyId, data.currency);
          const record = await tx.expense.create({
            data: { ...data, agencyId, createdAt: actor.at, exchangeRate },
          });
          await post(tx, actor, record.id, data.description, data.currency, exchangeRate, [
            { account: 'EXPENSE', debit: amount, credit: 0 },
            { account: `CASH:${data.cashAccountId}`, debit: 0, credit: amount },
          ]);
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'refunds': {
          const data = schemas.refunds.parse(input);
          const { invoice, outstanding } = await invoiceOutstanding(tx, agencyId, data.invoiceId);
          const amount = D(data.amount);
          const prior = invoice.refunds.reduce((s, r) => s.plus(r.amount), D(0));
          if (amount.lte(0) || amount.gt(invoice.total.minus(prior)))
            throw new HttpError(400, 'Refund exceeds original sale');
          const credit = Prisma.Decimal.min(amount, Prisma.Decimal.max(0, outstanding));
          const cash = amount.minus(credit);
          if (cash.gt(0)) {
            if (!data.cashAccountId)
              throw new HttpError(400, 'Choose a cash account for the paid portion of the refund');
            await checkCash(tx, actor, data.cashAccountId, invoice.currency, cash);
          }
          const record = await tx.refund.create({
            data: {
              agencyId,
              invoiceId: invoice.id,
              ticketId: invoice.ticketId,
              visaId: invoice.visaId,
              cashAccountId: cash.gt(0) ? data.cashAccountId : undefined,
              amount,
              currency: invoice.currency,
              reason: data.reason,
            },
          });
          const lines = [
            {
              account: 'REFUNDS',
              debit: amount,
              credit: D(0),
              baseDebit: round(amount.div(invoice.exchangeRate)),
              baseCredit: D(0),
            },
            {
              account: 'RECEIVABLE',
              partyId: invoice.customerId,
              sourceInvoiceId: invoice.id,
              debit: D(0),
              credit,
              baseDebit: D(0),
              baseCredit: credit.gt(0)
                ? round(
                    (
                      await baseBalance(
                        tx,
                        agencyId,
                        'RECEIVABLE',
                        invoice.customerId,
                        invoice.currency,
                        invoice.id,
                      )
                    )
                      .mul(credit)
                      .div(outstanding),
                  )
                : D(0),
            },
          ];
          if (cash.gt(0))
            lines.push({
              account: `CASH:${data.cashAccountId}`,
              debit: D(0),
              credit: cash,
              baseDebit: D(0),
              baseCredit: round(cash.div(await rate(tx, agencyId, invoice.currency))),
            });
          await post(
            tx,
            actor,
            record.id,
            data.reason,
            invoice.currency,
            await rate(tx, agencyId, invoice.currency),
            lines,
            'FX_GAIN_LOSS',
          );
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'employees': {
          const { password, ...data } = schemas.employees.parse(input);
          void password;
          if (actor.role !== 'SUPER_ADMIN' && data.role === 'SUPER_ADMIN')
            throw new HttpError(403, 'Only a Super Admin can create another Super Admin');
          const record = await tx.staff.create({
            data: { ...data, email: data.email.toLowerCase(), passwordHash, agencyId },
            select: { id: true, name: true, email: true, role: true, active: true },
          });
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'settings': {
          const data = schemas.settings.parse(input);
          const record = await tx.agency.update({ where: { id: agencyId }, data });
          await audit(tx, actor, 'UPDATE', resource, record.id);
          return record;
        }
        case 'exchangeRates': {
          const data = schemas.exchangeRates.parse(input);
          const record = await tx.exchangeRate.create({ data: { ...data, agencyId } });
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
        case 'cashAccounts': {
          const record = await tx.cashAccount.create({
            data: { ...schemas.cashAccounts.parse(input), agencyId },
          });
          await audit(tx, actor, 'CREATE', resource, record.id);
          return record;
        }
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 },
  );
}
export async function updateRecord(
  resource: string,
  input: unknown,
  actor: Actor & { role: Role },
) {
  return db.$transaction(
    async (tx) => {
      const agencyId = actor.agencyId;
      let id: string;
      if (resource === 'tickets') {
        const { id: recordId, ...data } = ticketUpdate.parse(input);
        id = recordId;
        const existing = await tx.ticket.findUnique({ where: { agencyId_id: { agencyId, id } } });
        if (!existing) throw new HttpError(404, 'Ticket not found');
        if ((data.arrivalAt ?? existing.arrivalAt) <= (data.departureAt ?? existing.departureAt))
          throw new HttpError(400, 'Arrival must follow departure');
        if ((data.origin ?? existing.origin) === (data.destination ?? existing.destination))
          throw new HttpError(400, 'Choose different airports');
        await tx.ticket.update({ where: { agencyId_id: { agencyId, id } }, data });
      } else if (resource === 'visas') {
        const { id: recordId, note, ...data } = visaUpdate.parse(input);
        id = recordId;
        const existing = await tx.visaApplication.findUnique({
          where: { agencyId_id: { agencyId, id } },
        });
        if (!existing) throw new HttpError(404, 'Visa not found');
        await tx.visaApplication.update({
          where: { agencyId_id: { agencyId, id } },
          data: {
            ...data,
            ...(data.status && data.status !== existing.status
              ? { timeline: { create: { status: data.status, note, actorId: actor.id } } }
              : {}),
          },
        });
      } else if (resource === 'customers' || resource === 'suppliers') {
        const raw = z.object({ id: z.string() }).parse(input);
        id = raw.id;
        if (resource === 'customers')
          await tx.customer.update({
            where: { agencyId_id: { agencyId, id } },
            data: schemas.customers.parse(input),
          });
        else
          await tx.supplier.update({
            where: { agencyId_id: { agencyId, id } },
            data: schemas.suppliers.parse(input),
          });
      } else if (resource === 'employees') {
        const data = z
          .object({
            id: z.string(),
            active: z.boolean(),
            role: z.enum([
              'SUPER_ADMIN',
              'AGENCY_MANAGER',
              'TICKET_AGENT',
              'VISA_OFFICER',
              'ACCOUNTANT',
            ]),
          })
          .parse(input);
        id = data.id;
        const existing = await tx.staff.findUnique({ where: { agencyId_id: { agencyId, id } } });
        if (!existing) throw new HttpError(404, 'Employee not found');
        if (id === actor.id) throw new HttpError(400, 'You cannot change your own access');
        if (
          actor.role !== 'SUPER_ADMIN' &&
          (existing.role === 'SUPER_ADMIN' || data.role === 'SUPER_ADMIN')
        )
          throw new HttpError(403, 'Only a Super Admin can change this role');
        await tx.staff.update({
          where: { agencyId_id: { agencyId, id } },
          data: { active: data.active, role: data.role },
        });
        await tx.session.deleteMany({ where: { staffId: id } });
      } else
        throw new HttpError(
          405,
          'Posted financial records are immutable. Create an adjustment or refund.',
        );
      await audit(tx, actor, 'UPDATE', resource, id);
      return { id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
