import { getEnabledFaqs } from "@/services/cms";
import { Container } from "@/components/ui/primitives";
import { FaqList } from "@/components/storefront/faq-list";
import { EmptyState } from "@/components/storefront/empty-state";
import { getTranslations } from "next-intl/server";

export default async function FaqPage() {
  const t = await getTranslations();
  const items = await getEnabledFaqs(undefined, { global: true });
  const visible = items.length ? items : await getEnabledFaqs();
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="font-display text-5xl">{t("nav.faq")}</h1>
      {visible.length ? (
        <div className="mt-10">
          <FaqList items={visible} />
        </div>
      ) : (
        <div className="mt-10">
          <EmptyState title={t("editorial.emptyFaq")} />
        </div>
      )}
    </Container>
  );
}
