import { NextResponse, type NextRequest } from "next/server";
import { applyLocaleRouting } from "@/lib/intl-proxy";
import { safeInternalPath } from "@/lib/redirect";
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

  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    const scope = pathname.startsWith("/admin") ? "admin" : "shop";
    const { user, response } = await sessionUser(request, requestHeaders, undefined, scope);
    if (pathname.startsWith("/api") && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
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
    if (pathname.startsWith("/admin") && !isPublicAdminPath(pathname) && !user) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", safeInternalPath(pathname, "/admin"));
      return redirectWithCookies(login, response);
    }
    return response;
  }

  const intlResponse = applyLocaleRouting(request);
  const { user, response } = await sessionUser(request, requestHeaders, intlResponse, "shop");
  const prefix = pathname.startsWith("/en") ? "/en" : "";

  if (["/cont"].some((item) => path === item || path.startsWith(`${item}/`)) && !user) {
    const login = new URL(`${prefix}/auth/login`, request.url);
    login.searchParams.set("next", safeInternalPath(pathname, prefix ? `${prefix}/cont` : "/cont"));
    return redirectWithCookies(login, response);
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!_next/static|_next/image|favicon.ico|demo/|placeholders/|.*\\..*).*)"],
};
