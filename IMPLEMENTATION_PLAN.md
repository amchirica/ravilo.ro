# RAVILO Implementation Plan

Documents first (this folder), then implementation without stopping at docs.

## Build order

1. Project foundation — Next.js, env validation, headers, design tokens, folder layout
2. Database — Prisma schema, seed, RLS SQL
3. Authentication — Argon2id, sessions, verify, reset
4. RBAC — permission map, `requirePermission`
5. Admin skeleton — `/admin` shell, auth gate
6. Catalog — products, variants, categories, collections, media DTOs
7. Inventory — levels, ledger, reservations, cron
8. CMS — homepage, nav, pages, FAQ, journal, settings
9. Storefront — home, category, product, search, legal
10. Cart — guest cookie + customer persistence, server quote
11. Checkout — snapshots, guest checkout, company invoice fields
12. Payment provider — Stripe adapter + hosted checkout
13. Webhook — signature, idempotency
14. Orders — admin + customer views
15. Customer account
16. Discounts — server-side eligibility
17. Shipping — configurable methods + adapter interfaces
18. Reviews — moderation, verified purchase
19. Wishlist — local + DB merge
20. Bundles — component stock
21. Emails — templates + outbox
22. SEO — metadata, JSON-LD, sitemap, robots
23. Analytics — consent-gated GA4
24. Security hardening — CSRF, CSP, uploads, rate limits
25. Testing — unit, integration, Playwright
26. Documentation — README, ADMIN_MANUAL, BACKUP_AND_RECOVERY
27. Final audit — security + functional

## Non-goals (day one)

- PWA
- Microservices / Kafka / Kubernetes / GraphQL
- Fake courier APIs (interfaces + mock only)
- Invented legal company identity
- Fake production reviews
