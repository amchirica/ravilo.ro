import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_LOCALE = "ro";
const LOCALE_HEADER = "X-NEXT-INTL-LOCALE";
const LOCALE_COOKIE = "RAVILO_LOCALE";

function localeFromPath(pathname: string) {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return DEFAULT_LOCALE;
}

function stripDefaultPrefix(pathname: string) {
  if (pathname === "/ro") return "/";
  if (pathname.startsWith("/ro/")) return pathname.slice(3);
  return pathname;
}

function withLocaleHeader(request: NextRequest, locale: string) {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  headers.set("x-ravilo-pathname", request.nextUrl.pathname);
  return { request: { headers } };
}

function syncLocaleCookie(request: NextRequest, response: NextResponse, locale: string) {
  const dest = request.headers.get("sec-fetch-dest");
  if (dest != null && dest !== "document") return;
  if (request.cookies.get(LOCALE_COOKIE)?.value === locale) return;
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** next-intl as-needed rewrite without bundling `next-intl/middleware`. */
export function applyLocaleRouting(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/ro" || pathname.startsWith("/ro/")) {
    const url = request.nextUrl.clone();
    url.pathname = stripDefaultPrefix(pathname);
    const response = NextResponse.redirect(url);
    syncLocaleCookie(request, response, DEFAULT_LOCALE);
    return response;
  }

  const locale = localeFromPath(pathname);
  const headers = withLocaleHeader(request, locale);

  if (locale === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
    const response = NextResponse.rewrite(url, headers);
    syncLocaleCookie(request, response, locale);
    return response;
  }

  const response = NextResponse.next(headers);
  syncLocaleCookie(request, response, locale);
  return response;
}
