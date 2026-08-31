import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieOptionsFor, cookiesForScope, type AuthScope } from "@/lib/supabase/auth-scope";

export async function createServerSupabase(scope: AuthScope = "shop") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const cookieStore = await cookies();
  const cookieOptions = cookieOptionsFor(scope);
  return createServerClient(url, key, {
    ...(cookieOptions ? { cookieOptions } : {}),
    cookies: {
      getAll() {
        return cookiesForScope(cookieStore.getAll(), scope);
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const nextOptions = { ...options };
            delete (nextOptions as { name?: string }).name;
            cookieStore.set(name, value, nextOptions);
          });
        } catch {
          // Server Components cannot always set cookies; middleware refreshes the session.
        }
      },
    },
  });
}
