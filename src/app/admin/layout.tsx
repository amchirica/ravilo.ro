import { getAdminUser } from "@/server/auth/session";
import { isStaffRole, hasPermission, type Permission } from "@/server/rbac";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/server/actions";
import { AdminThemeToggle } from "@/components/theme/admin-theme-toggle";
import { AdminLanguageSwitcher } from "@/components/i18n/admin-language-switcher";
import { AdminIntlProvider } from "@/components/admin/admin-intl-provider";
import { BrandLogo } from "@/components/brand/brand-logo";
import { canSeedDemo } from "@/lib/dev-seed-guard";
import { isPublicAdminPath } from "@/lib/supabase/middleware";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type NavLink = { href: string; labelKey: string; permission: Permission };

const NAV: { titleKey: string; items: NavLink[] }[] = [
  {
    titleKey: "",
    items: [{ href: "/admin", labelKey: "dashboard", permission: "order.read" }],
  },
  {
    titleKey: "shopGroup",
    items: [
      { href: "/admin/produse", labelKey: "products", permission: "product.read" },
      { href: "/admin/categorii", labelKey: "categories", permission: "product.read" },
      { href: "/admin/colectii", labelKey: "collections", permission: "product.read" },
      { href: "/admin/comenzi", labelKey: "orders", permission: "order.read" },
      { href: "/admin/retururi", labelKey: "returns", permission: "order.read" },
      { href: "/admin/clienti", labelKey: "customers", permission: "customer.read" },
      { href: "/admin/inventar", labelKey: "stock", permission: "inventory.read" },
      { href: "/admin/recenzii", labelKey: "reviews", permission: "review.moderate" },
    ],
  },
  {
    titleKey: "contentGroup",
    items: [
      { href: "/admin/continut/homepage", labelKey: "homepage", permission: "content.read" },
      { href: "/admin/continut/blog", labelKey: "journal", permission: "content.read" },
      { href: "/admin/continut/blog-categorii", labelKey: "journalCategories", permission: "content.read" },
      { href: "/admin/continut/ghiduri", labelKey: "guides", permission: "content.read" },
      { href: "/admin/continut/pagini", labelKey: "pages", permission: "content.read" },
      { href: "/admin/continut/faq", labelKey: "faq", permission: "content.read" },
      { href: "/admin/continut/media", labelKey: "media", permission: "content.read" },
    ],
  },
  {
    titleKey: "marketingGroup",
    items: [
      { href: "/admin/reduceri", labelKey: "discountsCoupons", permission: "discount.read" },
      { href: "/admin/bannere", labelKey: "banners", permission: "content.write" },
      { href: "/admin/newsletter", labelKey: "newsletter", permission: "content.read" },
      { href: "/admin/seo", labelKey: "seo", permission: "content.read" },
      { href: "/admin/recomandari", labelKey: "recommendations", permission: "product.write" },
      { href: "/admin/marketing/cautare", labelKey: "searchMerch", permission: "content.write" },
    ],
  },
  {
    titleKey: "systemGroup",
    items: [
      { href: "/admin/setari", labelKey: "storeSettings", permission: "settings.write" },
      { href: "/admin/livrare", labelKey: "shipping", permission: "shipping.write" },
      { href: "/admin/plati", labelKey: "payments", permission: "settings.write" },
      { href: "/admin/emailuri", labelKey: "emails", permission: "settings.write" },
      { href: "/admin/utilizatori", labelKey: "users", permission: "admin.manage" },
      { href: "/admin/clienti/cereri", labelKey: "gdpr", permission: "customer.write" },
      { href: "/admin/audit", labelKey: "audit", permission: "audit.read" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-ravilo-pathname") ?? "";
  if (isPublicAdminPath(pathname)) {
    return <AdminIntlProvider>{children}</AdminIntlProvider>;
  }

  const user = await getAdminUser();
  if (!user) {
    redirect(`/admin/login?next=${encodeURIComponent(pathname || "/admin")}`);
  }
  if (!isStaffRole(user.role)) {
    redirect("/admin/login?e=1");
  }

  const t = await getTranslations("admin");
  const extra = canSeedDemo()
    ? [{ titleKey: "devGroup", items: [{ href: "/admin/dezvoltare", labelKey: "dev", permission: "admin.manage" as Permission }] }]
    : [];

  return (
    <AdminIntlProvider>
      <div className="flex min-h-screen bg-paper">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-band px-5 py-8 text-band-fg md:block">
          <div className="flex items-center justify-between gap-2">
            <BrandLogo href="/admin" height={28} invert className="max-w-[9.5rem] [&_img]:max-w-full" />
            <div className="flex items-center gap-1">
              <AdminLanguageSwitcher />
              <AdminThemeToggle />
            </div>
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] opacity-70">{user.role}</p>
          <nav className="mt-8 grid gap-6 text-sm">
            {[...NAV, ...extra].map((group) => {
              const items = group.items.filter((item) => hasPermission(user.role, item.permission));
              if (!items.length) return null;
              return (
                <div key={group.titleKey || "dash"}>
                  {group.titleKey ? (
                    <p className="mb-2 text-[10px] uppercase tracking-[0.18em] opacity-50">{t(group.titleKey as "shopGroup")}</p>
                  ) : null}
                  <div className="grid gap-1">
                    {items.map((item) => (
                      <Link key={`${item.href}-${item.labelKey}`} href={item.href} className="rounded-md px-2.5 py-2 text-[0.8125rem] opacity-80 transition-colors hover:bg-white/10 hover:opacity-100">
                        {t(item.labelKey as "products")}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          <form action={logoutAction} className="mt-8">
            <button className="text-xs uppercase tracking-widest opacity-70">{t("logout")}</button>
          </form>
        </aside>
        <div className="min-w-0 flex-1 bg-surface p-6 md:p-8">{children}</div>
      </div>
    </AdminIntlProvider>
  );
}
