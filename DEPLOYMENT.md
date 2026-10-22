# Deploy Travel OS

## Current hosting status

This repository contains a runnable Next.js application and deployment configuration. A local server address is not a deployed preview. No hosted database or Vercel deployment is implied by these instructions. A real HTTPS URL must be obtained from a successful deployment and verified before sharing.

## 1. Provision PostgreSQL

Use Neon, Supabase PostgreSQL, AWS RDS, or another PostgreSQL 17-compatible provider. For a Vercel demo, Neon is a suitable serverless option:

1. In the Neon console, create a project in the same region as the Vercel functions.
2. Create a dedicated database named **travel_os_demo**. Use an entirely separate project/database for production, such as **travel_os_production**.
3. Copy a direct SSL connection URL for migrations and setup. Keep it in a local secret variable named `MIGRATION_DATABASE_URL`; never commit it.
4. Copy the provider's pooled SSL connection URL for the app. Set `DATABASE_URL` in Vercel to this URL. With transaction pooling, append `pgbouncer=true&connection_limit=1` as appropriate to the provider URL. Preserve `sslmode=require`.
5. Use a migration-owner credential only for setup and migrations. For the app, create a limited runtime role and apply `scripts/harden-runtime.sql` as the database owner after migrations. The provider must configure the runtime role's password separately. Do not use a public Supabase bucket for documents; this app stores encrypted documents in PostgreSQL.

Do not provision a paid plan without the account owner's authorization. The application needs no public storage bucket.

## 2. Configure and initialize the demo

Generate a unique encryption key and choose unique, development-only demo credentials. On a trusted setup machine with Node 22.9+:

```bash
npm ci
npm run db:generate
```

Configure these environment variables using your shell's secret manager or an ignored `.env` file:

```dotenv
DATABASE_URL="<direct SSL URL for the empty travel_os_demo database>"
PASSPORT_ENCRYPTION_KEY="<64 random hex characters>"
DEMO_MODE="true"
ALLOW_DEMO_SEED="true"
DEMO_EMAIL="<your chosen demo email>"
DEMO_PASSWORD="<unique demo password with at least 12 characters>"
```

Then run:

```bash
npm run db:migrate
npm run db:seed
```

The seed accepts only an empty demo database. Seeding is a one-time setup command, never part of Vercel's build or startup. After successful seeding, remove `ALLOW_DEMO_SEED` and `DEMO_PASSWORD` from hosted runtime settings; login verifies the database password hash. The production app must have `DEMO_MODE=false` and a different database.

## 3. Deploy on Vercel

1. Import `hamaatahir2005/TravelOs` into the Vercel account.
2. Select **Next.js** and **Node.js 22.x**, with this repository as the root.
3. Install command: `npm ci`. Build command: `npm run build`. Leave the output directory at Vercel's framework default.
4. Set runtime environment variables for the demo deployment:

   | Variable                  | Value                                                                             |
   | ------------------------- | --------------------------------------------------------------------------------- |
   | `DATABASE_URL`            | Pooled, SSL-enabled URL for `travel_os_demo`, preferably the limited runtime role |
   | `PASSPORT_ENCRYPTION_KEY` | Same generated key used by the seed                                               |
   | `DEMO_MODE`               | `true`                                                                            |
   | `DUFFEL_ENABLED`          | `false`                                                                           |
   | `APP_URL`                 | The exact stable HTTPS deployment origin, without a trailing slash                |

5. Deploy. Copy the actual Vercel HTTPS origin, set `APP_URL` to that exact origin, and redeploy. A stable Vercel alias or custom domain avoids origin changes on later deployments. If Vercel Deployment Protection is enabled, permit your intended preview reviewers.
6. Verify `/login` loads over HTTPS and sign in using the demo credentials selected during seeding. Confirm adding a customer, ticket, visa and expense, then printing an invoice and exporting a report. Check logout and unauthenticated API denial.
7. Only now share the exact verified HTTPS URL. Open that URL in Android Chrome, iPhone Safari, and Windows Edge/Chrome. On iPhone use **Share → Add to Home Screen**; on Android use **Install app/Add to Home screen** when offered.

