"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { withLocalePrefix } from "@/lib/locale-path";
import type { AppLocale } from "@/i18n/routing";
import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/primitives";

type Hit = { name: string; href: string };
type Groups = { products: Hit[]; categories: Hit[]; collections: Hit[]; articles: Hit[]; guides: Hit[]; boosts: Hit[] };

export function HeaderSearch() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const action = withLocalePrefix("/cautare", locale);
  const [q, setQ] = useState("");
  const [overlay, setOverlay] = useState(false);
  const [hits, setHits] = useState<Groups | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = q.trim().length >= 2;

  useEffect(() => {
    if (!overlay) return;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlay]);

  useEffect(() => {
    if (!overlay || q.trim().length < 2) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}&locale=${locale}`);
      if (!res.ok) return;
      setHits(await res.json());
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, locale, overlay]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if ((meta && event.key.toLowerCase() === "k") || (event.key === "/" && !isTyping(event))) {
        event.preventDefault();
        setOverlay(true);
      }
      if (event.key === "Escape") setOverlay(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const labels = {
    boosts: t("collections"),
    products: t("products"),
    categories: t("categories"),
    collections: t("collections"),
    articles: t("articles"),
    guides: t("guides"),
  };
  const hasHits =
    hits &&
    (hits.boosts.length || hits.products.length || hits.categories.length || hits.collections.length || hits.articles.length || hits.guides.length);

  return (
    <>
      <IconButton type="button" aria-label={t("title")} onClick={() => setOverlay(true)}>
        <Search size={18} strokeWidth={1.5} />
      </IconButton>
      {overlay
        ? createPortal(
        <div className="fixed inset-0 z-[80] h-dvh overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-label={t("title")}>
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t("title")}</p>
              <IconButton type="button" aria-label={tNav("close")} onClick={() => setOverlay(false)}>
                <X size={20} />
              </IconButton>
            </div>
            <form action={action} className="mt-8">
              <input
                ref={inputRef}
                name="q"
                value={q}
                onChange={(event) => {
                  const next = event.target.value;
                  setQ(next);
                  if (next.trim().length < 2) setHits(null);
                }}
                className="w-full border-0 border-b border-line bg-transparent py-4 text-2xl tracking-[-0.03em] outline-none placeholder:text-mute md:text-4xl"
                placeholder={t("placeholder")}
                autoComplete="off"
                aria-label={t("title")}
              />
              <p className="mt-3 text-xs text-mute">{t("shortcut")}</p>
            </form>
            <div className="mt-10 flex-1 overflow-y-auto">
                  {ready && hits && !hasHits ? <p className="text-mute">{t("noResults", { query: q })}</p> : null}
              {ready && hits
                ? (["boosts", "products", "categories", "collections", "articles", "guides"] as const).map((group) =>
                    hits[group]?.length ? (
                      <div key={group} className="mb-8">
                        <p className="eyebrow mb-3">{labels[group]}</p>
                        <ul>
                          {hits[group].map((hit) => (
                            <li key={hit.href}>
                              <Link
                                href={hit.href}
                                prefetch={false}
                                className="block py-2.5 text-lg tracking-[-0.02em] hover:text-mute"
                                onClick={() => setOverlay(false)}
                              >
                                {hit.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )
                : null}
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function isTyping(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
