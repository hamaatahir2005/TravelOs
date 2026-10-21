# Travel OS

A private travel agency operations application. Every operational page, API, attachment, invoice and report requires an active agency staff session. There is no public booking, visa application or marketplace flow.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · shadcn-style Radix/CVA UI primitives · Recharts · PostgreSQL 17 · Prisma 6 · bcrypt · AES-256-GCM.

## Start the isolated demo

Requires Node.js 22.9+, npm and PostgreSQL 17 (or Docker).

```bash
cp .env.example .env
```

Edit `.env`: choose a local PostgreSQL password, match it in `DATABASE_URL`, choose `DEMO_EMAIL` and `DEMO_PASSWORD`, and generate `PASSPORT_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm ci
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Sign in using the `DEMO_EMAIL` and `DEMO_PASSWORD` you configured. These are local development instructions, not a hosted preview URL.

The seed refuses non-demo mode, a database without `demo` in its name, missing credentials, and any non-empty database. It creates Horizon Travel, twelve fictional customers, three suppliers, thirty-six tickets, twelve visa applications, expenses, payments, cash accounts and opening equity. Never point the demo seed at production.

For a complete Docker application:

```bash
docker compose up --build -d
# Once, against the empty demo database:
docker compose run --rm migrate npm run db:seed
```

Docker runs the production server, which uses Secure cookies. Use localhost or HTTPS; for LAN development over plain HTTP use `npm run dev` instead. Database port 5432 binds only to localhost. The web application binds port 3000 on all interfaces.

## Included workflows

| Phase | Implementation                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | PostgreSQL models and migrations, hashed opaque sessions, five staff roles, agency isolation, KPI dashboard, daily/monthly/yearly charts and reminders                                     |
| 2     | Searchable customer CRM, notes, travel/payment history, manual flight tickets, operational edits, PNR/ticket references, supplier costs, automatic invoices and profit                     |
| 3     | Visa applications, encrypted passport numbers, audited passport reveal, encrypted PDF/JPEG/PNG uploads, status timeline and reminders                                                      |
| 4     | Customer and supplier payments, expenses, cash accounts, USD/IQD rates, refunds, receivables/payables, immutable double-entry ledger, realized FX, reports, CSV and print-to-PDF           |
| 5     | Agency profile, private logo upload, receipt footer, invoice prefix, currency/language preferences, Sorani/Arabic RTL, English LTR, light/dark themes, responsive navigation and PWA shell |
| 6     | Isolated fictional seed, unit/integration/browser tests, CI, Docker, production build and Vercel deployment instructions                                                                   |

Choose **Add record** in the top bar or module toolbar. Tickets and visas automatically create numbered invoices and financial postings. Their operational details can be edited; financial amounts are immutable. Record a refund to correct a sale. Cancelling a booking changes its operational status only; issue a refund separately if money should be returned. Supplier costs are not automatically reversed by a customer refund.

In **Accounting**, switch between payments, expenses, refunds, cash accounts and the ledger. Outgoing payments cannot exceed cash or supplier balances. Customer payments cannot exceed the invoice's remaining amount. Refunds first reduce unpaid receivables, then return the paid portion from the selected cash account.

In **Invoices**, open the printer action. Use your browser's **Save as PDF** option for invoices and receipts. Reports support CSV downloads and print-to-PDF. PDF export uses the browser print dialog; there is no external PDF rendering service.

## Roles

- **Super Admin / Agency Manager:** agency operations and configuration. Only a Super Admin can create or modify another Super Admin.
- **Ticket Agent:** customer CRM, manual tickets, supplier lookup and invoice receipts.
- **Visa Officer:** customer CRM, visas, private visa documents, supplier lookup and invoice receipts.
- **Accountant:** customer/supplier records, accounting, invoices, reports and audit review.

Role checks happen in server routes and page data preparation. Hiding navigation is an additional UI convenience. Deactivating staff invalidates sessions immediately. Use the avatar or Settings to change your own password; this revokes other sessions. Managers can edit other staff roles and active status.

## Data and accounting design

`prisma/schema.prisma` defines agencies, staff, sessions, customers, suppliers, tickets, visas, timeline events, documents, invoices, payments, expenses, refunds, cash accounts, journals, ledger entries, exchange rates and audit logs.

Agency-owned foreign keys use compound `(agencyId, id)` references to block cross-agency associations. Server reads and writes use the authenticated agency ID. Mutations run at serializable isolation; reports read a repeatable snapshot. A concurrent conflicting mutation returns a retryable 409 rather than overspending or overpaying.

Money uses PostgreSQL decimals and Prisma Decimal in transactional calculations. Each journal balances in both transaction currency and USD. SQL constraints and deferred triggers reject unbalanced journals. Database triggers reject updates/deletes of invoices, payments, expenses, refunds, journals, ledger entries, historical exchange rates and audit logs. Corrections must be additive.

The exchange rate is **units of currency per USD**. The invoice captures its historical rate; payments capture the settlement rate and clear receivables/payables at carrying value, posting realized exchange differences separately. Supplier partial payments use proportional carrying value. Reports use accrual accounting, with ticket/visa costs recognized at booking. Automated period-end unrealized FX revaluation, tax rules and statutory accounting certification are outside this release.

Documents are encrypted inside PostgreSQL, never served from a public bucket, and downloaded only after tenant and role checks. Upload limit: **3 MB**, compatible with Vercel request limits. Only PDF/JPEG/PNG signatures are accepted; files download as attachments with restrictive response headers. For larger-scale document workloads, replace the adapter with private object storage, per-request authorization and malware scanning. Keep encryption keys outside the database and backups.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Database integration tests require a separate database whose name includes `test`:

```bash
# Create travel_os_test through PostgreSQL or your provider first.
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate
npm run test:integration
```

`npm test` skips database integration tests unless explicitly enabled. `npm run test:integration` runs them, including real PostgreSQL trigger, agency-isolation, race-condition and IQD FX checks. It only adds test agencies to the dedicated test database; it never truncates demo or production records.

For browser checks against a running **demo** application:

```bash
npx playwright install chromium
npm run test:e2e
```

See `DEPLOYMENT.md` for hosted PostgreSQL, Vercel, mobile preview, backup/restore and production setup. See `SECURITY.md` for security boundaries and remaining operational considerations.

## Project structure

```text
src/app/                 App Router pages and protected HTTP endpoints
src/components/          Staff workspace, module tables, modal forms, UI primitives
src/lib/                 Authentication, permissions, validation, encryption, ledger services
prisma/                  Complete schema, SQL migrations, isolated demo seed
scripts/                 First production administrator and runtime role hardening
 tests/                  Security, PostgreSQL integration and browser workflows
.github/workflows/       PostgreSQL-backed continuous integration
```

Duffel is disabled by default. `src/lib/duffel.ts` is an isolated, server-only integration boundary activated only with both `DUFFEL_ENABLED=true` and a private access token. No public booking path is created by enabling it.
