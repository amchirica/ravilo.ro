import { JsonLd } from "@/components/seo/json-ld";
import { getStoreSettings } from "@/services/settings";

export async function SiteJsonLd({ locale }: { locale: string }) {
  const settings = await getStoreSettings();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const home = locale === "en" ? `${appUrl}/en` : appUrl;
  const logo = settings.logoPath || "/ravilo.png";
  const logoUrl = logo.startsWith("http") ? logo : `${appUrl}${logo.startsWith("/") ? logo : `/${logo}`}`;
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.companyName || settings.storeName,
          url: appUrl,
          logo: logoUrl,
          email: settings.email || undefined,
          telephone: settings.phone || undefined,
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: settings.storeName,
          url: home,
          inLanguage: locale === "en" ? "en" : "ro-RO",
          potentialAction: {
            "@type": "SearchAction",
            target: `${home.replace(/\/$/, "")}/cautare?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ]}
    />
  );
}
