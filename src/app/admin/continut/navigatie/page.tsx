import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";

type Menu = {
  id: string;
  location: string;
  items: { id: string; label: string; url: string | null; sortOrder: number }[];
};

export default async function NavigationAdmin() {
  await requirePermission("content.write");
  const { data: menusRaw } = isSupabaseConfigured()
    ? await sb().from("navigation_menus").select("id, location")
    : { data: [] };
  const menus: Menu[] = [];
  for (const menu of menusRaw ?? []) {
    const { data: items } = await sb().from("navigation_items").select("*").eq("menu_id", menu.id);
    menus.push({
      id: menu.id,
      location: menu.location,
      items: camelList(items),
    });
  }
  return (
    <div>
      <AdminHeading k="navigation" />
      {menus.map((menu) => (
        <section key={menu.id} className="mt-8">
          <h2 className="font-serif text-2xl">{menu.location}</h2>
          <ul className="mt-3 text-sm">
            {[...menu.items]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <li key={item.id}>
                  {item.label} → {item.url}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
