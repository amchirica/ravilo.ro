import { NextResponse, type NextRequest } from "next/server";
import { applyLocaleRouting } from "@/lib/intl-proxy";
import { safeInternalPath } from "@/lib/redirect";
import { hasAdminAuthCookie, hasShopAuthCookie } from "@/lib/supabase/auth-scope";
import { copyResponseCookies, createMiddlewareSupabase, isPublicAdminPath } from "@/lib/supabase/middleware";

function withoutLocale(pathname: string) {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return pathname.slice(3) || "/";
  }
  return pathname;
}

function redirectWithCookies(url: URL, source: NextResponse) {
  return copyResponseCookies(source, NextResponse.redirect(url));
}

function passThrough(request: NextRequest, requestHeaders: Headers) {
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function sessionUser(
  request: NextRequest,
  requestHeaders: Headers,
  existingResponse: NextResponse | undefined,
  scope: "shop" | "admin",
) {
  const { supabase, response } = createMiddlewareSupabase(request, requestHeaders, existingResponse, scope);
  if (!supabase) return { user: null, response };
  const { data } = await supabase.auth.getUser();
  return { user: data.user, response };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const path = withoutLocale(pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ravilo-pathname", pathname);

  if (pathname.startsWith("/api")) {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const isWebhook = pathname.startsWith("/api/webhooks/") || pathname.startsWith("/api/payments/mock/");
      const isCron = pathname.startsWith("/api/cron/");
      if (!isWebhook && !isCron) {
        const appUrl = process.env.APP_URL;
        if (appUrl) {
          const allowed = new URL(appUrl).origin;
          const origin = request.headers.get("origin");
          const referer = request.headers.get("referer");
          const originOk = origin ? origin === allowed : referer ? new URL(referer).origin === allowed : false;
          if (!originOk) {
            return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
          }
        }
      }
    }
    return passThrough(request, requestHeaders);
  }

  if (pathname.startsWith("/admin")) {
    const cookies = request.cookies.getAll();
    if (!isPublicAdminPath(pathname) && !hasAdminAuthCookie(cookies)) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", safeInternalPath(pathname, "/admin"));
      return NextResponse.redirect(login);
    }
    if (!hasAdminAuthCookie(cookies)) {
      return passThrough(request, requestHeaders);
    }
    const { user, response } = await sessionUser(request, requestHeaders, undefined, "admin");
    if (!isPublicAdminPath(pathname) && !user) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", safeInternalPath(pathname, "/admin"));
      return redirectWithCookies(login, response);
    }
    return response;
  }

  const intlResponse = applyLocaleRouting(request);
  const needsShopAuth = path === "/cont" || path.startsWith("/cont/");
  if (!needsShopAuth) return intlResponse;

  const prefix = pathname.startsWith("/en") ? "/en" : "";
  if (!hasShopAuthCookie(request.cookies.getAll())) {
    const login = new URL(`${prefix}/auth/login`, request.url);
    login.searchParams.set("next", safeInternalPath(pathname, prefix ? `${prefix}/cont` : "/cont"));
    return redirectWithCookies(login, intlResponse);
  }

  const { user, response } = await sessionUser(request, requestHeaders, intlResponse, "shop");
  if (!user) {
    const login = new URL(`${prefix}/auth/login`, request.url);
    login.searchParams.set("next", safeInternalPath(pathname, prefix ? `${prefix}/cont` : "/cont"));
    return redirectWithCookies(login, response);
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|demo/|placeholders/|.*\\..*).*)"],
};
