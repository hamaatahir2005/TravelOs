'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plane,
  LayoutDashboard,
  Ticket,
  FileCheck2,
  Users,
  Wallet,
  Building2,
  ReceiptText,
  ChartNoAxesCombined,
  Settings2,
  ShieldCheck,
  Search,
  Bell,
  Plus,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import type { Prisma, Role } from '@prisma/client';
import type { loadData } from '@/lib/data';
import { can, type Module } from '@/lib/permissions';
import {
  translate,
  formatMoney,
  formatDate,
  formatCalendar,
  isLanguage,
  type Language,
  type TranslationValues,
} from '@/lib/i18n';
import { useLanguage } from '@/hooks/use-language';
import { Button } from './ui/button';
import { RecordModal } from './record-modal';
type Serialized<T> = T extends Prisma.Decimal
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? {
            [K in keyof T]: Serialized<T[K]>;
          }
        : T;
export type AppData = Serialized<Awaited<ReturnType<typeof loadData>>>;
export type Agency = {
  id: string;
  name: string;
  isDemo: boolean;
  address: string;
  phone: string;
  email: string;
  receiptHeader: string;
  invoicePrefix: string;
  currency: 'USD' | 'IQD';
  language: string;
  logoDocumentId: string | null;
};
export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  agency: Agency;
};
export type Modal = {
  kind: string;
  record?: Record<string, unknown>;
  detail?: boolean;
};
type Context = {
  staff: Staff;
  data: AppData | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  lang: Language;
  t: (key: string, values?: TranslationValues) => string;
  money: (value: unknown, currency?: string) => string;
  dateLabel: (value: unknown) => string;
  query: string;
  setQuery: (v: string) => void;
  open: (m: Modal) => void;
  notify: (s: string) => void;
  setLang: (s: Language) => void;
};
const AppContext = createContext<Context | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('Missing workspace provider');
  return value;
}
export const navItems = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'tickets', icon: Ticket },
  { key: 'visas', icon: FileCheck2 },
  { key: 'customers', icon: Users },
  { key: 'accounting', icon: Wallet },
  { key: 'suppliers', icon: Building2 },
  { key: 'invoices', icon: ReceiptText },
  { key: 'reports', icon: ChartNoAxesCombined },
  { key: 'employees', icon: ShieldCheck },
  { key: 'settings', icon: Settings2 },
  { key: 'audit', icon: ShieldCheck },
] as const;
export function Workspace({
  staff,
  children,
  initialLanguage,
}: {
  staff: Staff;
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = pathname.split('/')[1] || 'dashboard';
  const [lang, setLang] = useLanguage(
    initialLanguage ?? (isLanguage(staff.agency.language) ? staff.agency.language : 'en'),
  );
  const [data, setData] = useState<AppData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [dark, setDark] = useState(false),
    [query, setQuery] = useState(''),
    [mobile, setMobile] = useState(false),
    [modal, setModal] = useState<Modal | null>(null),
    [toast, setToast] = useState(''),
    [notifications, setNotifications] = useState(false),
    [createMenu, setCreateMenu] = useState(false);
  const refresh = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/data', { cache: 'no-store' });
      if (response.status === 401) {
        router.push('/login');
        router.refresh();
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load workspace');
    } finally {
      setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    const storedDark = localStorage.getItem('travel-os-theme') === 'dark';
    const init = setTimeout(() => {
      void refresh();
      if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
      setDark(storedDark);
    }, 0);
    return () => clearTimeout(init);
  }, [refresh]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('travel-os-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timeout);
    }
  }, [toast]);
  const t = (key: string, values?: TranslationValues) => translate(lang, key, values);
  const money = (value: unknown, currency = 'USD') => formatMoney(value, currency, lang);
  const dateLabel = (value: unknown) => formatDate(value, lang);
  const reminders = [
    ...(data?.tickets ?? [])
      .filter((x) => new Date(x.departureAt) > new Date() && x.status === 'CONFIRMED')
      .map((x) => ({
        id: x.id,
        title: `${x.origin} → ${x.destination}`,
        sub: x.passengerName,
        date: x.departureAt,
      })),
    ...(data?.visas ?? [])
      .filter((v) => v.reminderAt && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(v.status))
      .map((v) => ({
        id: v.id,
        title: `${v.country} · ${t('visas')}`,
        sub: data?.customers.find((c) => c.id === v.customerId)?.name ?? '',
        date: v.reminderAt!,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const title = t(current);
  const open = (m: Modal) => {
    setModal(m);
    setCreateMenu(false);
  };
  return (
    <AppContext.Provider
      value={{
        staff,
        data,
        loading,
        error,
        refresh,
        lang,
        t,
        money,
        dateLabel,
        query,
        setQuery,
        open,
        notify: setToast,
        setLang,
      }}
    >
      <div className="app-shell">
        <button
          className={`mobile-overlay ${mobile ? 'visible' : ''}`}
          aria-label={t('Close navigation')}
          onClick={() => setMobile(false)}
        />
        <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
          <button
            className="sidebar-close"
            aria-label={t('Close navigation menu')}
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
          <Link href="/dashboard" className="brand">
            <span className="brand-icon">
              <Plane size={23} />
            </span>
            <span>
              travel<span className="brand-os">OS</span>
              <span className="brand-dot">.</span>
            </span>
          </Link>
          <div className="agency-switch">
            <span className="agency-avatar">{staff.agency.name.slice(0, 1)}</span>
            <span>
              <strong>{staff.agency.name}</strong>
              <small>{staff.agency.isDemo ? t('demo') : t('Agency workspace')}</small>
            </span>
            <ChevronDown size={15} />
          </div>
          <nav aria-label={t('Main navigation')}>
            <p className="nav-label">{t('workspace')}</p>
            {navItems
              .slice(0, 8)
              .filter((item) => can(staff.role, item.key))
              .map(({ key, icon: Icon }) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  onClick={() => {
                    setMobile(false);
                    setQuery('');
                  }}
                  className={`nav-item ${current === key ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span>{t(key)}</span>
                  {key === 'visas' &&
                    !!data?.visas.filter((v) => v.status === 'PROCESSING').length && (
                      <span className="nav-count">
                        {data.visas.filter((v) => v.status === 'PROCESSING').length}
                      </span>
                    )}
                  {current === key && <span className="nav-active-dot" />}
                </Link>
              ))}
            <p className="nav-label management-label">{t('management')}</p>
            {navItems
              .slice(8)
              .filter((item) => can(staff.role, item.key))
              .map(({ key, icon: Icon }) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  onClick={() => {
                    setMobile(false);
                    setQuery('');
                  }}
                  className={`nav-item ${current === key ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span>{t(key)}</span>
                </Link>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-secure">
              <ShieldCheck size={16} />
              <span>{t('private')}</span>
              <span className="green-dot" />
            </div>
            <div className="user-profile">
              <span className="user-avatar">
                {staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div>
                <strong>{staff.name}</strong>
                <small>{t(staff.role)}</small>
              </div>
              <button
                title={t('signOut')}
                aria-label={t('signOut')}
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/login');
                  router.refresh();
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobile(true)}
              aria-label={t('Open navigation')}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              {t('Workspace')}
              <span>/</span> <strong>{title}</strong>
            </div>
            <div className="topbar-search">
              <Search size={16} />
              <input
                aria-label={t('search')}
                placeholder={t('search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌕</kbd>
            </div>
            <div className="topbar-actions">
              <select
                aria-label={t('language')}
                className="language-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as Language)}
              >
                <option value="en">EN</option>
                <option value="ckb">کوردی</option>
                <option value="ar">العربية</option>
              </select>
              <button
                className="icon-button"
                onClick={() => setDark(!dark)}
                aria-label={t(dark ? 'Light mode' : 'Dark mode')}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="popover-anchor">
                <button
                  className="icon-button notification-button"
                  aria-label={t('Reminders')}
                  onClick={() => setNotifications(!notifications)}
                >
                  <Bell size={19} />
                  {reminders.length > 0 && <span />}
                </button>
                {notifications && (
                  <div className="popover reminders-popover">
                    <strong>{t('Reminders')}</strong>
                    {reminders.length ? (
                      reminders.map((r) => (
                        <div key={r.id}>
                          <span>
                            {r.title}
                            <small>{r.sub}</small>
                          </span>
                          <small>
                            {dateLabel(r.date)}
                            {new Date(r.date).getTime() < new Date().setHours(0, 0, 0, 0) && (
                              <span className="overdue"> · {t('Overdue')}</span>
                            )}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p className="subtle">{t('No upcoming reminders.')}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                className="header-avatar"
                aria-label={t('Change your password')}
                onClick={() => open({ kind: 'password' })}
              >
                {staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </button>
            </div>
          </header>
          <main className="workspace-main">
            <div className="page-heading">
              <div>
                <div className="page-eyebrow">
                  <span />{' '}
                  {t(staff.agency.isDemo ? 'DEMO · FICTIONAL DATA ONLY' : 'AGENCY WORKSPACE')}
                </div>
                <h1>{current === 'dashboard' ? t('overview') : title}</h1>
                <p>{current === 'dashboard' ? t('welcome') : moduleDescription(current, lang)}</p>
              </div>
              <div className="page-heading-actions">
                <span className="today-date">
                  {formatCalendar(
                    new Date(),
                    { day: 'numeric', month: 'short', year: 'numeric' },
                    lang,
                  )}
                </span>
                <div className="popover-anchor">
                  <Button onClick={() => setCreateMenu(!createMenu)}>
                    <Plus size={17} />
                    {t('add')}
                    <ChevronDown size={14} />
                  </Button>
                  {createMenu && (
                    <div className="popover create-popover">
                      {[
                        ['tickets', 'newTicket', Ticket],
                        ['visas', 'newVisa', FileCheck2],
                        ['customers', 'newCustomer', Users],
                        ['expenses', 'newExpense', Wallet],
                      ]
                        .filter(([key]) =>
                          can(
                            staff.role,
                            key === 'expenses' ? 'accounting' : (key as Module),
                            true,
                          ),
                        )
                        .map(([key, label, Icon]) => {
                          const I = Icon as typeof Ticket;
                          return (
                            <button key={String(key)} onClick={() => open({ kind: String(key) })}>
                              <I size={17} />
                              {t(String(label))}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">
                <LoaderCircle className="animate-spin" />
                <p>{t('loading')}</p>
                <div className="skeleton-grid">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="error-state">
                <RefreshCw size={30} />
                <h2>{t('error')}</h2>
                <p>{t(error)}</p>
                <Button onClick={refresh}>{t('retry')}</Button>
              </div>
            ) : (
              children
            )}
            <footer className="workspace-footer">
              <span>
                <Plane size={13} /> Travel OS <span>·</span>
                {t('Everything in its place.')}
              </span>
              <span>
                <ShieldCheck size={13} />
                {t('Secure workspace')}
                <span className="green-dot" />
              </span>
            </footer>
          </main>
        </div>
        {modal && <RecordModal modal={modal} onClose={() => setModal(null)} />}
        {toast && (
          <div role="status" className="toast">
            <ShieldCheck size={18} />
            {t(toast)}
            <button aria-label={t('Dismiss')} onClick={() => setToast('')}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
function moduleDescription(module: string, lang: Language) {
  const en: Record<string, string> = {
    tickets: 'Every itinerary, organized. Manage manual bookings and travel details.',
    visas: 'From application to approval. Keep every step moving.',
    customers: 'Know your travelers. Build relationships that go further.',
    accounting: 'A clear view of every payment, expense, and balance.',
    suppliers: 'Your trusted partners, all in one place.',
    invoices: 'Professional invoices. Clear records. Confident accounting.',
    reports: 'The numbers behind your next move. All reporting in USD.',
    employees: 'The right people. The right access.',
    settings: 'Make this workspace your own.',
    audit: 'A traceable record of every important action.',
  };
  return translate(lang, en[module] ?? '');
}
