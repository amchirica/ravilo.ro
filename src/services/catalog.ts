import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { pickLocalized, type AppLocale } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { publicStockStatus, type PublicStockStatus } from "@/lib/stock";

export type { PublicStockStatus };
export type PublicBadge = "PICK" | "NEW" | "POPULAR" | "SALE";

export type PublicMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  storagePath: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
  posterImage: string | null;
};

export type PublicVariant = {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  isActive: boolean;
  inStock: boolean;
};

export type PublicProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  brand: string | null;
  salePrice: number;
  compareAtPrice: number | null;
  currency: string;
  taxRateBps: number;
  isFeatured: boolean;
  isRaviloPick: boolean;
  isNew: boolean;
  isDemoBestseller: boolean;
  whyWeChose: string;
  howItWorks: string;
  specifications: string;
  compatibility: string;
  inTheBox: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  tags: string[];
  image: string | null;
  stockStatus: PublicStockStatus;
  badges: PublicBadge[];
  category: { id: string; name: string; slug: string } | null;
  media: PublicMedia[];
  variants: PublicVariant[];
  attributes: { name: string; slug: string; value: string }[];
  ratingAverage: number | null;
  ratingCount: number;
};

export type PublicBundle = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  imagePath: string | null;
  itemNames: string[];
  items: { variantId: string; quantity: number }[];
};

const PRODUCT_SELECT = `
  id, name, name_en, slug, sku, short_description, short_description_en, description, description_en, brand,
  sale_price, compare_at_price, currency, tax_rate_bps, is_featured, is_ravilo_pick, is_new, is_demo_bestseller,
  why_we_chose, why_we_chose_en, how_it_works, how_it_works_en, specifications, specifications_en,
  compatibility, compatibility_en, in_the_box, in_the_box_en, seo_title, seo_title_en, seo_description, seo_description_en,
  canonical_url, allow_backorder, status, is_active, tags, low_stock_threshold,
  category:categories(id, name, name_en, slug, is_active),
  media:product_media(id, type, storage_path, alt, alt_en, sort_order, is_primary, poster_image),
  variants:product_variants(
    id, sku, name, price_override, compare_at_price_override, is_active,
    inventory:inventory_levels(quantity, reserved_quantity)
  ),
  attributes:product_attribute_values(value, attribute:attribute_definitions(name, slug))
`;

type LoadedProduct = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  sku: string;
  shortDescription: string;
  shortDescriptionEn: string | null;
  description: string;
  descriptionEn: string | null;
  brand: string | null;
  salePrice: number;
  compareAtPrice: number | null;
  currency: string;
  taxRateBps: number;
  isFeatured: boolean;
  isRaviloPick: boolean;
  isNew: boolean;
  isDemoBestseller: boolean;
  whyWeChose: string;
  whyWeChoseEn: string | null;
  howItWorks: string;
  howItWorksEn: string | null;
  specifications: string;
  specificationsEn: string | null;
  compatibility: string;
  compatibilityEn: string | null;
  inTheBox: string;
  inTheBoxEn: string | null;
  seoTitle: string | null;
  seoTitleEn: string | null;
  seoDescription: string | null;
  seoDescriptionEn: string | null;
  canonicalUrl: string | null;
  allowBackorder: boolean;
  status: string;
  isActive: boolean;
  tags: string[] | null;
  lowStockThreshold: number;
  category: { id: string; name: string; nameEn?: string | null; slug: string; isActive?: boolean } | null;
  media: {
    id: string;
    type: "IMAGE" | "VIDEO";
    storagePath: string;
    alt: string;
    altEn?: string | null;
    sortOrder: number;
    isPrimary: boolean;
    posterImage: string | null;
  }[];
  variants: {
    id: string;
    sku: string;
    name: string;
    priceOverride: number | null;
    compareAtPriceOverride: number | null;
    isActive: boolean;
    inventory: { quantity: number; reservedQuantity: number }[];
  }[];
  attributes: { value: string; attribute: { name: string; slug: string } }[];
};

function availableOf(variant: LoadedProduct["variants"][number], allowBackorder: boolean) {
  const level = variant.inventory[0];
  if (!level) return allowBackorder ? 1 : 0;
  const available = level.quantity - level.reservedQuantity;
  return allowBackorder ? Math.max(available, 0) + 1 : Math.max(available, 0);
}

function toStockStatus(available: number, threshold: number): PublicStockStatus {
  return publicStockStatus(available, threshold);
}

