import { Link } from "@/i18n/routing";
import { Container, PageTitle } from "@/components/ui/primitives";
import { EmptyState } from "@/components/storefront/empty-state";
import { StoreImage } from "@/components/storefront/store-image";
import { getPublishedArticles } from "@/services/cms";
import type { AppLocale } from "@/lib/i18n";

export async function ArticleIndex({
  locale,
  kind,
  title,
  empty,
}: {
  locale: AppLocale;
  kind: "ARTICLE" | "GUIDE";
  title: string;
  empty: string;
}) {
  const articles = await getPublishedArticles(48, locale, kind);
  const base = kind === "GUIDE" ? "/ghiduri" : "/blog";
  return (
    <Container className="py-12 md:py-16">
      <PageTitle title={title} />
      {articles.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul>
          {articles.map((article) => (
            <li key={article.id} className="border-t border-line py-8">
              <Link
                href={`${base}/${article.slug}`}
                className={
                  article.coverUrl
                    ? "group grid items-end gap-6 md:grid-cols-12 md:gap-10"
                    : "group block max-w-2xl"
                }
              >
                <div className={article.coverUrl ? "md:col-span-7" : undefined}>
                  {article.category ? <p className="eyebrow">{article.category}</p> : null}
                  <h2 className="mt-2 font-display text-3xl tracking-[-0.03em] transition-colors duration-200 group-hover:text-mute">
                    {article.title}
                  </h2>
                  {article.excerpt ? <p className="mt-3 text-mute">{article.excerpt}</p> : null}
                </div>
                {article.coverUrl ? (
                  <div className="relative aspect-[5/4] overflow-hidden md:col-span-5">
                    <StoreImage src={article.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
