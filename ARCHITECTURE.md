# RAVILO Architecture

Production ecommerce platform for `ravilo.ro`. Modular monolith. PostgreSQL is the source of truth. The client is never trusted for prices, stock, discounts, tax, shipping, payment status, or permissions.

## Surfaces

| Surface | Path | Audience |
| --- | --- | --- |
| Storefront | `/` | Public shoppers |
| Account | `/cont` | Authenticated customers |
| Admin | `/admin` | Staff with RBAC |
| APIs / webhooks | `/api` | Server-only, except explicitly public routes |
| Health | `/api/health` | Uptime probes (no infrastructure leak) |

## Stack

- **App:** Next.js App Router, TypeScript strict, React Server Components
- **UI:** Tailwind CSS + internal design system (`src/components/ui`)
- **DB:** Supabase PostgreSQL via `@supabase/supabase-js` (service role, server-only)
- **Auth:** Supabase Auth (identity) + RAVILO `profiles` RBAC (authorization)
- **Payments:** Provider adapters (Stripe first; NETOPIA / EuPlatesc / PayU later)
- **Email:** Outbox + provider adapter (Resend / console)
- **Storage:** Supabase Storage
- **Validation:** Zod at every external boundary
- **Money:** Integer minor units (bani). Never JS floats for totals.

## Directory map

```
src/app            routes (storefront, account, admin, api)
src/components     UI primitives and layout
src/features       feature modules (auth, catalog, cart, checkout, cms, …)
src/db             (removed — no Drizzle)
src/lib            env, supabase clients, money, logging, security
src/server         session, rbac, actions
src/schemas        Zod contracts
src/types          shared types / DTOs
src/hooks          client hooks
src/emails         React Email templates
supabase/migrations SQL + RLS
scripts            migrate, seed, create-admin
tests              unit / integration
e2e                Playwright
```

Business logic lives in `services` and `server`, not in React components. Components call server actions or read DTOs.

## Trust boundary

```
Browser  →  Next.js server  →  Drizzle  →  Supabase PostgreSQL
              │
              ├─ Supabase Auth (session)
              ├─ Supabase Storage (admin media)
              ├─ Stripe (adapter) ← signed webhook → Next.js → transaction
              └─ Resend / console email
```

Supabase **does not** confirm payments. Stripe (or mock) webhook remains the source of truth.

Public APIs return allowlisted DTOs. Admin APIs require a server-verified session **and** permission. Hiding a button is not authorization.

## Control plane

Everything commercial on the storefront is stored in the database and edited in Admin:

- products, prices, variants, media
- categories, collections, bundles
- homepage sections, hero, banners, announcements
- navigation, footer, FAQ, pages, journal
- shipping methods, free-shipping threshold
- payment method availability (not secrets)
- SEO, site settings, legal page content

Frontend renders what Admin publishes. Seed data is a default, not a hardcode.

## Request flow (checkout)

1. Client submits cart identity (cookie / session), shipping choice, addresses, discount code.
2. Server loads cart + live catalog rows.
3. Server verifies product status, variant status, stock.
4. Server recalculates line prices, discounts, shipping, VAT, grand total in bani.
5. Transaction: create `PENDING_PAYMENT` order (snapshots), reserve inventory, write audit.
6. Payment adapter creates hosted checkout / Payment Element session.
7. Customer pays at the provider. Browser redirect is **not** proof of payment.
8. Webhook: verify signature, idempotency key, confirm payment, convert reservation → sale, mark order `PAID`, enqueue email.

## Caching

Public catalog/category/page content may be cached and revalidated.

Never put cart, account, orders, admin, checkout, or session responses in a shared public cache.

## Jobs

- Release expired inventory reservations
- Retry email outbox
- Optional analytics / sitemap rebuild

Vercel Cron (or equivalent) hits authenticated `/api/cron/*` with `CRON_SECRET`.

## Feature flags

Unfinished or optional capabilities are gated (`reviews`, `bundles`, `wishlist`, extra payment providers). Disabled flags hide UI and reject related mutations.

## Deployment shape

Single Next.js app on Vercel (or Node host) + managed PostgreSQL + object storage + Stripe + email provider. HTTPS only in production. No microservices, GraphQL, or message buses on day one.
