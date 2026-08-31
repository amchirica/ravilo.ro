# RAVILO

Magazin online production-oriented pentru `ravilo.ro`.

**Lucruri bune. Alese simplu.**

Clientul **nu este niciodată sursa de adevăr** pentru preț, stoc, discount, taxă, transport, plată sau roluri.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase (Auth + PostgreSQL + Storage) via `@supabase/supabase-js`
- RBAC în `public.profiles`
- Stripe adapter + mock în development
- Resend / console email
- Upstash Redis (rate limit, opțional)

Fără Docker, Prisma sau Drizzle. Runtime-ul vorbește doar cu Supabase Cloud.

## Setup local

1. Creează un proiect Supabase (cloud). CLI local e opțional și nu e fluxul default.
2. Copiază `.env.example` → `.env.local`
3. Completează:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_URL=http://localhost:3000
AUTH_SECRET=            # openssl rand -base64 48
PAYMENT_PROVIDER=mock
EMAIL_PROVIDER=console
ALLOW_DEV_SEED=true
```

4. Rulează:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run create-admin -- tu@email.com
npm run dev
```

`create-admin` trimite un invite/reset prin Supabase Auth. **Nu există parolă hardcodată.**

Auth redirect URLs în Supabase:

- `http://localhost:3000/auth/verificare`
- `http://localhost:3000/auth/reset`
- site URL: `http://localhost:3000`

## Scripts

| Command | Scop |
| --- | --- |
| `npm run dev` | dezvoltare |
| `npm run build` | producție |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run e2e` | Playwright (necesită `npx playwright install`) |
| `npm run db:migrate` | aplică SQL din `supabase/migrations` pe URI-ul Supabase |
| `npm run db:seed` | seed (doar `ALLOW_DEV_SEED=true`) |
| `npm run create-admin` | invite SUPER_ADMIN |
| `npm run security:audit` | npm audit |

## Plăți

Vezi `PAYMENTS.md`. **Supabase nu confirmă plăți.** Doar webhook-ul Stripe/mock, după verificare de semnătură.

## Documente

- `SUPABASE.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `SECURITY.md`
- `PAYMENTS.md`
- `ADMIN_MANUAL.md`
- `BACKUP_AND_RECOVERY.md`
- `DATA_RETENTION.md`
- `MIGRATION_REPORT.md`
