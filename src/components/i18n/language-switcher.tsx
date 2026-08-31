"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");
  const query = searchParams.toString();

  function switchTo(next: "ro" | "en") {
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: next });
  }

  return (
    <div className="flex h-11 items-center gap-1 px-2 text-[0.6875rem] uppercase tracking-[0.16em]" aria-label={t("language")}>
      <button type="button" className={locale === "ro" ? "text-ink" : "text-mute hover:text-ink"} onClick={() => switchTo("ro")}>
        RO
      </button>
      <span className="text-line">|</span>
      <button type="button" className={locale === "en" ? "text-ink" : "text-mute hover:text-ink"} onClick={() => switchTo("en")}>
        EN
      </button>
    </div>
  );
}
