# Validation — 22 October 2026

Validated locally against PostgreSQL 17 and the optimized Next.js standalone production server.

| Check                                           | Result                                |
| ----------------------------------------------- | ------------------------------------- |
| ESLint                                          | Passed, no warnings                   |
| Next route type generation and TypeScript       | Passed                                |
| Unit and PostgreSQL integration tests           | 24 passed                             |
| Chromium browser workflows                      | 4 passed                              |
| Next.js production build and standalone startup | Passed                                |
| Production dependency audit                     | 0 known vulnerabilities at check time |
| Docker Compose configuration                    | Valid                                 |
| PostgreSQL migrations and isolated demo seed    | Applied successfully                  |

The integration suite verifies tenant foreign keys, service-level tenant checks, invoice creation, receivables/payables, overpayment prevention, refund allocation, cash limits, immutable financial/audit records, deferred balance checks, passport encryption, visa timelines, concurrent payments and IQD settlement at changing exchange rates.

The localization tests verify message coverage for both RTL languages, interpolated counts, language validation, locale formatting, Sorani month fallback and translated validation constraints.

Browser checks cover unauthorized access, sign-in, creating a customer and ticket, invoice rendering, visa creation, audited passport reveal, encrypted document upload/download, expenses, report CSV export, ledger reconciliation, 390px/412px mobile layouts, navigation, Sorani and Arabic RTL, persisted dark mode, language selection on login, localized reports, RTL invoice printing and Arabic login errors. Tests run only against an explicitly configured demo environment. Browser artifacts can contain demo login/session information and remain ignored by Git.

The PostgreSQL container and Compose configuration were checked; a complete application Docker image build was not performed. Browser checks emulate device viewports with Linux Chromium, rather than physical Android, iPhone or Windows devices. No Vercel/hosted PostgreSQL credentials were supplied. A temporary HTTPS Tunnelmole demo preview has been verified separately; it depends on the running workspace and is not a persistent production deployment. Follow DEPLOYMENT.md for durable hosting and hosted acceptance checks.

Login, forms, explanatory UI copy, statuses, reports, printed invoices and common server errors support English, Sorani and Arabic. The chosen language persists in a validated preference cookie and browser storage. User-entered names, notes and customized receipt text retain their original language. Sorani Gregorian month names have an explicit fallback for browsers without Sorani locale data. Reminders are in-app. PDFs use the browser print dialog. Large-dataset server pagination, external reminder delivery, malware scanning, MFA/SSO, statutory tax reporting and automated unrealized FX revaluation are outside this release.
