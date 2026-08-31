import { getCurrentUser } from "@/server/auth/session";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { Container, PageTitle } from "@/components/ui/primitives";
import { getPublishedProductById } from "@/services/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { GuestWishlist } from "@/components/storefront/guest-wishlist";
import { getTranslations } from "next-intl/server";

export default async function FavoritePage() {
  const t = await getTranslations("nav");
  const tAccount = await getTranslations("account");
  const tSearch = await getTranslations("search");
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Container className="py-12 md:py-16">
        <PageTitle title={t("wishlist")} />
        <GuestWishlist />
      </Container>
    );
  }
  const { data: items } = isSupabaseConfigured()
    ? await sb().from("wishlist_items").select("id, product_id").eq("profile_id", user.id)
    : { data: [] as { id: string; product_id: string }[] };
  const products = (
    await Promise.all((items ?? []).map((item) => getPublishedProductById(item.product_id)))
  ).filter((product): product is NonNullable<typeof product> => Boolean(product));
  return (
    <Container className="py-12 md:py-16">
      <PageTitle title={t("wishlist")} />
      {products.length ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState title={tAccount("emptyList")} actionHref="/produse" actionLabel={tSearch("discover")} />
      )}
    </Container>
  );
}
