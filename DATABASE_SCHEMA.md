# Database schema

PostgreSQL pe **Supabase Cloud**. SQL canonic: `supabase/migrations/`.

- `0000_init.sql` — tabele, enum-uri, indexuri, FK
- `0001_rls_functions_storage.sql` — RLS, trigger auth, `reserve_inventory` / `confirm_inventory_sale` / `next_order_number`, storage

Aplicația accesează tabelele prin `@supabase/supabase-js` (service role, server-only). Fără Drizzle, Prisma sau Postgres local.