export function toPublicProduct(product: LoadedProduct, locale: AppLocale, rating?: { avg: number; count: number }): PublicProduct {
  const variants = (product.variants ?? []).filter((variant) => variant.isActive);
  const available = variants.reduce((sum, variant) => sum + availableOf(variant, product.allowBackorder), 0);
  const stockStatus = toStockStatus(available, product.lowStockThreshold ?? 3);
  const media = [...(product.media ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      type: item.type,
      storagePath: item.storagePath,
      alt: pickLocalized(item.alt, item.altEn, locale),
      sortOrder: item.sortOrder,
      isPrimary: item.isPrimary,
      posterImage: item.posterImage,
    }));
  const primary = media.find((item) => item.isPrimary) ?? media[0];
  const compare = product.compareAtPrice;
  const badges: PublicBadge[] = [];
  if (product.isRaviloPick) badges.push("PICK");
  if (product.isNew) badges.push("NEW");
  if (product.isDemoBestseller) badges.push("POPULAR");
  if (compare && compare > product.salePrice) badges.push("SALE");

  return {
    id: product.id,
    name: pickLocalized(product.name, product.nameEn, locale),
    slug: product.slug,
    sku: product.sku,
    shortDescription: pickLocalized(product.shortDescription, product.shortDescriptionEn, locale),
    description: pickLocalized(product.description, product.descriptionEn, locale),
    brand: product.brand,
    salePrice: product.salePrice,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    taxRateBps: product.taxRateBps,
    isFeatured: product.isFeatured,
    isRaviloPick: product.isRaviloPick,
    isNew: product.isNew,
    isDemoBestseller: Boolean(product.isDemoBestseller),
    whyWeChose: pickLocalized(product.whyWeChose, product.whyWeChoseEn, locale),
    howItWorks: pickLocalized(product.howItWorks, product.howItWorksEn, locale),
    specifications: pickLocalized(product.specifications, product.specificationsEn, locale),
    compatibility: pickLocalized(product.compatibility, product.compatibilityEn, locale),
    inTheBox: pickLocalized(product.inTheBox, product.inTheBoxEn, locale),
    seoTitle: pickLocalized(product.seoTitle, product.seoTitleEn, locale) || null,
    seoDescription: pickLocalized(product.seoDescription, product.seoDescriptionEn, locale) || null,
    canonicalUrl: product.canonicalUrl,
    tags: product.tags ?? [],
    image: primary?.storagePath ?? null,
    stockStatus,
    badges,
    category: product.category
      ? {
          id: product.category.id,
          name: pickLocalized(product.category.name, product.category.nameEn, locale),
          slug: product.category.slug,
        }
      : null,
    media,
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.priceOverride ?? product.salePrice,
      compareAtPrice: variant.compareAtPriceOverride ?? product.compareAtPrice,
      isActive: variant.isActive,
      inStock: availableOf(variant, product.allowBackorder) > 0,
    })),
    attributes: (product.attributes ?? []).map((row) => ({
      name: row.attribute.name,
      slug: row.attribute.slug,
      value: row.value,
    })),
    ratingAverage: rating && rating.count > 0 ? rating.avg : null,
    ratingCount: rating?.count ?? 0,
  };
}

async function localeOf(explicit?: AppLocale): Promise<AppLocale> {
  return explicit ?? requestLocale();
}

export async function getPublishedProductBySlug(slug: string, locale?: AppLocale): Promise<PublicProduct | null> {
  if (!isSupabaseConfigured()) return null;
  const loc = await localeOf(locale);
  const { data } = await sb()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const product = camelKeys<LoadedProduct>(data);
  const { data: reviewRows } = await sb()
    .from("reviews")
    .select("rating")
    .eq("product_id", product.id)
    .eq("status", "APPROVED");
  const ratings = (reviewRows ?? []).map((row) => Number(row.rating));
  const count = ratings.length;
  const avg = count ? ratings.reduce((sum, value) => sum + value, 0) / count : 0;
  return toPublicProduct(product, loc, { avg, count });
}

export type CatalogSort = "featured" | "newest" | "price_asc" | "price_desc";

