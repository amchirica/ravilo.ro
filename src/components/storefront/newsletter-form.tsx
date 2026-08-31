"use client";

import { useState } from "react";
import { subscribeNewsletterAction } from "@/server/actions";
import { Button, Input } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

export function NewsletterForm({ source = "homepage" }: { source?: string }) {
  const t = useTranslations("nav");
  const tHome = useTranslations("home");
  const [done, setDone] = useState(false);
  if (done) {
    return <p className="mt-3 text-sm text-mute">{tHome("newsletterSuccess")}</p>;
  }
  return (
    <form
      className="mt-3 flex gap-2"
      action={async (formData) => {
        await subscribeNewsletterAction(formData);
        setDone(true);
      }}
    >
      <input type="hidden" name="source" value={source} />
      <Input name="email" type="email" required placeholder={t("emailPlaceholder")} className="flex-1" />
      <Button type="submit">{t("subscribe")}</Button>
    </form>
  );
}
