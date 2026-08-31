import { listApprovedStoreReviews } from "@/services/reviews";
import { Container } from "@/components/ui/primitives";
import { EmptyState } from "@/components/storefront/empty-state";
import { ReviewForm } from "@/components/storefront/review-form";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviewsPage");
  return { title: t("title"), description: t("intro"), alternates: localeAlternates("/recenzii", locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000") };
}

export default async function ReviewsPage() {
  const locale = (await getLocale()) as AppLocale;
  void locale;
  const t = await getTranslations("reviewsPage");
  const reviews = await listApprovedStoreReviews(40);
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-4 text-mute">{t("intro")}</p>
      {count ? (
        <p className="mt-6 text-lg">{t("average", { avg: avg.toFixed(1), count })}</p>
      ) : (
        <div className="mt-8">
          <EmptyState title={t("empty")} />
        </div>
      )}
      <ul className="mt-10 grid gap-6">
        {reviews.map((review) => (
          <li key={review.id} className="border-t border-line pt-6">
            <p className="text-sm">
              {review.rating}/5
              {review.verifiedPurchase ? <span className="ml-2 text-[0.625rem] uppercase tracking-[0.14em] text-mute">Achiziție verificată</span> : null}
            </p>
            <h2 className="mt-1 font-display text-2xl">{review.title}</h2>
            <p className="mt-2 text-mute">{review.body}</p>
            <p className="mt-2 text-xs text-mute">{review.guestName}</p>
          </li>
        ))}
      </ul>
      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-display text-3xl tracking-[-0.03em]">{t("cta")}</h2>
        <ReviewForm />
      </section>
    </Container>
  );
}
