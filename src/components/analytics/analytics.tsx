"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getStoredConsent } from "@/components/consent/cookie-banner";

const GA_ID = /^G-[A-Z0-9]+$/i;

export function Analytics() {
  const [consent, setConsent] = useState<{ analytics: boolean; marketing: boolean } | null>(null);
  useEffect(() => {
    function sync() {
      const stored = getStoredConsent();
      setConsent(stored);
    }
    sync();
    window.addEventListener("ravilo-consent", sync);
    return () => window.removeEventListener("ravilo-consent", sync);
  }, []);
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!consent?.analytics || !ga || !GA_ID.test(ga)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
