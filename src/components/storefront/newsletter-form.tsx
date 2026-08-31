"use client";

import { subscribeNewsletterAction } from "@/server/actions";
import { Button, Input } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

export function NewsletterForm({ source = "homepage" }: { source?: string }) {
  const t = useTranslations("nav");
  return (
    <form action={subscribeNewsletterAction} className="mt-6 flex gap-2">
      <input type="hidden" name="source" value={source} />
      <Input name="email" type="email" required placeholder={t("emailPlaceholder")} className="flex-1" />
      <Button type="submit">{t("subscribe")}</Button>
    </form>
  );
}
