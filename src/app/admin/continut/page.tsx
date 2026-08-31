import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getTranslations } from "next-intl/server";

export default async function ContentHub() {
  await requirePermission("content.read");
  const t = await getTranslations("admin");
  const links = [
    { href: "/admin/continut/homepage", label: t("homepage") },
    { href: "/admin/continut/navigatie", label: t("navigation") },
    { href: "/admin/continut/pagini", label: t("pages") },
    { href: "/admin/continut/faq", label: t("faq") },
    { href: "/admin/continut/jurnal", label: t("journal") },
    { href: "/admin/continut/media", label: t("media") },
  ];
  return (
    <div>
      <AdminHeading k="content" />
      <p className="mt-2 max-w-xl text-sm text-mute">
        Pagina de acasă, jurnalul și paginile legale. Datele firmei (CUI, TVA, logo) sunt în Setări magazin.
      </p>
      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block border border-line bg-card px-5 py-6 hover:border-ink">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
