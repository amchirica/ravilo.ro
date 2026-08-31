import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

export async function requestLocale(): Promise<AppLocale> {
  try {
    const locale = await getLocale();
    return locale === "en" ? "en" : "ro";
  } catch {
    return "ro";
  }
}
