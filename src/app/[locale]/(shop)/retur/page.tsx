import { Container } from "@/components/ui/primitives";
import { ReturnForm } from "@/components/storefront/return-form";
import { getCurrentUser } from "@/server/auth/session";
import { getPublishedPage } from "@/services/cms";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    title: t("title"),
    description: t("intro"),
    alternates: localeAlternates("/retur", locale as AppLocale, appUrl),
  };
}

export default async function ReturnsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; e?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");
  const { sent, e } = await searchParams;
  const [user, cms] = await Promise.all([getCurrentUser(), getPublishedPage("retur", locale as AppLocale)]);
  const addressRow =
    user && isSupabaseConfigured()
      ? (
          await sb()
            .from("addresses")
            .select("street, number, city, county, postal_code, phone")
            .eq("profile_id", user.id)
            .order("is_default", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data
      : null;
  const address = addressRow
    ? camelKeys<{
        street?: string;
        number?: string;
        city?: string;
        county?: string;
        postalCode?: string;
        phone?: string;
      }>(addressRow)
    : null;
  const extra =
    cms?.content &&
    !/legal\.returnsHtml|se editează din CMS|edited in CMS|Completați textul legal/i.test(cms.content)
      ? cms.content
      : null;
  return (
    <Container className="max-w-3xl py-16">
      <p className="text-xs uppercase tracking-[0.22em] text-olive">{t("kicker")}</p>
      <h1 className="mt-3 font-display text-5xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-mute">{t("intro")}</p>
      {sent ? <p className="mt-6 border border-olive/30 bg-surface px-4 py-3 text-sm text-olive">{t("sent")}</p> : null}
      {e === "validation" ? <p className="mt-6 text-sm text-warning">{t("errorValidation")}</p> : null}
      {e === "iban" ? <p className="mt-6 text-sm text-warning">{t("errorIban")}</p> : null}
      {e === "photos" ? <p className="mt-6 text-sm text-warning">{t("photosRequired")}</p> : null}
      {e === "rate" ? <p className="mt-6 text-sm text-warning">{t("errorRate")}</p> : null}
      {e === "fail" ? <p className="mt-6 text-sm text-warning">{t("errorFail")}</p> : null}
      <section className="mt-10 grid gap-3 border border-line bg-surface p-6 text-sm leading-relaxed">
        <h2 className="font-display text-2xl">{t("policyTitle")}</h2>
        <ul className="list-disc space-y-2 pl-5 text-ink-2">
          <li>{t("policy1")}</li>
          <li>{t("policy2")}</li>
          <li>{t("policy3")}</li>
          <li>{t("policy4")}</li>
        </ul>
      </section>
      {extra ? (
        <div className="prose-ravilo mt-8 text-ink-2" dangerouslySetInnerHTML={{ __html: extra }} />
      ) : null}
      {sent ? null : (
        <ReturnForm
          defaults={{
            firstName: user?.firstName,
            lastName: user?.lastName,
            email: user?.email,
            phone: address?.phone,
            street: address?.street,
            streetNumber: address?.number,
            city: address?.city,
            county: address?.county,
            postalCode: address?.postalCode,
          }}
        />
      )}
    </Container>
  );
}
