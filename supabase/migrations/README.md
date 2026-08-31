# Database migrations

Aplică în ordine pe **Supabase** (SQL Editor sau `npm run db:migrate` cu `DATABASE_DIRECT_URL` din Dashboard → Database):

1. `0000_init.sql` — tabele, enum-uri, indexuri, FK
2. `0001_rls_functions_storage.sql` — RLS, trigger auth, funcții stoc, storage

Nu folosi Postgres local (`ravilo@localhost`) și nu folosi Drizzle.
