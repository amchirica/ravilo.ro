"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
      <div>
        <h1 className="font-display text-4xl">{t("confirmed")}</h1>
        <p className="mt-4 text-mute">{t("number", { number: orderNumber })}</p>
      </div>
    );
  }
  if (status === "FAILED") {
    return (
      <div>
        <h1 className="font-display text-4xl">{t("failed")}</h1>
        <p className="mt-4 text-mute">{t("failedHint")}</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="font-display text-4xl">{t("confirming")}</h1>
      <p className="mt-4 text-mute">{t("confirmingHint")}</p>
    </div>
  );
}
