"use client";

import { useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

const KEY = "ravilo_consent_v1";

export function getStoredConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function subscribeConsent(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("ravilo-consent", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("ravilo-consent", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function CookieBanner() {
  const t = useTranslations("consent");
  const needsPrompt = useSyncExternalStore(subscribeConsent, () => !getStoredConsent(), () => false);
  const [hidden, setHidden] = useState(false);
  if (hidden || !needsPrompt) return null;

  function save(next: Consent) {
    localStorage.setItem(KEY, JSON.stringify(next));
    document.cookie = `ravilo_consent=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
    setHidden(true);
    window.dispatchEvent(new Event("ravilo-consent"));
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper p-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm text-ink-2">
          {t("body")}{" "}
          <Link className="underline" href="/cookies">
            {t("policy")}
          </Link>
        </p>
        <div className="flex gap-2">
          <Button variant="line" onClick={() => save({ necessary: true, analytics: false, marketing: false, preferences: false })}>
            {t("necessary")}
          </Button>
          <Button onClick={() => save({ necessary: true, analytics: true, marketing: true, preferences: true })}>{t("acceptAll")}</Button>
        </div>
      </div>
    </div>
  );
}
