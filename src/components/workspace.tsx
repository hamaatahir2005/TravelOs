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
import { translations, type Language } from '@/lib/i18n';
import { Button } from './ui/button';
import { RecordModal } from './record-modal';
type Serialized<T> = T extends Prisma.Decimal
  ? string
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
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
export type Staff = { id: string; name: string; email: string; role: Role; agency: Agency };
export type Modal = { kind: string; record?: Record<string, unknown>; detail?: boolean };
type Context = {
  staff: Staff;
  data: AppData | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  lang: Language;
  t: (key: string) => string;
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
export const money = (value: unknown, currency: string = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  }).format(Number(value ?? 0));
export const dateLabel = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
export function Workspace({ staff, children }: { staff: Staff; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = pathname.split('/')[1] || 'dashboard';
  const [data, setData] = useState<AppData | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [lang, setLang] = useState<Language>((staff.agency.language as Language) || 'en'),
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
    const storedLang = localStorage.getItem('travel-os-lang');
    const storedDark = localStorage.getItem('travel-os-theme') === 'dark';
    const init = setTimeout(() => {
      void refresh();
      if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
      if (storedLang && ['en', 'ar', 'ckb'].includes(storedLang)) setLang(storedLang as Language);
      setDark(storedDark);
    }, 0);
    return () => clearTimeout(init);
  }, [refresh]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    localStorage.setItem('travel-os-lang', lang);
  }, [lang]);
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
  const t = (key: string) =>
    translations[lang]?.[key] ??
    translations.en[key] ??
    key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
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
      .filter(
        (v) =>
          v.reminderAt &&
          new Date(v.reminderAt) > new Date() &&
          !['APPROVED', 'REJECTED', 'CANCELLED'].includes(v.status),
      )
      .map((v) => ({
        id: v.id,
        title: `${v.country} visa`,
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
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
        <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
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
              <small>{staff.agency.isDemo ? t('demo') : 'Agency workspace'}</small>
            </span>
            <ChevronDown size={15} />
          </div>
          <nav aria-label="Main navigation">
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
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{title}</strong>
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
                aria-label={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="popover-anchor">
                <button
                  className="icon-button notification-button"
                  aria-label="Reminders"
                  onClick={() => setNotifications(!notifications)}
                >
                  <Bell size={19} />
                  {reminders.length > 0 && <span />}
                </button>
                {notifications && (
                  <div className="popover reminders-popover">
                    <strong>{t('upcoming')}</strong>
                    {reminders.length ? (
                      reminders.map((r) => (
                        <div key={r.id}>
                          <span>
                            {r.title}
                            <small>{r.sub}</small>
                          </span>
                          <small>{dateLabel(r.date)}</small>
                        </div>
                      ))
                    ) : (
                      <p className="subtle">No upcoming reminders.</p>
                    )}
                  </div>
                )}
              </div>
              <button
                className="header-avatar"
                aria-label="Change your password"
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
                  <span /> {staff.agency.isDemo ? 'DEMO · FICTIONAL DATA ONLY' : 'AGENCY WORKSPACE'}
                </div>
                <h1>{current === 'dashboard' ? t('overview') : title}</h1>
                <p>{current === 'dashboard' ? t('welcome') : moduleDescription(current, lang)}</p>
              </div>
              <div className="page-heading-actions">
                <span className="today-date">
                  {new Date().toLocaleDateString(
                    lang === 'en' ? 'en-GB' : lang === 'ar' ? 'ar' : 'ckb',
                    { day: 'numeric', month: 'short', year: 'numeric' },
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
                <p>{error}</p>
                <Button onClick={refresh}>{t('retry')}</Button>
              </div>
            ) : (
              children
            )}
            <footer className="workspace-footer">
              <span>
                <Plane size={13} /> Travel OS <span>·</span> Everything in its place.
              </span>
              <span>
                <ShieldCheck size={13} /> Secure workspace <span className="green-dot" />
              </span>
            </footer>
          </main>
        </div>
        {modal && <RecordModal modal={modal} onClose={() => setModal(null)} />}
        {toast && (
          <div role="status" className="toast">
            <ShieldCheck size={18} />
            {toast}
            <button aria-label="Dismiss" onClick={() => setToast('')}>
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
  return lang === 'en'
    ? en[module]
    : lang === 'ar'
      ? 'إدارة آمنة لجميع عمليات وكالتك.'
      : 'بەڕێوەبردنی پارێزراوی هەموو کارەکانی ئاژانسەکەت.';
}
