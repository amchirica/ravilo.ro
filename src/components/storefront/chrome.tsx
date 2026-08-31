import { Link } from "@/i18n/routing";
import { User, Heart, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { getActiveAnnouncement, getActiveCategories } from "@/services/cms";
import { getStoreSettings } from "@/services/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { pickLocalized, type AppLocale } from "@/lib/i18n";
import { interpolateSettings } from "@/lib/placeholders";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { HeaderSearch } from "@/components/storefront/header-search";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { HeaderNav } from "@/components/storefront/header-nav";
import { StickyHeader } from "@/components/storefront/sticky-header";
import { Suspense } from "react";

export async function StoreHeader() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("nav");
  const [announcement, settings, categories] = await Promise.all([
    getActiveAnnouncement(),
    getStoreSettings(),
    getActiveCategories(locale),
  ]);
  const template =
    announcement && settings.announcementEnabled
      ? pickLocalized(announcement.text, announcement.textEn, locale)
      : settings.announcementEnabled
        ? locale === "en"
          ? settings.announcementTemplateEn
          : settings.announcementTemplate
        : null;
  const announcementText = template ? interpolateSettings(template, settings) : null;
  const announcementLink = announcement?.link || settings.announcementLink;
  const navItems = [
    { id: "noutati", url: "/noutati", label: t("newArrivals") },
    { id: "produse", url: "/produse", label: t("products") },
    { id: "colectii", url: "/colectii", label: t("collections") },
    { id: "ghiduri", url: "/ghiduri", label: t("guides") },
    { id: "jurnal", url: "/blog", label: t("journal") },
  ];
  const barClass =
    settings.announcementStyle === "line" ? "border-b border-line bg-surface text-ink" : "bg-band text-band-fg";
  const announcementBar = announcementText ? (
    <div className={barClass}>
      <Container className="py-2 text-center text-[0.6875rem] tracking-[0.14em]">
        {announcementLink ? (
          <Link prefetch={false} href={announcementLink} className="underline-offset-4 hover:underline">
            {announcementText}
          </Link>
        ) : (
          announcementText
        )}
      </Container>
    </div>
  ) : null;
  const iconClass = "inline-flex h-11 w-11 items-center justify-center text-ink/75 transition-colors hover:text-ink";
  return (
    <StickyHeader announcement={announcementBar}>
      <Container className="relative flex h-[var(--header-h)] items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-0.5">
          <MobileNav items={navItems} label={t("openMenu")} />
          <BrandLogo href="/" height={32} className="max-w-[8.5rem] sm:max-w-none" priority />
        </div>
        <HeaderNav items={navItems} categories={categories} productsLabel={t("products")} />
        <div className="flex shrink-0 items-center">
          <div className="hidden items-center lg:flex">
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
            <ThemeToggle />
          </div>
          <Suspense>
            <HeaderSearch />
          </Suspense>
          <Link prefetch={false} href="/cont" aria-label={t("account")} className={`hidden lg:inline-flex ${iconClass}`}>
            <User size={18} strokeWidth={1.5} />
          </Link>
          <Link prefetch={false} href="/favorite" aria-label={t("wishlist")} className={`hidden lg:inline-flex ${iconClass}`}>
            <Heart size={18} strokeWidth={1.5} />
          </Link>
          <Link prefetch={false} href="/cos" aria-label={t("cart")} className={iconClass}>
            <ShoppingBag size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </Container>
    </StickyHeader>
  );
}

