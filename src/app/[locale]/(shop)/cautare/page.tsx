import { listPublishedProducts } from "@/services/catalog";
import { suggestSearch } from "@/services/merchandising";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Container, Input, PageTitle } from "@/components/ui/primitives";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { recordSearch } from "@/services/catalog";
import type { AppLocale } from "@/lib/i18n";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslations("search");
  const catalog = await getTranslations("catalog");
  const locale = (await getLocale()) as AppLocale;
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (query) {
    const limited = await rateLimit("search", ip, RATE_LIMITS.search.limit, RATE_LIMITS.search.windowSec);
    if (!limited.success) {
      return (
        <Container className="py-16">
          <p>{t("rateLimited")}</p>
        </Container>
      );
    }
  }
  const [results, suggest] = query
    ? await Promise.all([listPublishedProducts({ search: query, take: 24, locale }), suggestSearch(query, locale)])
    : [{ items: [], total: 0 }, { products: [], categories: [], collections: [], articles: [], guides: [], boosts: [] }];
  const extraCount =
    suggest.categories.length + suggest.collections.length + suggest.articles.length + suggest.guides.length + suggest.boosts.length;
  if (query) await recordSearch(query, results.total + extraCount);
  const empty = query && results.items.length === 0 && extraCount === 0;
  return (
    <Container className="py-12 md:py-16">
      <PageTitle title={t("title")} />
      <form className="max-w-xl">
        <Input name="q" defaultValue={query} placeholder={t("placeholder")} aria-label={t("title")} />
      </form>
      {query ? <p className="mt-4 text-sm text-mute">{t("results", { count: results.total + extraCount, query })}</p> : null}
      {suggest.boosts.length ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl tracking-[-0.03em]">{t("collections")}</h2>
          <ul className="mt-3 grid gap-2">
            {suggest.boosts.map((hit) => (
              <li key={hit.href}>
                <Link href={hit.href} className="hover:text-ink">
                  {hit.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mt-8">
        {empty ? (
          <EmptyState title={t("noResults")} hint={catalog("emptyHint")} actionHref="/produse" actionLabel={t("discover")} />
        ) : (
          <ProductGrid products={results.items} />
        )}
      </div>
      {suggest.categories.length ? (
        <SearchList title={t("categories")} items={suggest.categories} />
      ) : null}
      {suggest.collections.length ? (
        <SearchList title={t("collections")} items={suggest.collections} />
      ) : null}
      {suggest.articles.length || suggest.guides.length ? (
        <SearchList title={t("articlesAndGuides")} items={[...suggest.articles, ...suggest.guides]} />
      ) : null}
    </Container>
  );
}

function SearchList({ title, items }: { title: string; items: { name: string; href: string }[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-3xl tracking-[-0.03em]">{title}</h2>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-ink">
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
