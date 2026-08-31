import { cookies, headers } from "next/headers";
import { routing, type AppLocale } from "@/i18n/routing";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

export { LOCALE_COOKIE };

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "ro" || value === "en";
}

export async function localeFromRequestPath(): Promise<AppLocale> {
  const pathname = (await headers()).get("x-ravilo-pathname") ?? "";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname.startsWith("/admin")) {
    const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    return cookie === "en" ? "en" : "ro";
  }
  return routing.defaultLocale;
}
