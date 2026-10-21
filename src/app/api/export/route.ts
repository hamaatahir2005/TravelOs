import { authorize } from '@/lib/auth';
import { loadData } from '@/lib/data';
import { failure } from '@/lib/http';
import { csvCell } from '@/lib/csv';

export async function GET(request: Request) {
  try {
    const staff = await authorize('reports');
    const data = await loadData(staff);
    const type = new URL(request.url).searchParams.get('type') ?? 'ledger';
    const rows =
      type === 'expenses'
        ? data.expenses.map((e) => ({
            date: e.date.toISOString(),
            category: e.category,
            description: e.description,
            amount: e.amount.toString(),
            currency: e.currency,
          }))
        : data.ledger.map((e) => ({
            journal: e.journalId,
            account: e.account,
            currency: e.currency,
            debit: e.debit.toString(),
            credit: e.credit.toString(),
            baseDebit: e.baseDebit.toString(),
            baseCredit: e.baseCredit.toString(),
          }));
    const keys = Object.keys(rows[0] ?? { date: '', account: '', amount: '' });
    return new Response(
      '\uFEFF' +
        [
          keys.map(csvCell).join(','),
          ...rows.map((r) => keys.map((k) => csvCell((r as Record<string, unknown>)[k])).join(',')),
        ].join('\r\n'),
      {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="travel-os-${type}.csv"`,
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
