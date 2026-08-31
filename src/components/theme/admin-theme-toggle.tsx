"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { useTranslations } from "next-intl";

export function AdminThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("nav");
  const isDark = resolvedTheme === "dark";
  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-full p-2 text-current opacity-70 hover:opacity-100"
        aria-label={t("theme")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <select
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
