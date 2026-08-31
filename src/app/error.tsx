"use client";

import { Container } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <Container className="py-24 text-center">
      <h1 className="font-display text-5xl">{t("generic")}</h1>
      <p className="mt-4 text-mute">{t("persist")}</p>
      <button onClick={reset} className="mt-8 underline">
        {t("retry")}
      </button>
    </Container>
  );
}
