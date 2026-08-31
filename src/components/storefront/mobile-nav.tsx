"use client";

import { useEffect, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Menu, X } from "lucide-react";
import { IconButton } from "@/components/ui/primitives";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type NavItem = { id: string; url: string; label: string };

export function MobileNav({ items, label }: { items: NavItem[]; label: string }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && mounted
      ? createPortal(
          <nav
            className="fixed inset-0 z-[80] flex h-dvh flex-col bg-paper lg:hidden"
            aria-label={label}
            aria-modal="true"
            role="dialog"
          >
            <div className="flex h-[var(--header-h)] shrink-0 items-center justify-end border-b border-line px-4">
              <IconButton type="button" aria-label={t("close")} onClick={() => setOpen(false)}>
                <X size={22} />
              </IconButton>
            </div>
            <ul className="flex-1 overflow-y-auto px-6 py-6">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.url || "/"}
                    prefetch={false}
                    className="block py-3.5 text-2xl tracking-[-0.03em] text-ink"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-line px-6 py-5">
              <div className="grid gap-1 text-sm">
                <Link prefetch={false} href="/cont" className="py-2.5 text-ink/80" onClick={() => setOpen(false)}>
                  {t("account")}
                </Link>
                <Link prefetch={false} href="/favorite" className="py-2.5 text-ink/80" onClick={() => setOpen(false)}>
                  {t("wishlist")}
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Suspense>
                  <LanguageSwitcher />
                </Suspense>
                <ThemeToggle />
              </div>
            </div>
          </nav>,
          document.body,
        )
      : null;

  return (
    <div className="lg:hidden">
      <IconButton type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </IconButton>
      {panel}
    </div>
  );
}
