# Supabase

RAVILO folosește **doar** proiectul Supabase cloud:

- Auth: `@supabase/ssr` (browser + middleware + server)
- Date: `@supabase/supabase-js` cu **service role pe server** (`src/lib/supabase/db.ts`)
- Storage: bucket-uri `products`, `cms`, `journal`, `avatars`

Nu există Docker, Prisma sau Drizzle în runtime.

## Chei obligatorii (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Service role **nu** se pune în `NEXT_PUBLIC_*` și nu se importă din `use client`.

Fără aceste chei, magazinul pornește cu setări implicite (fără 500 pe homepage), dar catalogul e gol.

## Migrări

SQL: `supabase/migrations/0000_init.sql` apoi `0001_rls_functions_storage.sql`.

```bash
# URI direct din Dashboard → Settings → Database (port 5432), NU localhost ravilo
DATABASE_DIRECT_URL=postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres
npm run db:migrate
```

Sau SQL Editor, în aceeași ordine.

## RLS

RLS e activ. Anon/authenticated nu văd `cost_price` sau tabele de plăți. Storefront-ul citește prin service role pe server și trimite DTO-uri publice (`PublicProduct`).

Signup setează mereu `CUSTOMER` (trigger `handle_new_user`). Clientul nu poate schimba `role` / `status`.
