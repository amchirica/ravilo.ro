"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

export function AdminLanguageSwitcher({ tone = "band" }: { tone?: "band" | "ink" }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("admin");
  const active = tone === "band" ? "text-paper" : "text-ink";
  const idle = tone === "band" ? "text-line hover:text-paper" : "text-mute hover:text-ink";

  function switchTo(next: "ro" | "en") {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em]" aria-label={t("language")}>
      <button type="button" className={locale === "ro" ? active : idle} onClick={() => switchTo("ro")}>
        RO
      </button>
      <span className={tone === "band" ? "text-line" : "text-mute"}>|</span>
      <button type="button" className={locale === "en" ? active : idle} onClick={() => switchTo("en")}>
        EN
      </button>
    </div>
  );
}
