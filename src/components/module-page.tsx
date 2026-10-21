'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Ticket,
  FileCheck2,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Plane,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Printer,
  Users,
  Building2,
  ReceiptText,
  CalendarDays,
  ShieldCheck,
  Globe2,
  Check,
  Upload,
} from 'lucide-react';
import { useApp, money, dateLabel, type AppData } from './workspace';
import { Button } from './ui/button';
import type { Module } from '@/lib/permissions';
export function Status({ value }: { value: string }) {
  const { t } = useApp();
  const lower = value.toLowerCase();
  const tone = ['confirmed', 'approved', 'paid', 'active', 'completed', 'in'].includes(lower)
    ? 'green'
    : ['cancelled', 'rejected', 'unpaid', 'disabled', 'out'].includes(lower)
      ? 'red'
      : ['processing', 'submitted', 'partial'].includes(lower)
        ? 'blue'
        : 'amber';
  return (
    <span className={`status-badge ${tone}`}>
      <span />
      {t(lower) === lower ? value.replaceAll('_', ' ') : t(lower)}
    </span>
  );
}
export function ModulePage({ module }: { module: Module }) {
  const { data, staff, t, open } = useApp();
  if (!data) return null;
  if (!data.permissions[module]?.read)
    return (
      <div className="empty-state">
        <ShieldCheck size={40} />
        <h2>Access restricted</h2>
        <p>Your role does not have permission to view this module.</p>
      </div>
    );
  if (module === 'dashboard') return <Dashboard />;
  if (module === 'reports') return <Reports />;
  if (module === 'settings') return <Settings />;
  return <RecordTable module={module} data={data} staffId={staff.id} t={t} open={open} />;
}
function Kpis() {
  const { data, t } = useApp();
  if (!data) return null;
  const s = data.summary;
  const cards = [
    {
      key: 'ticketSales',
      value: s.ticketSales,
      icon: Ticket,
      color: 'sky',
      caption: `${data.invoices.filter((i) => i.ticketId).length} ticket invoices`,
    },
    {
      key: 'visaSales',
      value: s.visaSales,
      icon: FileCheck2,
      color: 'violet',
      caption: `${data.invoices.filter((i) => i.visaId).length} visa invoices`,
    },
    {
      key: 'grossProfit',
      value: s.grossProfit,
      icon: TrendingUp,
      color: 'teal',
      caption: 'Revenue less costs & refunds',
    },
    {
      key: 'netProfit',
      value: s.netProfit,
      icon: Wallet,
      color: 'navy',
      caption: 'After operating expenses',
    },
  ];
  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="kpi-card" key={c.key}>
          <div className="kpi-top">
            <span>{t(c.key)}</span>
            <span className={`kpi-icon ${c.color}`}>
              <c.icon size={19} />
            </span>
          </div>
          <div className="kpi-value">{money(c.value)}</div>
          <div className="kpi-caption">
            <span className={`tiny-trend ${c.value >= 0 ? 'positive' : 'negative'}`}>
              {c.value >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} USD
            </span>
            <span>{c.caption}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
function RevenueChart({ full = false }: { full?: boolean }) {
  const { data, t } = useApp();
  const [period, setPeriod] = useState('monthly');
  if (!data) return null;
  const groups: Record<
    string,
    { date: string; label: string; sales: number; profit: number; expenses: number }
  > = {};
  for (const row of data.daily) {
    const key =
      period === 'daily'
        ? row.date
        : period === 'yearly'
          ? row.date.slice(0, 4)
          : row.date.slice(0, 7);
    groups[key] ??= {
      date: key,
      label:
        period === 'daily'
          ? new Date(row.date).toLocaleDateString('en', { day: 'numeric', month: 'short' })
          : period === 'yearly'
            ? key
            : new Date(`${key}-01`).toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      sales: 0,
      profit: 0,
      expenses: 0,
    };
    groups[key].sales += row.sales;
    groups[key].profit += row.profit;
    groups[key].expenses += row.expenses;
  }
  const chartData = Object.values(groups).slice(period === 'daily' ? -30 : -12);
  return (
    <section className={`panel revenue-panel ${full ? 'full' : ''}`}>
      <div className="panel-heading">
        <div>
          <h2>{t('revenue')}</h2>
          <p>Sales and profit · USD equivalent</p>
        </div>
        <div className="segmented-control">
          {['daily', 'monthly', 'yearly'].map((p) => (
            <button key={p} className={p === period ? 'selected' : ''} onClick={() => setPeriod(p)}>
              {t(p)}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-meta">
        <div>
          <span className="chart-total">{money(chartData.reduce((s, r) => s + r.sales, 0))}</span>
          <small>Recorded sales</small>
        </div>
        <div className="chart-legend">
          <span>
            <i className="sales-dot" />
            Sales
          </span>
          <span>
            <i className="profit-dot" />
            Net profit
          </span>
        </div>
      </div>
      {chartData.length ? (
        <div className="revenue-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.17} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8b96a9', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8b96a9', fontSize: 11 }}
                tickFormatter={(n) => (n >= 1000 ? `$${n / 1000}k` : `$${n}`)}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  color: 'var(--text)',
                }}
                formatter={(value) => money(value)}
              />
              <Area
                name="Sales"
                type="monotone"
                dataKey="sales"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
              />
              <Area
                name="Net profit"
                type="monotone"
                dataKey="profit"
                stroke="#123C73"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="empty-chart">Your revenue story starts with your first booking.</div>
      )}
    </section>
  );
}
function Dashboard() {
  const { data, t, open } = useApp();
  if (!data) return null;
  const upcoming = data.tickets
    .filter((x) => new Date(x.departureAt) > new Date() && x.status === 'CONFIRMED')
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt))
    .slice(0, 3);
  const totals = data.summary;
  return (
    <>
      <Kpis />
      <div className="dashboard-mid">
        <RevenueChart />
        <section className="panel balance-panel">
          <div className="panel-heading">
            <div>
              <h2>Financial snapshot</h2>
              <p>Keep your cash flow in focus</p>
            </div>
            <span className="subtle">
              <Wallet size={18} />
            </span>
          </div>
          <div className="balance-item">
            <span className="balance-icon amber">
              <Users size={19} />
            </span>
            <span>
              <small>{t('customerDebt')}</small>
              <strong>{money(totals.customerDebt)}</strong>
            </span>
            <ArrowUpRight size={16} />
          </div>
          <div className="balance-item">
            <span className="balance-icon violet">
              <Building2 size={19} />
            </span>
            <span>
              <small>{t('supplierBalances')}</small>
              <strong>{money(totals.supplierBalances)}</strong>
            </span>
            <ArrowUpRight size={16} />
          </div>
          <div className="balance-item">
            <span className="balance-icon rose">
              <Wallet size={19} />
            </span>
            <span>
              <small>{t('expenses')}</small>
              <strong>{money(totals.expenses)}</strong>
            </span>
            <ArrowUpRight size={16} />
          </div>
          <div className="snapshot-note">
            <ShieldCheck size={15} />
            <span>
              Balances from the posted ledger.
              <br />
              All figures shown in USD.
            </span>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('recentTickets')}</h2>
              <p>The latest journeys on your books</p>
            </div>
            <Link
              className="text-link"
              href={data.permissions.tickets.read ? '/tickets' : '/invoices'}
            >
              {t('viewAll')}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Traveler / reference</th>
                  <th>Route</th>
                  <th>{t('date')}</th>
                  <th>{t('total')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.slice(0, 5).map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="clickable"
                    onClick={() => open({ kind: 'tickets', record: ticket, detail: true })}
                  >
                    <td>
                      <div className="cell-person">
                        <span className="table-avatar">
                          {ticket.passengerName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <span>
                          <strong>{ticket.passengerName}</strong>
                          <small>{ticket.pnr}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="route-cell">
                        <strong>{ticket.origin}</strong>
                        <Plane size={13} />
                        <strong>{ticket.destination}</strong>
                      </div>
                      <small className="subtle">{ticket.airline}</small>
                    </td>
                    <td className="date-cell">{dateLabel(ticket.departureAt)}</td>
                    <td className="font-semibold">
                      {money(
                        Number(ticket.sellingPrice) + Number(ticket.serviceFee),
                        ticket.currency,
                      )}
                    </td>
                    <td>
                      <Status value={ticket.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.tickets.length && (
              <div className="empty-table">
                No flight bookings to display. <Link href="/invoices">View recent invoices →</Link>
              </div>
            )}
          </div>
        </section>
        <div className="dashboard-side">
          <section className="panel upcoming-panel">
            <div className="panel-heading">
              <div>
                <h2>{t('upcoming')}</h2>
                <p>A little ahead of every departure</p>
              </div>
              <CalendarDays size={18} className="subtle" />
            </div>
            {upcoming.map((ticket) => (
              <button
                className="upcoming-card"
                key={ticket.id}
                onClick={() => open({ kind: 'tickets', record: ticket, detail: true })}
              >
                <span className="flight-date">
                  <strong>{new Date(ticket.departureAt).getDate()}</strong>
                  <small>
                    {new Date(ticket.departureAt).toLocaleDateString('en', { month: 'short' })}
                  </small>
                </span>
                <span>
                  <strong>
                    {ticket.origin}
                    <span className="route-arrow">→</span>
                    {ticket.destination}
                  </strong>
                  <small>{ticket.passengerName}</small>
                </span>
                <span className="flight-time">
                  {new Date(ticket.departureAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  <small>{ticket.airline}</small>
                </span>
              </button>
            ))}
            {!upcoming.length && (
              <p className="empty-small">You’re all caught up. No upcoming departures.</p>
            )}
          </section>
          <section className="quick-action-card">
            <div className="quick-action-globe">
              <Globe2 size={90} strokeWidth={0.6} />
            </div>
            <span className="quick-kicker">LESS ADMIN. MORE ADVENTURE.</span>
            <h3>
              Ready for the next
              <br />
              great journey?
            </h3>
            <p>Your next booking is a click away.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                open({
                  kind: data.permissions.tickets.write
                    ? 'tickets'
                    : data.permissions.visas.write
                      ? 'visas'
                      : 'expenses',
                })
              }
            >
              <Plus size={15} />
              {t(
                data.permissions.tickets.write
                  ? 'newTicket'
                  : data.permissions.visas.write
                    ? 'newVisa'
                    : 'newExpense',
              )}
              <ArrowUpRight size={14} />
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
type Row = Record<string, unknown>;
type Column = { key: string; label: string; render?: (row: Row) => React.ReactNode };
function RecordTable({
  module,
  data,
  t,
  open,
  staffId,
}: {
  module: Module;
  data: AppData;
  t: (v: string) => string;
  open: (m: { kind: string; record?: Row; detail?: boolean }) => void;
  staffId: string;
}) {
  const { query, setQuery } = useApp();
  const [page, setPage] = useState(0),
    [status, setStatus] = useState('all'),
    [tab, setTab] = useState('payments');
  const kind = module === 'accounting' ? tab : module;
  const source: Record<string, unknown> = {
    ...data,
    accounting: data.payments,
    audit: data.auditLogs,
  };
  const rows = (source[kind] ?? []) as Row[];
  const lookup = (key: string, id: unknown) =>
    (data[key as 'customers' | 'suppliers'] ?? []).find((c) => c.id === id)?.name ?? '—';
  const amount = (r: Row, key = 'amount') => money(r[key], String(r.currency ?? 'USD'));
  const person = (r: Row) => (
    <div className="cell-person">
      <span className="table-avatar">
        {String(r.name ?? '')
          .split(' ')
          .map((s) => s[0])
          .slice(0, 2)
          .join('')}
      </span>
      <span>
        <strong>{String(r.name)}</strong>
        <small>{String(r.email ?? '')}</small>
      </span>
    </div>
  );
  const columns: Record<string, Column[]> = {
    tickets: [
      {
        key: 'passengerName',
        label: 'Passenger',
        render: (r) => (
          <span>
            <strong>{String(r.passengerName)}</strong>
            <small className="block subtle">
              {String(r.pnr)} · {String(r.ticketNumber)}
            </small>
          </span>
        ),
      },
      {
        key: 'origin',
        label: 'Route',
        render: (r) => (
          <div>
            <strong>
              {String(r.origin)} → {String(r.destination)}
            </strong>
            <small className="block subtle">{String(r.airline)}</small>
          </div>
        ),
      },
      { key: 'departureAt', label: 'Departure', render: (r) => dateLabel(r.departureAt) },
      { key: 'supplierId', label: 'Supplier', render: (r) => lookup('suppliers', r.supplierId) },
      {
        key: 'sellingPrice',
        label: 'Total',
        render: (r) => money(Number(r.sellingPrice) + Number(r.serviceFee), String(r.currency)),
      },
      {
        key: 'profit',
        label: 'Profit',
        render: (r) => (
          <span className="positive">
            {money(
              Number(r.sellingPrice) + Number(r.serviceFee) - Number(r.purchasePrice),
              String(r.currency),
            )}
          </span>
        ),
      },
      {
        key: 'paymentStatus',
        label: 'Payment',
        render: (r) => {
          const invoice = data.invoices.find((i) => i.ticketId === r.id);
          return invoice ? (
            <Status
              value={
                Number(invoice.total) - invoice.refunded - invoice.paid <= 0
                  ? 'paid'
                  : invoice.paid > 0
                    ? 'partial'
                    : 'unpaid'
              }
            />
          ) : null;
        },
      },
      { key: 'status', label: 'Status', render: (r) => <Status value={String(r.status)} /> },
    ],
    visas: [
      {
        key: 'customerId',
        label: 'Applicant',
        render: (r) => <strong>{lookup('customers', r.customerId)}</strong>,
      },
      {
        key: 'country',
        label: 'Country / type',
        render: (r) => (
          <span>
            <strong>{String(r.country)}</strong>
            <small className="block subtle">{String(r.visaType)}</small>
          </span>
        ),
      },
      { key: 'applicationDate', label: 'Application', render: (r) => dateLabel(r.applicationDate) },
      {
        key: 'passportExpiry',
        label: 'Passport expiry',
        render: (r) => dateLabel(r.passportExpiry),
      },
      { key: 'sellingPrice', label: 'Selling price', render: (r) => amount(r, 'sellingPrice') },
      { key: 'reminderAt', label: 'Reminder', render: (r) => dateLabel(r.reminderAt) },
      { key: 'status', label: 'Status', render: (r) => <Status value={String(r.status)} /> },
    ],
    customers: [
      { key: 'name', label: 'Customer', render: person },
      { key: 'phone', label: 'Phone' },
      { key: 'nationality', label: 'Nationality' },
      {
        key: 'records',
        label: 'Bookings',
        render: (r) => data.invoices.filter((i) => i.customerId === r.id).length,
      },
      {
        key: 'balance',
        label: 'Outstanding',
        render: (r) => (
          <span>
            {['USD', 'IQD'].map((c) => (
              <small className="block" key={c}>
                {money(data.parties[`RECEIVABLE:${r.id}:${c}`] ?? 0, c)}
              </small>
            ))}
          </span>
        ),
      },
    ],
    suppliers: [
      { key: 'name', label: 'Supplier', render: person },
      { key: 'phone', label: 'Phone' },
      { key: 'notes', label: 'Notes' },
      {
        key: 'balance',
        label: 'Payable',
        render: (r) => (
          <span>
            {['USD', 'IQD'].map((c) => (
              <small className="block" key={c}>
                {money(-(data.parties[`PAYABLE:${r.id}:${c}`] ?? 0), c)}
              </small>
            ))}
          </span>
        ),
      },
    ],
    invoices: [
      {
        key: 'number',
        label: 'Invoice',
        render: (r) => (
          <span>
            <strong>{String(r.number)}</strong>
            <small className="block subtle">{String(r.description)}</small>
          </span>
        ),
      },
      { key: 'customerId', label: 'Customer', render: (r) => lookup('customers', r.customerId) },
      { key: 'createdAt', label: 'Issued', render: (r) => dateLabel(r.createdAt) },
      { key: 'total', label: 'Total', render: (r) => amount(r, 'total') },
      { key: 'paid', label: 'Paid', render: (r) => amount(r, 'paid') },
      {
        key: 'outstanding',
        label: 'Balance',
        render: (r) =>
          money(
            Math.max(0, Number(r.total) - Number(r.paid) - Number(r.refunded)),
            String(r.currency),
          ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (r) => (
          <Status
            value={
              Number(r.total) - Number(r.refunded) - Number(r.paid) <= 0
                ? 'paid'
                : Number(r.paid) > 0
                  ? 'partial'
                  : 'unpaid'
            }
          />
        ),
      },
    ],
    payments: [
      { key: 'createdAt', label: 'Date', render: (r) => dateLabel(r.createdAt) },
      { key: 'reference', label: 'Reference' },
      {
        key: 'direction',
        label: 'Direction',
        render: (r) => <Status value={String(r.direction)} />,
      },
      {
        key: 'party',
        label: 'Customer / supplier',
        render: (r) =>
          lookup(r.customerId ? 'customers' : 'suppliers', r.customerId ?? r.supplierId),
      },
      { key: 'amount', label: 'Amount', render: (r) => amount(r) },
    ],
    expenses: [
      { key: 'date', label: 'Date', render: (r) => dateLabel(r.date) },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount', render: (r) => amount(r) },
    ],
    refunds: [
      { key: 'createdAt', label: 'Date', render: (r) => dateLabel(r.createdAt) },
      {
        key: 'invoiceId',
        label: 'Invoice',
        render: (r) => data.invoices.find((i) => i.id === r.invoiceId)?.number,
      },
      { key: 'reason', label: 'Reason' },
      { key: 'amount', label: 'Refund', render: (r) => amount(r) },
    ],
    cashAccounts: [
      { key: 'name', label: 'Cash account' },
      { key: 'currency', label: 'Currency' },
      { key: 'balance', label: 'Balance', render: (r) => amount(r, 'balance') },
    ],
    ledger: [
      { key: 'journalId', label: 'Journal', render: (r) => String(r.journalId).slice(-10) },
      { key: 'account', label: 'Account' },
      { key: 'currency', label: 'Currency' },
      { key: 'debit', label: 'Debit', render: (r) => amount(r, 'debit') },
      { key: 'credit', label: 'Credit', render: (r) => amount(r, 'credit') },
      { key: 'baseDebit', label: 'USD debit', render: (r) => money(r.baseDebit) },
      { key: 'baseCredit', label: 'USD credit', render: (r) => money(r.baseCredit) },
    ],
    employees: [
      { key: 'name', label: 'Team member', render: person },
      { key: 'role', label: 'Role', render: (r) => String(r.role).replaceAll('_', ' ') },
      {
        key: 'active',
        label: 'Access',
        render: (r) => <Status value={r.active ? 'active' : 'disabled'} />,
      },
      { key: 'createdAt', label: 'Joined', render: (r) => dateLabel(r.createdAt) },
    ],
    audit: [
      {
        key: 'createdAt',
        label: 'Timestamp',
        render: (r) => new Date(String(r.createdAt)).toLocaleString(),
      },
      {
        key: 'action',
        label: 'Action',
        render: (r) => <span className="code-badge">{String(r.action)}</span>,
      },
      { key: 'entity', label: 'Module' },
      { key: 'entityId', label: 'Record ID' },
      {
        key: 'actorId',
        label: 'Staff',
        render: (r) =>
          data.employees.find((e) => e.id === r.actorId)?.name ?? String(r.actorId).slice(-12),
      },
    ],
  };
  const filtered = rows.filter(
    (r) =>
      (!query ||
        `${JSON.stringify(r)} ${lookup('customers', r.customerId)} ${lookup('suppliers', r.supplierId)}`
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (status === 'all' || String(r.status ?? r.direction).toLowerCase() === status.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  const view = filtered.slice(currentPage * 10, currentPage * 10 + 10);
  const cols = columns[kind] ?? [];
  const writable =
    data.permissions[module].write && !['audit', 'ledger', 'invoices'].includes(kind);
  const hasDetails = ['customers', 'tickets', 'visas', 'suppliers', 'invoices'].includes(kind);
  const statuses = [...new Set(rows.map((r) => r.status ?? r.direction).filter(Boolean))];

  return (
    <>
      {module === 'accounting' && (
        <>
          <div className="mini-kpi-grid">
            {data.cashAccounts.map((c) => (
              <div className="panel mini-kpi" key={c.id}>
                <span>
                  <Wallet size={17} />
                  {c.name}
                </span>
                <strong>{money(c.balance, c.currency)}</strong>
              </div>
            ))}
          </div>
          <div className="module-tabs">
            {['payments', 'expenses', 'refunds', 'cashAccounts', 'ledger'].map((x) => (
              <button
                className={tab === x ? 'active' : ''}
                onClick={() => {
                  setTab(x);
                  setPage(0);
                  setQuery('');
                }}
                key={x}
              >
                {t(x)}
              </button>
            ))}
          </div>
        </>
      )}
      <section className="panel records-panel">
        <div className="table-toolbar">
          <div>
            <h2>
              {t(kind)} <span className="count-pill">{rows.length}</span>
            </h2>
            <p>
              {['payments', 'expenses', 'refunds', 'ledger'].includes(kind)
                ? 'Posted records are immutable. Corrections require a new transaction.'
                : 'Your agency records, in one place.'}
            </p>
          </div>
          <div className="toolbar-buttons">
            {module === 'accounting' && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/export?type=${kind === 'expenses' ? 'expenses' : 'ledger'}`}>
                  <Download size={14} />
                  {t('export')}
                </a>
              </Button>
            )}
            {writable && (
              <Button size="sm" onClick={() => open({ kind })}>
                <Plus size={15} />
                {t('add')}
              </Button>
            )}
          </div>
        </div>
        <div className="table-filters">
          <div className="table-search">
            <Search size={16} />
            <input
              aria-label={t('search')}
              placeholder={t('search')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {statuses.length > 0 && (
            <div className="status-filter">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Filter by status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">{t('all')}</option>
                {statuses.map((s) => (
                  <option key={String(s)} value={String(s)}>
                    {String(s).replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key}>{t(c.key) === c.key ? c.label : t(c.key)}</th>
                ))}
                {(hasDetails || module === 'employees') && (
                  <th className="action-col">{t('actions')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {view.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  {cols.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
                  ))}
                  {hasDetails && (
                    <td>
                      <div className="row-actions">
                        {kind === 'invoices' ? (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              aria-label="Print invoice"
                              href={`/print/invoice/${row.id}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Printer size={16} />
                            </a>
                          </Button>
                        ) : (
                          <Button
                            aria-label={t('details')}
                            variant="ghost"
                            size="icon"
                            onClick={() => open({ kind, record: row, detail: true })}
                          >
                            <MoreHorizontal size={18} />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                  {module === 'employees' && (
                    <td>
                      {row.id !== staffId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => open({ kind: 'employees', record: row })}
                        >
                          {t('edit')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!view.length && (
            <div className="empty-state">
              <Search size={32} />
              <h3>{t(query ? 'noResults' : 'noRecords')}</h3>
              <p>{t('emptyHint')}</p>
              {writable && (
                <Button onClick={() => open({ kind })}>
                  <Plus size={15} />
                  {t('add')}
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="table-pagination">
          <span>
            Showing {filtered.length ? currentPage * 10 + 1 : 0}–
            {Math.min((currentPage + 1) * 10, filtered.length)} of {filtered.length} records
          </span>
          <div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={currentPage + 1 >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
function Reports() {
  const { data, t } = useApp();
  if (!data) return null;
  const s = data.summary;
  const totals = data.ledger.reduce(
    (a, e) => ({ debit: a.debit + Number(e.baseDebit), credit: a.credit + Number(e.baseCredit) }),
    { debit: 0, credit: 0 },
  );
  return (
    <>
      <div className="report-toolbar">
        <span className="info-chip">
          <ShieldCheck size={15} /> USD · From immutable ledger records
        </span>
        <div>
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              <Download size={16} />
              {t('export')}
            </a>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={16} />
            {t('print')}
          </Button>
        </div>
      </div>
      <Kpis />
      <RevenueChart full />
      <div className="reports-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Profit & loss</h2>
            <ReceiptText size={18} />
          </div>
          <div className="report-lines">
            {[
              ['Ticket revenue', s.ticketSales],
              ['Visa revenue', s.visaSales],
              ['Refunds', -s.refunds],
              ['Cost of sales', -(s.ticketSales + s.visaSales - s.refunds - s.grossProfit)],
              ['Gross profit', s.grossProfit],
              ['Operating expenses', -s.expenses],
              ['Foreign exchange / rounding', -s.foreignExchange],
              ['Net profit', s.netProfit],
            ].map(([label, value]) => (
              <div key={label} className={String(label).includes('profit') ? 'total-line' : ''}>
                <span>{label}</span>
                <strong>{money(value)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Ledger reconciliation</h2>
            <ShieldCheck size={18} />
          </div>
          <div className="report-lines">
            <div>
              <span>Base currency debits</span>
              <strong>{money(totals.debit)}</strong>
            </div>
            <div>
              <span>Base currency credits</span>
              <strong>{money(totals.credit)}</strong>
            </div>
            <div className="total-line">
              <span>Difference</span>
              <strong>{money(totals.debit - totals.credit)}</strong>
            </div>
            <div
              className={
                Math.abs(totals.debit - totals.credit) < 0.01 ? 'reconciled positive' : 'negative'
              }
            >
              <Check size={17} />
              {Math.abs(totals.debit - totals.credit) < 0.01
                ? 'All posted entries are balanced'
                : 'Ledger requires review'}
            </div>
          </div>
          <div className="report-note">
            Historical exchange rates are captured on each transaction. Supplier settlement uses the
            payment-date rate; FX revaluation requires an accountant’s review.
          </div>
        </section>
      </div>
    </>
  );
}
function Settings() {
  const { staff, t, open, data } = useApp();
  return (
    <div className="settings-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{staff.agency.name}</h2>
            <p>Agency profile & receipt preferences</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => open({ kind: 'settings', record: staff.agency })}
          >
            {t('edit')}
          </Button>
        </div>
        <div className="settings-body">
          <div className="agency-logo-placeholder">
            {staff.agency.logoDocumentId ? (
              <Image src="/api/agency/logo" width={65} height={65} alt="Agency logo" unoptimized />
            ) : (
              <Plane size={32} />
            )}
          </div>
          <div className="settings-details">
            {[
              ['Agency name', staff.agency.name],
              ['Address', staff.agency.address],
              ['Phone', staff.agency.phone],
              ['Email', staff.agency.email],
              ['Default currency', staff.agency.currency],
              ['Invoice prefix', staff.agency.invoicePrefix],
              ['Receipt footer', staff.agency.receiptHeader],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value || '—'}</strong>
              </div>
            ))}
          </div>
          <label className="upload-zone">
            <Upload size={20} />
            <strong>Upload agency logo</strong>
            <span>PNG or JPEG · Maximum 3 MB</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                if (!e.target.files?.[0]) return;
                const body = new FormData();
                body.set('file', e.target.files[0]);
                body.set('kind', 'logo');
                const response = await fetch('/api/documents', { method: 'POST', body });
                const result = await response.json();
                if (!response.ok) alert(result.error);
                else window.location.reload();
              }}
            />
          </label>
        </div>
      </section>
      <div>
        <section className="panel exchange-panel">
          <div className="panel-heading">
            <h2>{t('exchangeRates')}</h2>
            <Button variant="outline" size="sm" onClick={() => open({ kind: 'exchangeRates' })}>
              <Plus size={14} />
              Update
            </Button>
          </div>
          <div className="exchange-rate">
            <span className="currency-icon">$</span>
            <span>
              1 USD <ArrowRight size={16} />
            </span>
            <strong>
              {Number(
                data?.exchangeRates.find((r) => r.currency === 'IQD')?.unitsPerUsd ?? 0,
              ).toLocaleString()}{' '}
              IQD
            </strong>
          </div>
          <p className="report-note">
            Rates apply to new transactions only. Historical rates are preserved.
          </p>
        </section>
        <section className="panel backup-panel">
          <div className="panel-heading">
            <h2>Backup & recovery</h2>
            <ShieldCheck size={18} />
          </div>
          <div className="settings-body">
            <p>
              Enable daily encrypted PostgreSQL backups and point-in-time recovery with your
              database provider.
            </p>
            <ol>
              <li>
                Back up the database with <code>pg_dump</code>.
              </li>
              <li>Keep the passport encryption key in a separate secret vault.</li>
              <li>
                Restore into an isolated database and verify the ledger before switching traffic.
              </li>
            </ol>
            <p className="subtle">
              See DEPLOYMENT.md for exact commands and recovery checks. CSV exports are reports, not
              full backups.
            </p>
          </div>
        </section>
        <div className="mb-5">
          <Button variant="outline" onClick={() => open({ kind: 'password' })}>
            Change your password
          </Button>
        </div>
        <section className="settings-security">
          <ShieldCheck size={23} />
          <div>
            <strong>Protected by design</strong>
            <p>Agency isolation · Encrypted documents · Staff access</p>
          </div>
        </section>
      </div>
    </div>
  );
}
