import { redirect, notFound } from 'next/navigation';
import { currentStaff } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { db } from '@/lib/db';
import { readLanguage } from '@/lib/server-language';
import { isLanguage, translate, formatMoney, formatDate, localeFor } from '@/lib/i18n';
import { PrintButton } from '@/components/print-button';
export const dynamic = 'force-dynamic';
export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const staff = await currentStaff();
  if (!staff) redirect('/login');
  if (!can(staff.role, 'invoices')) notFound();
  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: { id, agencyId: staff.agencyId },
    include: {
      customer: true,
      payments: true,
      refunds: true,
      ticket: true,
      visa: { select: { country: true, visaType: true } },
    },
  });
  if (!invoice) notFound();
  const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0),
    refund = invoice.refunds.reduce((s, r) => s + Number(r.amount), 0);
  const lang = await readLanguage(isLanguage(staff.agency.language) ? staff.agency.language : 'en');
  const t = (key: string) => translate(lang, key);
  const money = (v: unknown) => formatMoney(v, invoice.currency, lang);
  return (
    <main className="invoice-print" lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <style>{`body{background:#f8fafc}.invoice-print{max-width:850px;margin:40px auto;padding:55px;background:white;border:1px solid #e6ecf3;border-radius:12px;color:#17263c}.invoice-print header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #123c73;padding-bottom:30px}.invoice-print h1{font-size:27px;font-weight:700}.invoice-print h2{font-size:24px;color:#123c73}.invoice-print p{margin-top:8px;font-size:12px;line-height:1.7;color:#788697}.invoice-print section{margin:30px 0}.invoice-print table{white-space:normal}.invoice-print td{padding:20px 10px}.invoice-total{margin-inline-start:auto;width:280px}.invoice-total div{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #edf0f4}.invoice-print footer{margin-top:50px;border-top:1px solid #e6ecf3;padding-top:20px}.print-action{margin-top:25px}@media(max-width:600px){.invoice-print{margin:10px;padding:24px}.invoice-print header{flex-wrap:wrap}.invoice-print h1{font-size:22px}}@media print{body{background:white}.invoice-print{margin:0;padding:25px;border:0;max-width:none}.print-action{display:none}}`}</style>
      <header>
        <div>
          <h1>{staff.agency.name}</h1>
          <p>
            {staff.agency.address}
            <br />
            {staff.agency.phone}
            <br />
            {staff.agency.email}
          </p>
        </div>
        <div>
          <h2>{t('INVOICE')}</h2>
          <p>
            {invoice.number}
            <br />
            {t('Issued')}: {formatDate(invoice.createdAt, lang)}
            <br />
            {t('Due')}: {formatDate(invoice.dueAt, lang)}
          </p>
        </div>
      </header>
      {staff.agency.isDemo && <p>{t('DEMO · Fictional records · Not a valid travel document')}</p>}
      <section>
        <p>{t('BILL TO')}</p>
        <h3>{invoice.customer.name}</h3>
        <p>
          {invoice.customer.email}
          <br />
          {invoice.customer.phone}
        </p>
      </section>
      <table>
        <thead>
          <tr>
            <th>{t('description')}</th>
            <th>
              {t('amount')} ({invoice.currency})
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {invoice.description}
              {invoice.ticket && (
                <p>
                  {t('pnr')}: <bdi>{invoice.ticket.pnr}</bdi> · {t('ticketNumber')}:{' '}
                  <bdi>{invoice.ticket.ticketNumber}</bdi>
                  <br />
                  {t('departureAt')}: {invoice.ticket.departureAt.toLocaleString(localeFor(lang))}
                </p>
              )}
            </td>
            <td>{money(invoice.total)}</td>
          </tr>
        </tbody>
      </table>
      <section className="invoice-total">
        <div>
          <span>{t('total')}</span>
          <strong>{money(invoice.total)}</strong>
        </div>
        <div>
          <span>{t('Payments received')}</span>
          <strong>{money(paid)}</strong>
        </div>
        <div>
          <span>{t('Refunds / credits')}</span>
          <strong>{money(refund)}</strong>
        </div>
        <div>
          <strong>{t('Amount due')}</strong>
          <strong>{money(Math.max(0, Number(invoice.total) - paid - refund))}</strong>
        </div>
      </section>
      <section>
        <h3>{t('Payment history')}</h3>
        {invoice.payments.map((p) => (
          <p key={p.id}>
            {formatDate(p.createdAt, lang)} · {p.reference} · {money(p.amount)}
          </p>
        ))}
        {!invoice.payments.length && <p>{t('No payments recorded.')}</p>}
      </section>
      <footer>
        <p>{staff.agency.receiptHeader}</p>
        <p>{t('Generated by Travel OS · Private agency record')}</p>
      </footer>
      <PrintButton label={t('print')} />
    </main>
  );
}
