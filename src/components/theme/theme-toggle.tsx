"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("nav");
  const isDark = resolvedTheme === "dark";
  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center text-ink/75 transition-colors duration-200 hover:text-ink"
        aria-label={t("theme")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <label className="sr-only" htmlFor="theme-select">
        {t("theme")}
      </label>
      <select
        id="theme-select"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={theme}
        onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
        aria-label={t("theme")}
      >
        <option value="light">{t("light")}</option>
        <option value="dark">{t("dark")}</option>
        <option value="system">{t("system")}</option>
      </select>
    </div>
  );
}
