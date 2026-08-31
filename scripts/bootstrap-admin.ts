import "./load-env";
import { createClient } from "@supabase/supabase-js";

function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!email || !email.includes("@") || !password || password.length < 8) {
    throw new Error("Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env.local (password min 8). Do not commit them.");
  }
  if (!url || !service) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  }
  if (jwtRole(service) === "anon") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is the anon key. Use the service_role secret from Supabase → Settings → API.");
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName: "Admin", lastName: "RAVILO" },
  });

  let userId = created.user?.id;
  if (createError) {
    const already = /already registered|already been registered|already exists/i.test(createError.message);
    if (!already) throw createError;
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id;
  }
  if (!userId) throw new Error("Could not resolve auth user");

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    first_name: "Admin",
    last_name: "RAVILO",
    role: "ADMIN",
    status: "ACTIVE",
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  console.log(`ADMIN ready for ${email}. You can remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from .env.local.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Bootstrap failed");
  process.exit(1);
});
