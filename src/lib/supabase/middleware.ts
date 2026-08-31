import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOptionsFor, cookiesForScope, type AuthScope } from "@/lib/supabase/auth-scope";

export function createMiddlewareSupabase(
  request: NextRequest,
  requestHeaders?: Headers,
  existingResponse?: NextResponse,
  scope: AuthScope = "shop",
) {
  const headers = requestHeaders ?? request.headers;
  const response = existingResponse ?? NextResponse.next({ request: { headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { supabase: null, response };
  }
  const cookieOptions = cookieOptionsFor(scope);
  const supabase = createServerClient(url, key, {
    ...(cookieOptions ? { cookieOptions } : {}),
    cookies: {
      getAll() {
        return cookiesForScope(request.cookies.getAll(), scope);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  return { supabase, response };
}

export function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export function isPublicAdminPath(pathname: string) {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}
