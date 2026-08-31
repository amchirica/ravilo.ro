export type AuthScope = "shop" | "admin";

export const ADMIN_AUTH_COOKIE = "ravilo-admin-auth";

export function cookieOptionsFor(scope: AuthScope) {
  if (scope === "admin") {
    return { name: ADMIN_AUTH_COOKIE, path: "/", sameSite: "lax" as const };
  }
  return undefined;
}

export function cookiesForScope(all: { name: string; value: string }[], scope: AuthScope) {
  return all.filter((cookie) =>
    scope === "admin" ? cookie.name.startsWith(ADMIN_AUTH_COOKIE) : !cookie.name.startsWith(ADMIN_AUTH_COOKIE),
  );
}

export function refererPathname(referer: string | null | undefined) {
  if (!referer) return "";
  try {
    return new URL(referer).pathname;
  } catch {
    return "";
  }
}

export function authScopeFromRequest(pathname: string, referer?: string | null): AuthScope {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname) return "shop";
  const refererPath = refererPathname(referer);
  if (refererPath.startsWith("/admin")) return "admin";
  return "shop";
}
