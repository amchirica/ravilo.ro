import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && url.startsWith("http") && service && service.length > 20);
}

export function isSupabasePublicConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.startsWith("http") && anon && anon.length > 20);
}

/** Server-only client (service role). Never import from `use client`. */
export function sb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase nu este configurat. Completează NEXT_PUBLIC_SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY în .env.local (din Dashboard → Settings → API).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listRows<T>(
  table: string,
  opts?: { order?: string; ascending?: boolean; eq?: [string, string | boolean]; is?: [string, null]; limit?: number },
): Promise<T[]> {
  if (!isSupabaseConfigured()) return [];
  const { camelList } = await import("@/lib/supabase/rows");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb().from(table).select("*");
  if (opts?.eq) query = query.eq(opts.eq[0], opts.eq[1]);
  if (opts?.is) query = query.is(opts.is[0], opts.is[1]);
  if (opts?.order) query = query.order(opts.order, { ascending: opts.ascending ?? true });
  if (opts?.limit) query = query.limit(opts.limit);
  const { data } = await query;
  return camelList<T>(data);
}
