"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  getServerWishlistSnapshot,
  getWishlistEntriesSnapshot,
  subscribeWishlist,
} from "@/lib/wishlist-store";

import { EmptyState } from "@/components/storefront/empty-state";

export function GuestWishlist() {
  const t = useTranslations("account");
  const entries = useSyncExternalStore(subscribeWishlist, getWishlistEntriesSnapshot, getServerWishlistSnapshot);
  if (entries.length === 0) {
    return <EmptyState title={t("emptyWishlist")} hint={t("emptyWishlistHint")} actionHref="/produse" actionLabel={t("browse")} />;
  }
  return (
    <ul className="mt-8 divide-y divide-line">
      {entries.map((entry) => (
        <li key={entry.id} className="py-4">
          {entry.slug ? (
            <Link href={`/produs/${entry.slug}`} className="text-xl tracking-[-0.03em] hover:text-mute">
              {entry.name || entry.slug}
            </Link>
          ) : (
            <span>{entry.name || entry.id}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
