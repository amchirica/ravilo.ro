import { Link } from "@/i18n/routing";
import { listPublishedProducts, type CatalogSort } from "@/services/catalog";
import { getActiveCategories, getCategoryBySlug, getChildCategories, getEnabledFaqs, getPublishedArticles } from "@/services/cms";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Breadcrumb, Button, Container, Field, Input, PageTitle, Select } from "@/components/ui/primitives";
import { FaqList } from "@/components/storefront/faq-list";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

export type CatalogQuery = {
  q?: string;
  categorie?: string;
  min?: string;
  max?: string;
  pretMin?: string;
  pretMax?: string;
  stock?: string;
  sort?: string;
  page?: string;
};

function parseSort(value: string | undefined): CatalogSort {
  if (value === "newest" || value === "price_asc" || value === "price_desc") return value;
  return "featured";
}

function CatalogFilters({
  action,
  query,
  categorySlug,
  categories,
  labels,
}: {
  action: string;
  query: CatalogQuery;
  categorySlug?: string;
  categories: { id: string; slug: string; name: string }[];
  labels: {
    search: string;
    category: string;
    all: string;
    price: string;
    inStock: string;
    sort: string;
    sortFeatured: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    applyFilters: string;
  };
}) {
  return (
    <form className="grid gap-4" method="get" action={action}>
      <Field label={labels.search}>
        <Input name="q" defaultValue={query.q ?? ""} />
      </Field>
      {!categorySlug ? (
        <Field label={labels.category}>
          <Select name="categorie" defaultValue={query.categorie ?? ""}>
            <option value="">{labels.all}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={labels.price}>
        <span className="flex gap-2">
          <Input name="min" defaultValue={query.min ?? query.pretMin ?? ""} placeholder="min" />
          <Input name="max" defaultValue={query.max ?? query.pretMax ?? ""} placeholder="max" />
        </span>
      </Field>
      <label className="flex h-12 items-center gap-2 text-sm">
        <input type="checkbox" name="stock" value="1" defaultChecked={query.stock === "1"} className="size-4 accent-ink" />
        {labels.inStock}
      </label>
      <Field label={labels.sort}>
        <Select name="sort" defaultValue={parseSort(query.sort)}>
          <option value="featured">{labels.sortFeatured}</option>
          <option value="newest">{labels.sortNewest}</option>
          <option value="price_asc">{labels.sortPriceAsc}</option>
          <option value="price_desc">{labels.sortPriceDesc}</option>
        </Select>
      </Field>
      <Button type="submit" variant="line" className="w-full">
        {labels.applyFilters}
      </Button>
    </form>
  );
}

export async function CatalogBrowser({
  locale,
  query,
  categorySlug,
  title,
  description,
  seoContent,
}: {
  locale: AppLocale;
  query: CatalogQuery;
  categorySlug?: string;
  title: string;
  description?: string;
  seoContent?: string;
}) {
  const t = await getTranslations("catalog");
  const slug = categorySlug ?? query.categorie;
  const category = slug ? await getCategoryBySlug(slug, locale) : null;
  const children = category ? await getChildCategories(category.id, locale) : [];
  const categories = await getActiveCategories(locale);
  const current = Math.max(1, Number(query.page ?? 1));
  const take = 24;
  const minRaw = query.min ?? query.pretMin;
  const maxRaw = query.max ?? query.pretMax;
  const priceMin = minRaw ? Math.round(Number(minRaw) * 100) : undefined;
  const priceMax = maxRaw ? Math.round(Number(maxRaw) * 100) : undefined;
  const { items, total } = await listPublishedProducts({
    categorySlug: category?.slug,
    search: query.q?.trim().slice(0, 80) || undefined,
    take,
    skip: (current - 1) * take,
    locale,
    inStock: query.stock === "1" || undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    sort: parseSort(query.sort),
  });
  const pages = Math.max(1, Math.ceil(total / take));
  const prefix = locale === "en" ? "/en" : "";
  const action = `${prefix}${categorySlug ? `/categorie/${categorySlug}` : "/produse"}`;
  const [faqs, relatedArticles] = category
    ? await Promise.all([getEnabledFaqs(locale, { categoryId: category.id }), getPublishedArticles(3, locale, "ANY")])
    : [[], []];

  const filterLabels = {
    search: t("search"),
    category: t("category"),
    all: t("all"),
    price: t("price"),
    inStock: t("inStock"),
    sort: t("sort"),
    sortFeatured: t("sortFeatured"),
    sortNewest: t("sortNewest"),
    sortPriceAsc: t("sortPriceAsc"),
    sortPriceDesc: t("sortPriceDesc"),
    applyFilters: t("applyFilters"),
  };

  return (
    <Container className="py-10 md:py-16">
      <Breadcrumb
        items={[
          { href: "/", label: "RAVILO" },
          { href: "/produse", label: t("products") },
          ...(category ? [{ label: category.name }] : []),
        ]}
      />
      <PageTitle title={title} description={description} meta={t("count", { count: total })} className="mt-6" />
      {children.length ? (
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2">
          {children.map((child) => (
            <Link key={child.id} href={`/categorie/${child.slug}`} className="text-sm text-mute transition-colors hover:text-ink">
              {child.name}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
        <div className="sticky top-[var(--header-h)] z-20 -mx-4 mb-8 border-y border-line bg-paper px-4 py-3 lg:hidden">
          <details>
            <summary className="flex h-11 cursor-pointer items-center justify-between text-sm">
              {t("filters")}
              <span aria-hidden>+</span>
            </summary>
            <div className="pb-4 pt-4">
              <CatalogFilters
                action={action}
                query={query}
                categorySlug={categorySlug}
                categories={categories}
                labels={filterLabels}
              />
            </div>
          </details>
        </div>
        <aside className="hidden lg:sticky lg:top-28 lg:block">
          <CatalogFilters
            action={action}
            query={query}
            categorySlug={categorySlug}
            categories={categories}
            labels={filterLabels}
          />
        </aside>
        <div>
          {items.length ? <ProductGrid products={items} /> : <EmptyState title={t("empty")} hint={t("emptyHint")} />}
          {pages > 1 ? (
            <nav className="mt-12 flex flex-wrap gap-2" aria-label={t("pagination")}>
              {Array.from({ length: pages }, (_, index) => (
                <a
                  key={index}
                  href={`?${new URLSearchParams({
                    ...(query.q ? { q: query.q } : {}),
                    ...(query.categorie ? { categorie: query.categorie } : {}),
                    ...(query.min ? { min: query.min } : {}),
                    ...(query.max ? { max: query.max } : {}),
                    ...(query.stock ? { stock: query.stock } : {}),
                    ...(query.sort ? { sort: query.sort } : {}),
                    page: String(index + 1),
                  }).toString()}`}
                  className={`inline-flex h-11 min-w-11 items-center justify-center px-3 text-sm ${current === index + 1 ? "bg-ink text-paper" : "text-mute hover:text-ink"}`}
                >
                  {index + 1}
                </a>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
      {seoContent ? <div className="prose-ravilo mt-16 max-w-3xl text-mute">{seoContent}</div> : null}
      <FaqList items={faqs} title="FAQ" />
      {relatedArticles.length ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl tracking-[-0.03em]">{t("guidesAndArticles")}</h2>
          <ul className="mt-6 grid gap-3">
            {relatedArticles.map((article) => (
              <li key={article.id}>
                <Link href={article.href} className="text-mute transition-colors hover:text-ink">
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
