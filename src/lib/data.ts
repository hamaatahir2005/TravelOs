import { db } from './db';
import { can, type Module } from './permissions';
import { Prisma } from '@prisma/client';
import type { Role } from '@prisma/client';
export async function loadData(staff: { agencyId: string; role: Role }) {
  return db.$transaction(
    async (tx) => {
      const agencyId = staff.agencyId;
      const where = { agencyId };
      const [
        customers,
        suppliers,
        tickets,
        visas,
        invoices,
        payments,
        expenses,
        refunds,
        cashAccounts,
        employees,
        exchangeRates,
        auditLogs,
        ledger,
        journals,
      ] = await Promise.all([
        tx.customer.findMany({ where, orderBy: { name: 'asc' } }),
        tx.supplier.findMany({ where, orderBy: { name: 'asc' } }),
        can(staff.role, 'tickets')
          ? tx.ticket.findMany({
              where,
              include: {
                documents: {
                  select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            })
          : [],
        can(staff.role, 'visas')
          ? tx.visaApplication.findMany({
              where,
              select: {
                id: true,
                customerId: true,
                supplierId: true,
                country: true,
                visaType: true,
                passportExpiry: true,
                applicationDate: true,
                submissionDate: true,
                reminderAt: true,
                status: true,
                requiredDocuments: true,
                supplierFee: true,
                governmentFee: true,
                sellingPrice: true,
                currency: true,
                exchangeRate: true,
                notes: true,
                createdAt: true,
                timeline: { orderBy: { createdAt: 'asc' } },
                documents: {
                  select: { id: true, name: true, mimeType: true, size: true, createdAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            })
          : [],
        tx.invoice.findMany({
          where,
          include: { payments: true, refunds: true },
          orderBy: { createdAt: 'desc' },
        }),
        can(staff.role, 'accounting')
          ? tx.payment.findMany({ where, orderBy: { createdAt: 'desc' } })
          : [],
        can(staff.role, 'accounting')
          ? tx.expense.findMany({ where, orderBy: { date: 'desc' } })
          : [],
        can(staff.role, 'accounting')
          ? tx.refund.findMany({ where, orderBy: { createdAt: 'desc' } })
          : [],
        can(staff.role, 'accounting') ? tx.cashAccount.findMany({ where }) : [],
        can(staff.role, 'employees')
          ? tx.staff.findMany({
              where,
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                active: true,
                createdAt: true,
              },
            })
          : [],
        tx.exchangeRate.findMany({ where, orderBy: { effectiveAt: 'desc' } }),
        can(staff.role, 'audit')
          ? tx.auditLog.findMany({ where, take: 500, orderBy: { createdAt: 'desc' } })
          : [],
        tx.ledgerEntry.findMany({ where }),
        tx.journal.findMany({ where, orderBy: { createdAt: 'desc' } }),
      ]);
      const balance = (account: string) =>
        ledger
          .filter((e) => e.account === account)
          .reduce((s, e) => s + Number(e.baseDebit) - Number(e.baseCredit), 0);
      const ticketSales = -balance('TICKET_REVENUE'),
        visaSales = -balance('VISA_REVENUE'),
        costs = balance('COST_OF_SALES'),
        expenseTotal = balance('EXPENSE'),
        refundTotal = balance('REFUNDS'),
        fx = balance('FX_GAIN_LOSS') + balance('FX_ROUNDING');
      const journalDate = new Map(journals.map((j) => [j.id, j.createdAt]));
      const daily: Record<
        string,
        { date: string; sales: number; profit: number; expenses: number }
      > = {};
      for (const e of ledger) {
        const date = journalDate.get(e.journalId)?.toISOString().slice(0, 10);
        if (!date) continue;
        daily[date] ??= { date, sales: 0, profit: 0, expenses: 0 };
        const n = Number(e.baseCredit) - Number(e.baseDebit);
        if (['TICKET_REVENUE', 'VISA_REVENUE', 'REFUNDS'].includes(e.account)) {
          daily[date].sales += n;
          daily[date].profit += n;
        }
        if (['COST_OF_SALES', 'EXPENSE', 'FX_GAIN_LOSS', 'FX_ROUNDING'].includes(e.account))
          daily[date].profit += n;
        if (e.account === 'EXPENSE') daily[date].expenses -= n;
      }
      const parties = ledger
        .filter((e) => ['RECEIVABLE', 'PAYABLE'].includes(e.account))
        .reduce(
          (map, e) => {
            const key = `${e.account}:${e.partyId}:${e.currency}`;
            map[key] = (map[key] ?? 0) + Number(e.debit) - Number(e.credit);
            return map;
          },
          {} as Record<string, number>,
        );
      const cashBalances = cashAccounts.map((c) => ({
        ...c,
        balance: ledger
          .filter((l) => l.account === `CASH:${c.id}`)
          .reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0),
      }));
      return {
        customers,
        suppliers,
        tickets,
        visas,
        invoices: invoices.map((i) => ({
          ...i,
          paid: i.payments.reduce((s, p) => s + Number(p.amount), 0),
          refunded: i.refunds.reduce((s, r) => s + Number(r.amount), 0),
        })),
        payments,
        expenses,
        refunds,
        cashAccounts: cashBalances,
        employees,
        exchangeRates,
        auditLogs,
        journals: can(staff.role, 'accounting') ? journals : [],
        ledger: can(staff.role, 'accounting') ? ledger : [],
        parties,
        summary: {
          ticketSales,
          visaSales,
          grossProfit: ticketSales + visaSales - costs - refundTotal,
          expenses: expenseTotal,
          netProfit: ticketSales + visaSales - costs - refundTotal - expenseTotal - fx,
          foreignExchange: fx,
          customerDebt: balance('RECEIVABLE'),
          supplierBalances: -balance('PAYABLE'),
          refunds: refundTotal,
        },
        daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
        permissions: Object.fromEntries(
          (
            [
              'dashboard',
              'customers',
              'tickets',
              'visas',
              'suppliers',
              'accounting',
              'invoices',
              'reports',
              'employees',
              'settings',
              'audit',
            ] as Module[]
          ).map((m) => [m, { read: can(staff.role, m), write: can(staff.role, m, true) }]),
        ),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 },
  );
}
