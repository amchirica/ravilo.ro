import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { routing } from "./routing";
import { localeFromRequestPath } from "@/lib/ui-locale";

export default getRequestConfig(async ({ requestLocale }) => {
  const pathname = (await headers()).get("x-ravilo-pathname") ?? "";
  const requested = await requestLocale;
  const locale = pathname.startsWith("/admin")
    ? await localeFromRequestPath()
    : requested && routing.locales.includes(requested as "ro" | "en")
      ? (requested as "ro" | "en")
      : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
