"use client";

import { Heart } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getWishlistIdsSnapshot,
  subscribeWishlist,
  toggleWishlistEntry,
} from "@/lib/wishlist-store";
import { emitToast } from "@/components/storefront/store-toast";

export function WishlistButton({
  productId,
  slug,
  name,
}: {
  productId: string;
  slug?: string;
  name?: string;
}) {
  const t = useTranslations("nav");
  const tCart = useTranslations("cart");
  const getSnapshot = useCallback(() => getWishlistIdsSnapshot().includes(productId), [productId]);
  const on = useSyncExternalStore(subscribeWishlist, getSnapshot, () => false);

  return (
    <button
      type="button"
      onClick={() => {
        const wasOn = getWishlistIdsSnapshot().includes(productId);
        toggleWishlistEntry(productId, slug, name);
        emitToast(wasOn ? tCart("removed") : tCart("saved"));
      }}
      className="inline-flex h-10 w-10 items-center justify-center text-ink/70 transition-colors duration-200 hover:text-ink"
      aria-pressed={on}
      aria-label={t("wishlist")}
    >
      <Heart size={16} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