export async function listPublishedProducts(input?: {
  categorySlug?: string;
  collectionSlug?: string;
  featured?: boolean;
  raviloPick?: boolean;
  isNew?: boolean;
  demoBestseller?: boolean;
  search?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: CatalogSort;
  take?: number;
  skip?: number;
  locale?: AppLocale;
}) {
  const take = Math.min(input?.take ?? 24, 60);
  const skip = input?.skip ?? 0;
  const loc = await localeOf(input?.locale);
  if (!isSupabaseConfigured()) return { items: [] as PublicProduct[], total: 0, take, skip };

  let query = sb().from("products").select(PRODUCT_SELECT, { count: "exact" }).eq("status", "ACTIVE").eq("is_active", true);
  if (input?.featured) query = query.eq("is_featured", true);
  if (input?.raviloPick) query = query.eq("is_ravilo_pick", true);
  if (input?.isNew) query = query.eq("is_new", true);
  if (input?.demoBestseller) query = query.eq("is_demo_bestseller", true);
  if (input?.priceMin != null) query = query.gte("sale_price", input.priceMin);
  if (input?.priceMax != null) query = query.lte("sale_price", input.priceMax);
  if (input?.search) {
    const q = input.search.replace(/[%_,]/g, " ").slice(0, 80);
    query = query.or(`name.ilike.%${q}%,name_en.ilike.%${q}%,sku.ilike.%${q}%,short_description.ilike.%${q}%,short_description_en.ilike.%${q}%`);
  }
  if (input?.collectionSlug) {
    const { data: collection } = await sb().from("collections").select("id").eq("slug", input.collectionSlug).maybeSingle();
    const { data: links } = collection
      ? await sb().from("collection_products").select("product_id").eq("collection_id", collection.id)
      : { data: [] as { product_id: string }[] };
    const ids = (links ?? []).map((row) => row.product_id);
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const sort = input?.sort ?? "featured";
  if (sort === "price_asc") query = query.order("sale_price", { ascending: true });
  else if (sort === "price_desc") query = query.order("sale_price", { ascending: false });
  else if (sort === "newest") query = query.order("published_at", { ascending: false }).order("created_at", { ascending: false });
  else query = query.order("is_featured", { ascending: false }).order("published_at", { ascending: false });

  const { data, count } = await query.range(
    input?.categorySlug || input?.inStock ? 0 : skip,
    input?.categorySlug || input?.inStock ? 119 : skip + take - 1,
  );

  const items = camelList<LoadedProduct>(data);
  const filtered = input?.categorySlug
    ? items.filter((item) => item.category?.slug === input.categorySlug && item.category?.isActive !== false)
    : items;
  const mapped = filtered.map((item) => toPublicProduct(item, loc));
  const stockFiltered = input?.inStock ? mapped.filter((item) => item.stockStatus !== "OUT") : mapped;
  const paged = input?.categorySlug || input?.inStock ? stockFiltered.slice(skip, skip + take) : stockFiltered;
  return {
    items: paged,
    total: input?.categorySlug || input?.inStock ? stockFiltered.length : count ?? paged.length,
    take,
    skip,
  };
}

export async function recordSearch(term: string, resultCount: number) {
  if (!isSupabaseConfigured()) return;
  await sb().from("search_events").insert({ term: term.slice(0, 120), result_count: resultCount });
}

export async function getPublishedProductById(id: string, locale?: AppLocale): Promise<PublicProduct | null> {
  if (!isSupabaseConfigured()) return null;
  const loc = await localeOf(locale);
  const { data } = await sb()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("status", "ACTIVE")
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  return toPublicProduct(camelKeys<LoadedProduct>(data), loc);
}

export async function getPublishedBundleBySlug(slug: string, locale?: AppLocale): Promise<PublicBundle | null> {
  const bundles = await listPublishedBundles(locale);
  return bundles.find((item) => item.slug === slug) ?? null;
}

export async function listPublishedBundles(locale?: AppLocale): Promise<PublicBundle[]> {
  if (!isSupabaseConfigured()) return [];
  const loc = await localeOf(locale);
  const { data } = await sb().from("bundles").select("*").eq("is_active", true).order("created_at", { ascending: true });
  const rows = camelList<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string;
    descriptionEn: string | null;
    price: number;
    compareAtPrice: number | null;
    imagePath: string | null;
  }>(data);
  const out: PublicBundle[] = [];
  for (const bundle of rows) {
    const { data: links } = await sb().from("bundle_items").select("variant_id, quantity").eq("bundle_id", bundle.id);
    const variantIds = (links ?? []).map((row) => row.variant_id);
    const { data: variants } =
      variantIds.length > 0
        ? await sb().from("product_variants").select("id, product:products(name, name_en)").in("id", variantIds)
        : { data: [] as { id: string; product: { name: string; name_en: string | null } }[] };
    const bundleItems = (links ?? []).map((row) => ({
      variantId: String(row.variant_id),
      quantity: Number(row.quantity ?? 1),
    }));
    out.push({
      id: bundle.id,
      name: pickLocalized(bundle.name, bundle.nameEn, loc),
      slug: bundle.slug,
      description: pickLocalized(bundle.description, bundle.descriptionEn, loc),
      price: bundle.price,
      compareAtPrice: bundle.compareAtPrice,
      imagePath: bundle.imagePath,
      itemNames: (variants ?? []).map((row) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product;
        return pickLocalized(product?.name, product?.name_en, loc);
      }),
      items: bundleItems,
    });
  }
  return out;
}
