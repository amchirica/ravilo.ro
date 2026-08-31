export type AppLocale = "ro" | "en";

export function pickLocalized(ro: string | null | undefined, en: string | null | undefined, locale: AppLocale): string {
  if (locale === "en" && en && en.trim()) return en;
  return ro?.trim() ? ro : (en ?? "");
}

export function translationMissing(en: string | null | undefined): boolean {
  return !en || !en.trim();
}

export function intlLocale(locale: AppLocale): string {
  return locale === "en" ? "en-GB" : "ro-RO";
}

export function localizedUrls(pathWithoutLocale: string, appUrl: string) {
  const path = pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`;
  const ro = path === "/" ? appUrl : `${appUrl}${path}`;
  const en = path === "/" ? `${appUrl}/en` : `${appUrl}/en${path}`;
  return { ro, en, path };
}

export function hreflangLinks(pathWithoutLocale: string, appUrl: string) {
  const { ro, en } = localizedUrls(pathWithoutLocale, appUrl);
  return [
    { hrefLang: "ro-RO", href: ro },
    { hrefLang: "en", href: en },
    { hrefLang: "x-default", href: ro },
  ];
}

export function localeAlternates(pathWithoutLocale: string, locale: AppLocale, appUrl: string) {
  const { ro, en } = localizedUrls(pathWithoutLocale, appUrl);
  return {
    canonical: locale === "en" ? en : ro,
    languages: {
      "ro-RO": ro,
      en,
      "x-default": ro,
    } as Record<string, string>,
  };
}
