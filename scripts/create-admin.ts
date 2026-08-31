import "./load-env";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: npm run create-admin -- you@example.com");
  process.exit(1);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_CREATE_SUPER_ADMIN !== "true") {
    throw new Error("Refusing to create SUPER_ADMIN without ALLOW_CREATE_SUPER_ADMIN=true");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  try {
    const payload = JSON.parse(Buffer.from(service.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as {
      role?: string;
    };
    if (payload.role === "anon") {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is the anon key. Use the service_role secret from Supabase → Settings → API.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("anon key")) throw error;
  }
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { firstName: "Admin", lastName: "RAVILO" },
    redirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/reset`,
  });
  if (error && !/already registered|already been registered/i.test(error.message)) {
    throw error;
  }
  let userId = data?.user?.id;
  if (!userId) {
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list.users.find((user) => user.email === email)?.id;
  }
  if (!userId) throw new Error("Could not resolve auth user");
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    first_name: "Admin",
    last_name: "RAVILO",
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  console.log(`SUPER_ADMIN ready: ${email}. Set the password via the invite/reset email. No password is stored in RAVILO.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
