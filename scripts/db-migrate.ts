import "./load-env";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

const connectionUrl = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? "";

function isLocalRavilo(url: string) {
  return /ravilo:ravilo@localhost|localhost:5432\/ravilo/i.test(url);
}

function splitSql(contents: string) {
  return contents
    .split(/--> statement-breakpoint/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  if (!connectionUrl) {
    console.error(`
Supabase nu este conectat.

1. Dashboard → Settings → Database → URI (direct, port 5432, NU pooler:6543)
2. Pune-l în .env.local ca DATABASE_DIRECT_URL
3. SAU deschide SQL Editor și rulează, în ordine:
   - supabase/migrations/0000_init.sql
   - supabase/migrations/0001_rls_functions_storage.sql
   - supabase/migrations/0002_i18n_demo.sql
   - supabase/migrations/0003_demo_extras.sql
   - supabase/migrations/0004_catalog_admin.sql
`);
    process.exit(1);
  }
  if (isLocalRavilo(connectionUrl)) {
    throw new Error(
      "DATABASE_URL încă pointează la Postgres local (user ravilo). Folosește connection string-ul din Supabase → Settings → Database, nu Docker.",
    );
  }
  const sql = postgres(connectionUrl, { prepare: false, max: 1 });
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => path.join(dir, name));
  for (const file of files) {
    const id = path.relative(process.cwd(), file).replaceAll("\\", "/");
    const applied = await sql<{ id: string }[]>`SELECT id FROM public.schema_migrations WHERE id = ${id}`;
    if (applied.length) {
      console.log(`skip ${id}`);
      continue;
    }
    const raw = readFileSync(file, "utf8");
    const statements = splitSql(raw);
    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    await sql`INSERT INTO public.schema_migrations (id) VALUES (${id})`;
    console.log(`applied ${id}`);
  }
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
