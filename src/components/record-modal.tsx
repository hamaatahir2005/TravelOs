'use client';
import { useEffect, useRef, useState } from 'react';
import {
  X,
  ArrowRight,
  Plane,
  FileText,
  Upload,
  ShieldCheck,
  LoaderCircle,
  Printer,
  Plus,
  Pencil,
} from 'lucide-react';
import { useApp, type Modal } from './workspace';
import { isLanguage } from '@/lib/i18n';
import { Status } from './module-page';
import { Button } from './ui/button';
type Field = {
  key: string;
  type?: string;
  required?: boolean;
  options?: {
    value: string;
    label: string;
  }[];
  wide?: boolean;
};
export function RecordModal({ modal, onClose }: { modal: Modal; onClose: () => void }) {
  const { data, staff, t, refresh, notify, money, dateLabel, setLang } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState(modal.detail ?? false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [direction, setDirection] = useState('IN');
  const [passport, setPassport] = useState('');
  const [record, setRecord] = useState(modal.record ?? {});
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const kind = modal.kind;
  if (!data) return null;
  const select = (
    key: string,
    options: {
      value: string;
      label: string;
    }[],
    required = true,
  ): Field => ({ key, type: 'select', options, required });
  const text = (key: string, type = 'text', required = true, wide = false): Field => ({
    key,
    type,
    required,
    wide,
  });
  const customers = data.customers.map((c) => ({ value: c.id, label: c.name }));
  const suppliers = data.suppliers.map((s) => ({ value: s.id, label: s.name }));
  const currencies = [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'IQD', label: 'IQD — Iraqi Dinar' },
  ];
  const trade = [select('customerId', customers), select('supplierId', suppliers)];
  const cash = data.cashAccounts.map((c) => ({
    value: c.id,
    label: `${c.name} · ${c.currency} · ${money(c.balance, c.currency)}`,
  }));
  const roles = ['SUPER_ADMIN', 'AGENCY_MANAGER', 'TICKET_AGENT', 'VISA_OFFICER', 'ACCOUNTANT']
    .filter((r) => staff.role === 'SUPER_ADMIN' || r !== 'SUPER_ADMIN')
    .map((r) => ({ value: r, label: t(r) }));
  const configs: Record<string, Field[]> = {
    customers: [
      text('name'),
      text('phone'),
      text('email', 'email', false),
      text('nationality', 'text', false),
      text('notes', 'textarea', false, true),
    ],
    suppliers: [
      text('name'),
      text('phone', 'text', false),
      text('email', 'email', false),
      text('notes', 'textarea', false, true),
    ],
    tickets: record.id
      ? [
          text('passengerName'),
          text('airline'),
          text('origin'),
          text('destination'),
          text('departureAt', 'datetime-local'),
          text('arrivalAt', 'datetime-local'),
          text('pnr'),
          select(
            'status',
            ['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'].map((s) => ({
              value: s,
              label: t(s.toLowerCase()),
            })),
          ),
          text('notes', 'textarea', false, true),
        ]
      : [
          ...trade,
          text('passengerName'),
          text('airline'),
          text('origin'),
          text('destination'),
          text('departureAt', 'datetime-local'),
          text('arrivalAt', 'datetime-local'),
          text('pnr'),
          text('ticketNumber'),
          select('currency', currencies),
          text('purchasePrice', 'number'),
          text('sellingPrice', 'number'),
          text('serviceFee', 'number', false),
          text('notes', 'textarea', false, true),
        ],
    visas: record.id
      ? [
          select(
            'status',
            [
              'DRAFT',
              'DOCUMENTS_PENDING',
              'SUBMITTED',
              'PROCESSING',
              'APPROVED',
              'REJECTED',
              'CANCELLED',
            ].map((s) => ({ value: s, label: t(s.toLowerCase()) })),
          ),
          text('submissionDate', 'date', false),
          text('reminderAt', 'date', false),
          text('note', 'textarea', false, true),
          text('notes', 'textarea', false, true),
        ]
      : [
          ...trade,
          text('country'),
          text('visaType'),
          text('passportNumber'),
          text('passportExpiry', 'date'),
          text('applicationDate', 'date'),
          text('submissionDate', 'date', false),
          text('reminderAt', 'date', false),
          text('requiredDocuments', 'text', false, true),
          select('currency', currencies),
          text('supplierFee', 'number'),
          text('governmentFee', 'number', false),
          text('sellingPrice', 'number'),
          text('notes', 'textarea', false, true),
        ],
    expenses: [
      text('category'),
      text('description', 'text', true, true),
      text('amount', 'number'),
      select('currency', currencies),
      select('cashAccountId', cash),
      text('date', 'date'),
    ],
    payments: [
      select('direction', [
        { value: 'IN', label: 'Customer payment received' },
        { value: 'OUT', label: 'Supplier payment sent' },
      ]),
      ...(direction === 'IN'
        ? [
            select(
              'invoiceId',
              data.invoices
                .filter((i) => Number(i.total) - i.refunded - i.paid > 0)
                .map((i) => ({
                  value: i.id,
                  label: `${i.number} · ${data.customers.find((c) => c.id === i.customerId)?.name} · ${money(Number(i.total) - i.refunded - i.paid, i.currency)}`,
                })),
            ),
          ]
        : [select('supplierId', suppliers)]),
      text('amount', 'number'),
      select('currency', currencies),
      select('cashAccountId', cash),
      text('reference'),
    ],
    refunds: [
      select(
        'invoiceId',
        data.invoices
          .filter((i) => i.refunded < Number(i.total))
          .map((i) => ({ value: i.id, label: `${i.number} · ${money(i.total, i.currency)}` })),
      ),
      text('amount', 'number'),
      text('reason', 'textarea', true, true),
      select('cashAccountId', cash, false),
    ],
    password: [text('currentPassword', 'password'), text('newPassword', 'password')],
    employees: record.id
      ? [
          select('role', roles),
          select('active', [
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Disabled' },
          ]),
        ]
      : [text('name'), text('email', 'email'), text('password', 'password'), select('role', roles)],
    cashAccounts: [text('name'), select('currency', currencies)],
    exchangeRates: [
      select('currency', [{ value: 'IQD', label: 'Iraqi Dinar (IQD)' }]),
      text('unitsPerUsd', 'number'),
    ],
    settings: [
      text('name'),
      text('address', 'text', false, true),
      text('phone', 'text', false),
      text('email', 'email', false),
      text('receiptHeader', 'textarea', false, true),
      text('invoicePrefix'),
      select('currency', currencies),
      select('language', [
        { value: 'en', label: 'English' },
        { value: 'ckb', label: 'کوردی سۆرانی' },
        { value: 'ar', label: 'العربية' },
      ]),
    ],
  };
  const fields = configs[kind] ?? [];
  const permissionModule =
    kind === 'expenses' || kind === 'payments' || kind === 'refunds' || kind === 'cashAccounts'
      ? 'accounting'
      : kind === 'exchangeRates'
        ? 'settings'
        : kind;
  const writable = data.permissions[permissionModule as keyof typeof data.permissions]?.write;
  function value(field: Field) {
    const raw =
      record[field.key] ??
      (['date', 'applicationDate'].includes(field.key)
        ? new Date().toISOString().slice(0, 10)
        : ['serviceFee', 'governmentFee'].includes(field.key)
          ? '0'
          : field.key === 'currency'
            ? staff.agency.currency
            : field.key === 'language'
              ? staff.agency.language
              : field.key === 'direction'
                ? 'IN'
                : '');
    if (field.type === 'date') return raw ? String(raw).slice(0, 10) : '';
    if (field.type === 'datetime-local') return raw ? String(raw).slice(0, 16) : '';
    if (Array.isArray(raw)) return raw.join(', ');
    return String(raw);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const entries = Object.fromEntries(new FormData(event.currentTarget));
    const body: Record<string, unknown> = { ...entries };
    if (record.id) body.id = record.id;
    if (kind === 'employees' && record.id) body.active = body.active === 'true';
    if (kind === 'visas' && !record.id)
      body.requiredDocuments = String(body.requiredDocuments ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    for (const key of ['submissionDate', 'reminderAt']) if (body[key] === '') body[key] = null;
    for (const key of ['cashAccountId', 'invoiceId', 'supplierId'])
      if (body[key] === '') delete body[key];
    if (body.serviceFee === '') body.serviceFee = '0';
    if (body.governmentFee === '') body.governmentFee = '0';
    try {
      const response = await fetch(
        kind === 'password' ? '/api/auth/password' : `/api/records/${kind}`,
        {
          method: record.id && kind !== 'settings' ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      notify(record.id ? 'Record updated successfully' : 'Record created successfully');
      if (kind === 'settings') {
        if (isLanguage(body.language)) setLang(body.language);
        window.location.reload();
      } else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind === 'visas' ? 'visa' : 'ticket');
      form.set('entityId', String(record.id));
      const response = await fetch('/api/documents', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const docs = Array.isArray(record.documents) ? record.documents : [];
      setRecord({ ...record, documents: [...docs, result] });
      await refresh();
      notify('Encrypted document uploaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }
  const customer = data.customers.find((c) => c.id === record.customerId);
  const relatedInvoices = data.invoices.filter((i) =>
    kind === 'customers'
      ? i.customerId === record.id
      : kind === 'tickets'
        ? i.ticketId === record.id
        : kind === 'visas'
          ? i.visaId === record.id
          : false,
  );
  const title = detail
    ? String(
        record.passengerName ??
          record.name ??
          (kind === 'visas' ? `${record.country} · ${record.visaType}` : t(kind)),
      )
    : kind === 'password'
      ? t('Change your password')
      : `${record.id ? t('edit') : t('add')} · ${t(kind)}`;
  return (
    <dialog
      ref={ref}
      className="record-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <div className="dialog-title-icon">
            {kind === 'tickets' ? <Plane size={20} /> : <FileText size={20} />}
          </div>
          <div>
            <span className="section-kicker">TRAVEL OS · {t(kind)}</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label={t('close')} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {error && (
          <div className="error-notice dialog-error" role="alert">
            {t(error)}
          </div>
        )}
        {detail ? (
          <div className="detail-body">
            {record.status !== undefined && <Status value={String(record.status)} />}
            {kind === 'visas' && (
              <section className="detail-section">
                <h3>{t('passportNumber')}</h3>
                {passport ? (
                  <strong>{passport}</strong>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const response = await fetch(`/api/visas/${record.id}/passport`, {
                        method: 'POST',
                      });
                      const result = await response.json();
                      if (!response.ok) setError(result.error);
                      else setPassport(result.passportNumber);
                    }}
                  >
                    {t('Reveal passport number')}
                  </Button>
                )}
                <p className="subtle form-footnote">
                  {t('Access is recorded in the audit trail.')}
                </p>
              </section>
            )}
            <div className="detail-grid">
              {Object.entries(record)
                .filter(
                  ([key, v]) =>
                    ![
                      'id',
                      'agencyId',
                      'passportEncrypted',
                      'documents',
                      'timeline',
                      'exchangeRate',
                      'payments',
                      'refunds',
                      'createdAt',
                    ].includes(key) &&
                    v !== null &&
                    typeof v !== 'object',
                )
                .map(([key, v]) => (
                  <div key={key}>
                    <small>{t(key)}</small>
                    <strong>
                      {key === 'customerId'
                        ? customer?.name
                        : key === 'supplierId'
                          ? data.suppliers.find((s) => s.id === v)?.name
                          : key.endsWith('At') || key.endsWith('Date') || key === 'passportExpiry'
                            ? dateLabel(v)
                            : String(v)}
                    </strong>
                  </div>
                ))}
            </div>
            {Array.isArray(record.requiredDocuments) && (
              <section className="detail-section">
                <h3>{t('Required documents')}</h3>
                <div className="document-tags">
                  {(record.requiredDocuments as string[]).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              </section>
            )}
            {Array.isArray(record.timeline) && (
              <section className="detail-section">
                <h3>{t('timeline')}</h3>
                <div className="timeline">
                  {(
                    record.timeline as {
                      id: string;
                      status: string;
                      note: string;
                      createdAt: string;
                    }[]
                  ).map((item) => (
                    <div key={item.id}>
                      <span className="timeline-point" />
                      <div>
                        <strong>{t(item.status.toLowerCase())}</strong>
                        <p>{item.note}</p>
                        <small>{dateLabel(item.createdAt)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {relatedInvoices.length > 0 && (
              <section className="detail-section">
                <h3>{kind === 'customers' ? t('Travel & payment history') : t('invoices')}</h3>
                {relatedInvoices.map((i) => (
                  <div className="detail-invoice" key={i.id}>
                    <span>
                      <strong>{i.number}</strong>
                      <small>{i.description}</small>
                    </span>
                    <span>
                      <strong>{money(i.total, i.currency)}</strong>
                      <small>
                        {t('paid')} {money(i.paid, i.currency)}
                        {' · '}
                        {t('balance')}{' '}
                        {money(Math.max(0, Number(i.total) - i.paid - i.refunded), i.currency)}
                      </small>
                    </span>
                    <a
                      href={`/print/invoice/${i.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t('Print invoice')}
                    >
                      <Printer size={18} />
                    </a>
                  </div>
                ))}
              </section>
            )}
            {kind === 'customers' && (
              <section className="detail-section">
                <h3>{t('Payment history')}</h3>
                {relatedInvoices.flatMap((i) =>
                  i.payments.map((p) => (
                    <div className="detail-invoice" key={p.id}>
                      <span>
                        {dateLabel(p.createdAt)} · {p.reference}
                      </span>
                      <strong>{money(p.amount, p.currency)}</strong>
                    </div>
                  )),
                )}
                {relatedInvoices.every((i) => !i.payments.length) && (
                  <p className="subtle">{t('No customer payments yet.')}</p>
                )}
              </section>
            )}
            {['tickets', 'visas'].includes(kind) && (
              <section className="detail-section">
                <h3>{t('documents')}</h3>
                <div className="document-list">
                  {(
                    (record.documents ?? []) as {
                      id: string;
                      name: string;
                    }[]
                  ).map((doc) => (
                    <a href={`/api/documents/${doc.id}`} key={doc.id}>
                      <FileText size={17} />
                      {doc.name}
                      <ArrowRight size={14} />
                    </a>
                  ))}
                </div>
                {writable && (
                  <label className="upload-zone">
                    <Upload size={21} />
                    <strong>{busy ? t('Uploading…') : t('upload')}</strong>
                    <span>{t('PDF, PNG, JPEG \u00B7 Up to 3 MB \u00B7 Encrypted & private')}</span>
                    <input
                      disabled={busy}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      onChange={upload}
                    />
                  </label>
                )}
              </section>
            )}
            <div className="dialog-footer">
              <Button variant="outline" onClick={onClose}>
                {t('close')}
              </Button>
              {writable && (
                <Button onClick={() => setDetail(false)}>
                  <Pencil size={15} />
                  {t('edit')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-body">
              {['tickets', 'visas'].includes(kind) && (
                <div className="form-info">
                  <ShieldCheck size={17} />
                  <span>
                    {record.id
                      ? t(
                          'Financial amounts stay immutable. Use refunds for financial corrections.',
                        )
                      : t('An invoice and balanced ledger entries are generated automatically.')}
                  </span>
                </div>
              )}
              <div className="form-grid">
                {fields.map((field) => (
                  <label key={field.key} className={field.wide ? 'wide' : ''}>
                    {t(field.key)}
                    {field.required && <span className="required">*</span>}
                    {field.type === 'select' ? (
                      <select
                        name={field.key}
                        required={field.required}
                        defaultValue={value(field)}
                        onChange={(e) => {
                          if (field.key === 'direction') setDirection(e.target.value);
                        }}
                      >
                        {field.required && (
                          <option value="" disabled>
                            {t('Select\u2026')}
                          </option>
                        )}
                        {!field.required && (
                          <option value="">{t('No cash portion / not required')}</option>
                        )}
                        {field.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {['role', 'status', 'currency', 'direction', 'active'].includes(
                              field.key,
                            )
                              ? t(o.label)
                              : o.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        name={field.key}
                        required={field.required}
                        defaultValue={value(field)}
                        rows={3}
                        maxLength={2000}
                      />
                    ) : (
                      <input
                        name={field.key}
                        required={field.required}
                        type={field.type}
                        defaultValue={value(field)}
                        min={field.type === 'number' ? 0 : undefined}
                        step={field.type === 'number' ? '0.01' : undefined}
                        maxLength={
                          field.key === 'password' ? 128 : field.key === 'notes' ? 2000 : 200
                        }
                        autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                      />
                    )}
                  </label>
                ))}
              </div>
              {kind === 'refunds' && (
                <p className="subtle form-footnote">
                  {t(
                    'The unpaid portion reduces the invoice balance. Any paid portion is returned from the selected cash account. Supplier costs remain payable until separately settled.',
                  )}
                </p>
              )}
              {kind === 'employees' && (
                <p className="subtle form-footnote">
                  {t(
                    'Share temporary credentials securely. Staff access can be disabled at any time.',
                  )}
                </p>
              )}
            </div>
            <div className="dialog-footer">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                {busy ? t('Saving…') : t('save')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
