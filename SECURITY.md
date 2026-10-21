# Security boundaries

- Only `/login`, static application assets, the manifest and service-worker offline page are public. Every operational page and data/document API checks staff access on the server.
- Passwords use bcrypt with cost 12. Sessions are random 256-bit opaque tokens, stored as SHA-256 hashes in PostgreSQL, expire after eight hours, and use HttpOnly, Strict SameSite cookies; production adds Secure and the `__Host-` prefix.
- Login attempts are limited per normalized account for a fifteen-minute window. Production should also add IP-level rate limiting and bot protection at the host/edge; there is no shared in-memory limiter masquerading as distributed protection.
- Mutating browser requests require an exact `Origin` match against `APP_URL`. Tenant IDs come from the authenticated session, never from user form data. Composite foreign keys reject cross-agency references.
- Staff deactivation and password changes revoke sessions. Role changes invalidate sessions and take effect on the next server request.
- Passport numbers and all uploaded files use randomized authenticated AES-256-GCM encryption. Keep the 32-byte hex key in a secret manager. Key rotation requires decrypting/re-encrypting records with a controlled migration; replacing the key alone destroys access.
- Attachments are private database bytes, not public URLs. File names are sanitized, MIME signatures checked, uploads limited to 3 MB, and downloads audited. A dedicated malware scanner is not included.
- Financial postings use serializable transactions, decimals, nonnegative constraints, database-level immutability and deferred balanced-journal checks. Invoice allocation prevents overpayments; cash and supplier checks reject unsupported outflows.
- Audit logs exclude passwords, passport contents and document bytes. Staff actions, passport reveals, document access, role changes and financial postings are recorded. Database owners can still bypass database triggers; production runtime credentials should not own tables.
- CSP, frame denial, MIME sniffing protection, restrictive permissions policy and private/no-store response headers are configured. CSV exports neutralize spreadsheet formula prefixes.
- The service worker never caches authenticated pages, APIs, attachments or credentials. It supplies a generic offline message for failed navigations.
- Demo login is available only when the runtime's `DEMO_MODE` matches an explicitly demo agency. Seeding requires an empty database with `demo` in its name. Production setup refuses demo mode.

Before real operations, configure HTTPS, a limited PostgreSQL runtime role, backups, secret storage, host-level monitoring and rate limiting. MFA, SSO, automatic tax calculation, statutory reporting and disaster-recovery automation are not included. This is application-level tenant isolation plus relational integrity; PostgreSQL row-level-security policies are not enabled.

The dependency overrides in `package.json` patch two transitive Prisma configuration dependencies without upgrading the Prisma schema/runtime major version. They are covered by migration, generation and PostgreSQL workflow tests; review them when upgrading Prisma.
