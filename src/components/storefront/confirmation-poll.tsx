"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";

export function ConfirmationPoll({
  token,
  initialStatus,
  orderNumber,
}: {
  token: string;
  initialStatus: string;
  orderNumber: string;
}) {
  const t = useTranslations("order");
  const tCheckout = useTranslations("checkout");
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => {
    if (status === "PAID") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/orders/status?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { paymentStatus: string };
      setStatus(data.paymentStatus);
    }, 2000);
    return () => clearInterval(timer);
  }, [status, token]);

  if (status === "PAID") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-cream text-ink" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4.5 10.5 8 14l7.5-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="eyebrow mt-6">RAVILO</p>
        <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">{t("confirmed")}</h1>
        <p className="mt-5 text-lg leading-relaxed text-mute">{t("confirmedHint")}</p>
        <p className="mt-4 text-sm tracking-[-0.01em]">{t("number", { number: orderNumber })}</p>
        <p className="mt-8 text-sm text-mute">{t("thanks")}</p>
        <p className="mt-1 text-sm text-mute">{t("confirmedNote")}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button href={`/urmareste-comanda?n=${encodeURIComponent(orderNumber)}`}>{t("viewOrder")}</Button>
          <Button href="/" variant="secondary">
            {t("backToShop")}
          </Button>
        </div>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div className="text-center">
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">{t("failed")}</h1>
        <p className="mt-5 text-lg leading-relaxed text-mute">{t("failedHint")}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button href="/checkout">{tCheckout("retry")}</Button>
          <Button href="/cos" variant="secondary">
            {tCheckout("backToCart")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.04em]">{t("confirming")}</h1>
      <p className="mt-5 text-lg leading-relaxed text-mute">{t("confirmingHint")}</p>
    </div>
  );
}
