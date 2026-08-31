"use client";

import { useState } from "react";

export function AdminPreviewBar() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [locale, setLocale] = useState<"ro" | "en">("ro");
  return (
    <div className="mb-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em]" data-preview-theme={theme} data-preview-locale={locale}>
      <button type="button" className={theme === "light" ? "text-ink" : "text-mute"} onClick={() => setTheme("light")}>
        Light
      </button>
      <button type="button" className={theme === "dark" ? "text-ink" : "text-mute"} onClick={() => setTheme("dark")}>
        Dark
      </button>
      <span className="text-line">·</span>
      <button type="button" className={locale === "ro" ? "text-ink" : "text-mute"} onClick={() => setLocale("ro")}>
        RO
      </button>
      <button type="button" className={locale === "en" ? "text-ink" : "text-mute"} onClick={() => setLocale("en")}>
        EN
      </button>
      <p className="w-full text-[11px] font-sans normal-case tracking-normal text-mute">
        Previzualizare {theme} / {locale} în admin. Textul de mai jos este pagina de acasă, nu setările magazinului.
      </p>
    </div>
  );
}
