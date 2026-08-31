import { getCurrentUser } from "@/server/auth/session";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { redirect } from "next/navigation";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getPublishedProductById } from "@/services/catalog";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/storefront/empty-state";
import { AccountShell } from "@/components/storefront/account-shell";

export default async function WishlistPage() {
  const t = await getTranslations("account");
  const tSearch = await getTranslations("search");
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/cont/wishlist");
  const { data: items } = isSupabaseConfigured()
    ? await sb().from("wishlist_items").select("id, product_id").eq("profile_id", user.id)
    : { data: [] as { id: string; product_id: string }[] };
  const products = (
    await Promise.all((items ?? []).map((item) => getPublishedProductById(item.product_id)))
  ).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return (
    <AccountShell title={t("wishlist")} current="wishlist">
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState title={t("emptyWishlist")} actionHref="/produse" actionLabel={tSearch("discover")} />
      )}
    </AccountShell>
  );
}
