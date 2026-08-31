# RAVILO store completion report

RAVILO now has a bilingual, themed storefront fed from Supabase — not from hardcoded product arrays in React.

Stack unchanged: Next.js App Router, TypeScript, `@supabase/supabase-js`, Stripe adapter, server-side pricing/stock. No Prisma, no Drizzle, no Docker, no local PostgreSQL.

---

## Demo catalog

Seed writes **`is_demo = true`** on all generated commercial rows. No fake orders. No fake reviews.

| Entity | Count | Notes |
| --- | ---: | --- |
| Top categories | 5 | AUTO, TECH, HOME, TRAVEL, EDC |
| Subcategories | 25 | 5 per parent, RO + EN |
| Products | **40** | AUTO 10, TECH 10, HOME 8, TRAVEL 7, EDC 5 |
| RAVILO Picks | 8 | `is_ravilo_pick` |
| Demo bestsellers | 6 | `is_demo_bestseller` — storefront label **Popular** / **Demo bestseller**, not claimed as real sales |
| Compare-at prices | 8 (~20%) | −10% to −20% only |
| Collections | 7 | Picks, New Arrivals, Drive/Desk/Travel Essentials, Smart Home Starter, EDC Essentials |
| Bundles | 4 | Price below sum of items |
| Journal articles | 5 | RO + EN, marked demo |
| FAQ | 5 | Livrare, Retur, Garanție, Plată, Stoc |

Product names are RAVILO-owned (Drive Mount, GaN 65, FlexCable 100W, Travel Adapter Pro, EDC Wallet, …). Apple “AirTag” was not used (`RAVILO Tracker Sleeve` instead).

Prices in RON bani: 49 / 69 / 79 / 99 / 129 / 149 / 179 / 199 / 249 lei (and kit prices). Stock values used: **0, 3, 5, 8, 12, 20, 35**. Public DTO exposes only `IN_STOCK | LOW | OUT`, never reserved quantity or cost price.

Placeholders: `/public/demo/products/*.svg` (neutral package silhouette, no commercial photography).

---

## Homepage (CMS)

Announcement, header, hero, category grid, RAVILO Picks, Popular, shop-by-problem, featured bundle, new arrivals, editorial, Why Ravilo, journal, newsletter, footer.

Hero copy matches the brief (RO / EN). Shop-by-problem uses the six requested problems.

Every section is a `homepage_sections` row, editable in **Admin → Homepage**, including RO/EN titles and Light/Dark + RO/EN preview chrome (same published content for both themes).

---

## Dark / light / system

- `next-themes`, `attribute="class"`, `enableSystem`, `disableTransitionOnChange`
- Storefront storage key: `ravilo-store-theme`
- Admin storage key: `ravilo-admin-theme` (separate preference)
- CSS tokens: `--background`, `--foreground`, `--surface`, `--surface-secondary`, `--border`, `--muted`, `--accent`, `--band`, `--danger`, `--success`, `--warning`
- Light paper `#F4F2ED` … dark background `#121311`
- Product images: class `product-photo`, no invert
- Header sun/moon control with Light / Dark / System

---

## i18n architecture

- **next-intl** App Router
- Default locale **RO** at `/`
- English at `/en…` (`localePrefix: "as-needed"`)
- Cookie: `RAVILO_LOCALE` (no geolocation; `localeDetection: false`)
- UI strings: `messages/ro.json`, `messages/en.json`
- Commercial content: RO in canonical columns (`name`, `title`, …), EN in `*_en` / `content_en`
- Fallback: empty EN → RO; never `undefined`
- Admin badges: **RO ✓** / **EN ⚠**
- Language switcher keeps the current path
- `Intl.NumberFormat` / `Intl.DateTimeFormat` via `formatMoney` / `formatDate`
- Currency remains **RON** (EUR-ready in settings schema, no switcher)

SEO:

- `hreflang`: `ro-RO`, `en`, `x-default` (RO)
- Canonical per locale
- Sitemap emits RO + EN URLs
- Product JSON-LD uses the page language and `priceCurrency: RON`

---

## Admin translation workflow

Product editor tabs: **General, Pricing, Inventory, Media, Attributes, Translations, SEO**.

Translations tab: RO column + EN column (name, short, long, why, specs, box). Missing EN does not block publish.

Homepage sections: RO/EN title/subtitle fields + translation status.

**Admin → Development** (`/admin/dezvoltare`):

- Visible only when `ALLOW_DEV_SEED=true`
- Confirm before seed / reset
- Reset deletes **only** `is_demo = true` (never real orders)

Production guard: seed throws if `NODE_ENV === production` and `ALLOW_DEV_SEED !== true`.

---

## Seed commands

```bash
# 1. Apply SQL (Supabase direct URI in DATABASE_DIRECT_URL, not localhost)
npm run db:migrate

# 2. Local SVG placeholders (also run by db:seed)
npm run demo:placeholders

# 3. Catalog + CMS into Supabase
#    requires ALLOW_DEV_SEED=true
npm run db:seed
```

Migrations added:

- `supabase/migrations/0002_i18n_demo.sql` — bilingual columns, `is_demo`, tags
- `supabase/migrations/0003_demo_extras.sql` — bundle `image_path`, unique bundle slug

Or from the admin Development screen after migrate.

---

## Tests

Vitest (`npm test`): money/RBAC existing suites plus `tests/i18n-demo.test.ts`

- locale fallback
- EN missing badge logic
- hreflang alternates
- locale-aware RON formatting
- seed production / flag guards
- public stock status (no reserved qty)

Playwright (`npm run e2e`): RO homepage, EN homepage + language switch, theme persistence, product/cart/checkout/admin/404.

---

## Public product DTO

Returned to the storefront: id, localized name/descriptions, slug, price, comparePrice, image, stockStatus, badges, variants with `inStock` boolean.

Not returned: `cost_price`, reserved quantity, supplier, admin notes, service role.

---

## Remaining TODOs

1. **Run migrate + seed** against the project Supabase project (`ALLOW_DEV_SEED=true`). This environment had `ALLOW_DEV_SEED=false` in `.env.local`.
2. Wire **guest wishlist** local IDs to `/cont/wishlist` after login.
3. Expand bilingual editors for FAQ, journal, and static pages to the same tabbed UX as products (columns already exist).
4. Production bestsellers: compute from paid orders when volume exists; keep `is_demo_bestseller` off in production.
5. Playwright against a seeded database for product-page copy assertions.
6. Optional: map `/en/product/...` pathnames if you later want English URL segments; currently slugs stay `/produs/...` under `/en`.
7. Fill legal company data in Admin → Settings before live orders.

---

## Manual QA checklist

After seed, check Light/Dark × RO/EN on: homepage, category, product, search (`RAVILO`, `charger`, `cable`, `travel`, `car`, `home`), cart, checkout, account, admin, journal, 404, cookie banner.
