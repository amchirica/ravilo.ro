import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sb } from "@/lib/supabase/db";

export function createAdminSupabase() {
  return sb();
}

/** Script-safe admin client (no Next server-only getEnv). */
export function createScriptSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
