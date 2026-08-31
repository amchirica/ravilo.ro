import type { AppLocale } from "@/i18n/routing";

export function withLocalePrefix(path: string, locale: AppLocale) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale !== "en") return normalized;
  if (normalized === "/en" || normalized.startsWith("/en/")) return normalized;
  return `/en${normalized === "/" ? "" : normalized}`;
}
