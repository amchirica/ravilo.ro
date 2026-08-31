# RAVILO Security

Security is a product requirement. This document is the operational checklist, not an afterthought.

## Architecture

Modular monolith. Browser talks only to Next.js. Next.js talks to PostgreSQL, Stripe, email, and object storage using server-only secrets.

The storefront never receives:

- `costPrice`, margins, supplier records
- other customers’ PII
- admin notes, audit logs, inventory costs
- service role keys, webhook secrets, SMTP credentials
- raw card data (RAVILO never touches PAN/CVV)

## Authentication

- Identity: **Supabase Auth** (`auth.users`). RAVILO does not store passwords.
- Authorization: `public.profiles.role` + server RBAC on every admin mutation.
- Sessions: `@supabase/ssr` cookies. Middleware can redirect; pages/API re-check `getUser()`.
- Email verification, forgot/reset password via Supabase.
- Google / Apple later-ready as Auth providers.
- Admin MFA: Supabase TOTP. Production SUPER_ADMIN should require AAL2.
- Rate limits on login, register, forgot-password, checkout, coupons, contact, reviews.

Failed logins do not reveal whether an email exists (generic error).

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never import the admin client in `use client` modules.

## Authorization (RBAC)

Permissions are enforced **server-side** on every mutation and privileged read.

| Role | Intent |
| --- | --- |
| CUSTOMER | Own account, own orders, own wishlist |
| STAFF | Read catalog/orders as granted |
| EDITOR | Content / CMS |
| MANAGER | Catalog, inventory, orders, discounts |
| ADMIN | Users (except SUPER_ADMIN), settings |
| SUPER_ADMIN | All permissions, including admin.manage |

Hiding UI is not security. `requirePermission(session, "order.refund")` runs in the server action.

## CSRF

- SameSite cookies
- Origin / Host checks on state-changing routes
- Server Actions with Next.js origin checks
- Webhooks authenticate via provider signatures, not cookies

## XSS

- Zod max lengths
- CMS / journal HTML sanitized with `sanitize-html` (strict allowlist)
- No `dangerouslySetInnerHTML` without sanitization
- Admin is not a trusted HTML source (stored XSS can hijack other admins)

## SQL injection

Prisma parameterized queries only. Raw SQL, if used (locking), uses tagged parameters.

## Mass assignment

Never `update({ data: body })`. Every write uses an allowlisted Zod schema.

## Payments

See `PAYMENTS.md`. Card data never hits RAVILO servers. Webhooks: signature + idempotency. Orders become PAID only after verified provider confirmation.

## File uploads

- Admin-only
- MIME allowlist (JPEG, PNG, WebP, AVIF, MP4) + magic-byte check
- Size cap
- Random object keys (no user path)
- No SVG unless a sanitizer is added
- Object storage, not executable public disk paths

## Secrets

- Validated at boot via `src/lib/env.ts`
- `.env*` gitignored except `.env.example` (names only)
- No `NEXT_PUBLIC_` for secrets
- Logs redact tokens, cookies, authorization headers, card-like numbers

## Rate limiting

Upstash Redis when configured; in-memory sliding window otherwise (best-effort on a single instance). Webhooks are exempt from user rate limits but are signature-gated.

## Headers

Set in `next.config.ts` and middleware:

- `Content-Security-Policy` (Stripe + analytics allowlists)
- `Strict-Transport-Security` (production)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `X-Frame-Options: DENY` / CSP `frame-ancestors 'none'` (admin + account). Checkout may need Stripe frames as allowed by CSP.

No `unsafe-eval`.

## Open redirect

`next` / `returnTo` / `callback` only accept internal relative paths. Protocol-relative and external URLs rejected.

## SSRF

Remote media URLs are stored, not fetched by the server into private networks. If fetching is added, use an allowlist and block link-local / RFC1918.

## Caching

`Cache-Control: private, no-store` for account, admin, cart, checkout, session APIs.

## RLS (Supabase)

If the database is Supabase, apply `supabase/migrations/0001_rls_functions_storage.sql`. The Next.js server uses **DATABASE_URL** (postgres). The service role is server-only and must never reach the browser. Customers must not have a PostgREST policy that can read costs, other orders, or admin tables.

Even without Supabase, the app uses a least-privilege DB user in production (no public `0.0.0.0/0` without SSL + strong password + firewall).

## Logging & monitoring

- Structured JSON logs with request id, order id, payment id
- No passwords, session tokens, card data, or unnecessary PII
- Sentry DSN optional (`SENTRY_DSN`)
- `/api/health` returns `{ ok: true }` only

## Incident response (minimum)

1. Rotate leaked secrets immediately (DB, Stripe, session cookie secret, SMTP).
2. Invalidate sessions (`Session` table truncate or `revokedAt`).
3. Disable checkout via feature flag / payment method flag if needed.
4. Preserve audit logs and payment events.
5. Notify affected users if PII leaked (GDPR).
6. Post-mortem: cause, blast radius, fix, monitoring gap.

## Production go-live checklist

- [ ] HTTPS only, HSTS on
- [ ] All env vars set; `npm run typecheck` / `build` green
- [ ] Stripe live keys + webhook endpoint with signing secret
- [ ] Webhook tested (succeeded, duplicate, invalid signature)
- [ ] SUPER_ADMIN MFA enabled
- [ ] Default seed admin password changed / dev seed disabled
- [ ] DB not publicly unrestricted; backups enabled
- [ ] Object storage private + signed reads if needed
- [ ] CSP verified with Stripe + analytics
- [ ] Cookie consent before marketing scripts
- [ ] Legal pages filled with real company data
- [ ] Rate limits verified
- [ ] Error pages do not leak stacks
- [ ] `npm audit` reviewed
