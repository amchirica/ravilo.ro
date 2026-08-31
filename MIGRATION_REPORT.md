# Migration report — Prisma/Docker/Drizzle → Supabase JS

Date: 2026-08-28

## Ce s-a scos

- Prisma + Docker (deja scoase)
- Drizzle ORM, drizzle-kit, schema TypeScript din `src/db`
- Runtime `DATABASE_URL` către Postgres local (`ravilo@localhost`) — cauza erorii `password authentication failed for user "ravilo"`

## Stack curent

Next.js + TypeScript + `@supabase/supabase-js` / `@supabase/ssr`. Baza de date este **doar Supabase Cloud**.

## SQL

`supabase/migrations/0000_init.sql` + `0001_rls_functions_storage.sql`

## Env obligatoriu

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Fără aceste chei, homepage-ul nu mai dă 500: se afișează setările implicite.