Migrations require the direct owner connection and run separately before deployment, not in serverless request handlers. Every future schema change should be reviewed and backed up before applying `prisma migrate deploy`.

### Vercel CLI alternative

After the user has authenticated with the Vercel CLI and configured the same environment variables:

```bash
npx vercel link
npx vercel env pull .env.vercel.local
npm run lint
npm run typecheck
npm test
npm run build
npx vercel --prod
```

Do not paste secrets into GitHub issues or commit environment files. Confirm `APP_URL` matches the stable deployed alias. The CLI's returned URL is not verified until the deployment succeeds and the login flow works.

## 4. Production initialization

Use a separate **empty production database**, set `DEMO_MODE=false`, remove demo seeding variables and choose a different encryption key. Run migrations using the migration-owner connection. Configure these initial-setup variables only on the trusted setup machine:

```dotenv
STAFF_EMAIL="<administrator email>"
STAFF_PASSWORD="<unique long password>"
STAFF_NAME="<administrator name>"
AGENCY_NAME="<real agency name>"
```

```bash
npm run staff:create
```

This refuses non-empty databases and demo mode. Remove setup credentials from the environment afterward. Sign in, configure the real IQD rate, and create other staff through **Team & access**. New cash accounts begin at zero. Customer receipts fund cash accounts; existing opening balances should be imported through reviewed, balanced journals using the server ledger service before real operations. No opening balances are invented for production.

## 5. Docker host alternative

Set `.env` with real credentials and database settings, then:

```bash
docker compose up --build -d
```

Terminate HTTPS using your host's reverse proxy, forward to app port 3000, set `APP_URL` to the external HTTPS origin and preserve request host/origin headers. The app uses Secure, HttpOnly, SameSite=Strict session cookies in production. Do not disable TLS or cookie security to make a hosted login work. Restrict PostgreSQL network access to the application and administration hosts.

For a local phone check without hosted infrastructure, run `npm run dev` on your computer, set `APP_URL` to `http://<your-computer-LAN-IP>:3000`, and open that exact origin from a phone on the same trusted network. This is not a public HTTPS deployment; PWA installation and some secure-context behavior require HTTPS.

## 6. Backup and restore

Use provider-managed daily encrypted backups and point-in-time recovery. Keep the encryption key separately; losing it makes passport numbers and documents unrecoverable.

Manual backup using a trusted PostgreSQL client and owner credentials:

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --file=travel-os-backup.dump
```

Encrypt the dump with your organization's approved tool and store it outside the application host. Do not commit dumps. Restore into a **new isolated database** first:

```bash
pg_restore --dbname="$RESTORE_DATABASE_URL" --no-owner --exit-on-error travel-os-backup.dump
```

Verify agency counts, invoice sequence, document decryption, and ledger totals:

```sql
SELECT "agencyId", SUM("baseDebit") - SUM("baseCredit") AS difference
FROM "LedgerEntry" GROUP BY "agencyId";
```

Every difference must be zero. Test a staff login and document download with the original encryption key. Reapply runtime grants if necessary. Switch application traffic only after validating the restored instance. Never overwrite the live database as a recovery experiment.

## Practical limits

- No hosted database or deployment credential is bundled in this public repository.
- The PWA shell has a network-only offline fallback; operational records, documents and credentials are never cached for offline use.
- Browser print produces PDFs; the app does not require a separate rendering service.
- Data tables paginate in the browser and load an agency snapshot. Introduce server pagination and SQL aggregates before high-volume deployments.
- Reminders appear in the dashboard and notification panel. Email/SMS/push delivery needs a separately configured service and explicit authorization.
- Login, navigation, forms, explanatory help, reports, printable receipts and common server errors support English, Sorani and Arabic. The selected language persists across login and printing. Customer names, notes, agency receipt text and other entered data retain their original language.
- Device viewport tests emulate mobile dimensions; physical iOS/Android/Windows testing remains a deployment acceptance step.