export async function StoreFooter() {
  const t = await getTranslations();
  const settings = await getStoreSettings();
  const year = new Date().getFullYear();
  const linkClass = "text-sm text-ink/75 transition-colors hover:text-ink";
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <Container className="grid gap-12 py-16 md:grid-cols-12 md:gap-8 md:py-24">
        <div className="md:col-span-4">
          <BrandLogo href="/" height={36} />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-mute">{t("meta.tagline")}</p>
          <div className="mt-8 max-w-sm">
            <p className="text-sm tracking-[-0.02em]">{t("home.newsletter")}</p>
            <NewsletterForm source="footer" />
            <p className="mt-2 text-xs leading-relaxed text-mute">{t("home.newsletterHint")}</p>
          </div>
        </div>
        <nav className="grid gap-3 md:col-span-2" aria-label={t("nav.shop")}>
          <p className="eyebrow">{t("nav.shop")}</p>
          <Link prefetch={false} href="/produse" className={linkClass}>
            {t("nav.products")}
          </Link>
          <Link prefetch={false} href="/noutati" className={linkClass}>
            {t("nav.newArrivals")}
          </Link>
          <Link prefetch={false} href="/colectii" className={linkClass}>
            {t("nav.collections")}
          </Link>
          <Link prefetch={false} href="/best-sellers" className={linkClass}>
            {t("nav.bestSellers")}
          </Link>
          <Link prefetch={false} href="/pachete" className={linkClass}>
            {t("nav.bundles")}
          </Link>
          <Link prefetch={false} href="/categorii" className={linkClass}>
            {t("nav.allCategories")}
          </Link>
        </nav>
        <nav className="grid gap-3 md:col-span-2" aria-label={t("nav.help")}>
          <p className="eyebrow">{t("nav.help")}</p>
          <Link prefetch={false} href="/contact" className={linkClass}>
            {t("nav.contact")}
          </Link>
          <Link prefetch={false} href="/faq" className={linkClass}>
            {t("nav.faq")}
          </Link>
          <Link prefetch={false} href="/livrare" className={linkClass}>
            {t("nav.shipping")}
          </Link>
          <Link prefetch={false} href="/retur" className={linkClass}>
            {t("nav.returns")}
          </Link>
          <Link prefetch={false} href="/urmareste-comanda" className={linkClass}>
            {t("nav.trackOrder")}
          </Link>
        </nav>
        <nav className="grid gap-3 md:col-span-2" aria-label={t("meta.storeName")}>
          <p className="eyebrow">{t("meta.storeName")}</p>
          <Link prefetch={false} href="/despre" className={linkClass}>
            {t("nav.about")}
          </Link>
          <Link prefetch={false} href="/blog" className={linkClass}>
            {t("nav.journal")}
          </Link>
          <Link prefetch={false} href="/ghiduri" className={linkClass}>
            {t("nav.guides")}
          </Link>
          <Link prefetch={false} href="/recenzii" className={linkClass}>
            {t("nav.reviews")}
          </Link>
        </nav>
        <nav className="grid gap-3 md:col-span-2" aria-label={t("nav.legal")}>
          <p className="eyebrow">{t("nav.legal")}</p>
          <Link prefetch={false} href="/termeni" className={linkClass}>
            {t("nav.terms")}
          </Link>
          <Link prefetch={false} href="/confidentialitate" className={linkClass}>
            {t("nav.privacy")}
          </Link>
          <Link prefetch={false} href="/cookies" className={linkClass}>
            {t("nav.cookies")}
          </Link>
          <a href="https://anpc.ro" rel="noopener noreferrer" target="_blank" className={linkClass}>
            {t("footer.anpc")}
          </a>
        </nav>
      </Container>
      <Container className="flex flex-col gap-3 border-t border-line py-8 text-xs text-mute md:flex-row md:items-end md:justify-between">
        <div>
          <p>
            © {year} {settings.siteName || settings.storeName}
            {settings.companyName ? ` · ${settings.companyName}` : ""}
            {settings.cui ? ` · CUI ${settings.cui}` : ""}
            {settings.registrationNumber ? ` · ${settings.registrationNumber}` : ""}
          </p>
          {settings.address ? <p className="mt-1">{settings.address}</p> : <p className="mt-1">{t("footer.legalPlaceholder")}</p>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {settings.social.instagram ? (
            <a href={settings.social.instagram} className="hover:text-ink">
              Instagram
            </a>
          ) : null}
          {settings.social.facebook ? (
            <a href={settings.social.facebook} className="hover:text-ink">
              Facebook
            </a>
          ) : null}
          {settings.social.tiktok ? (
            <a href={settings.social.tiktok} className="hover:text-ink">
              TikTok
            </a>
          ) : null}
          {settings.social.youtube ? (
            <a href={settings.social.youtube} className="hover:text-ink">
              YouTube
            </a>
          ) : null}
          {settings.phone ? <span>{settings.phone}</span> : null}
          <span>{t("checkout.trustSecure")}</span>
        </div>
      </Container>
    </footer>
  );
}
