"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const KEY = "ravilo_recent_products";
const listeners = new Set<() => void>();
const EMPTY: { id: string; slug: string; name: string }[] = [];

let cachedRaw: string | null = null;
let cachedItems = EMPTY;

function readRaw() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function refresh() {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    const parsed = JSON.parse(raw) as { id: string; slug: string; name: string }[];
    cachedItems = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function emit() {
  cachedRaw = null;
  refresh();
  listeners.forEach((listener) => listener());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") return () => listeners.delete(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("ravilo-recent", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("ravilo-recent", onStoreChange);
  };
}

export function trackRecentlyViewed(entry: { id: string; slug: string; name: string }) {
  try {
    const current = refresh();
    const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
    emit();
  } catch {
    /* ignore */
  }
}

export function RecentlyViewed({ currentId }: { currentId?: string }) {
  const t = useTranslations("product");
  const items = useSyncExternalStore(subscribe, refresh, () => EMPTY).filter((item) => item.id !== currentId).slice(0, 6);
  if (!items.length) return null;
  return (
    <section className="mt-16">
      <h2 className="font-display text-3xl">{t("recentlyViewed")}</h2>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/produs/${item.slug}`} className="hover:text-mute">
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecentlyViewedTracker({ id, slug, name }: { id: string; slug: string; name: string }) {
  useEffect(() => {
    trackRecentlyViewed({ id, slug, name });
  }, [id, slug, name]);
  return null;
}
