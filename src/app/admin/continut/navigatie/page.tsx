import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Button } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";

const LOCATIONS = ["HEADER", "MOBILE", "FOOTER"] as const;

type MenuItem = {
  id: string;
  label: string;
  url: string | null;
  sortOrder: number;
  isVisible: boolean;
};

type Menu = {
  id: string;
  location: string;
  items: MenuItem[];
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
      items: camelList<MenuItem>(items),
    });
  }
  const existing = new Set(menus.map((menu) => menu.location));
  return (
    <div>
      <AdminHeading k="navigation" />
      <p className="mt-2 max-w-xl text-sm text-mute">
        HEADER înlocuiește meniul principal din magazin când are linkuri vizibile. MOBILE și FOOTER rămân disponibile pentru
        aceleași locuri, dacă le folosești.
      </p>
      {LOCATIONS.filter((location) => !existing.has(location)).length ? (
        <form action={ensureMenus} className="mt-6">
          <Button type="submit" variant="line">
            Creează meniurile lipsă
          </Button>
        </form>
      ) : null}
      {menus.map((menu) => (
        <section key={menu.id} className="mt-10 border border-line p-5">
          <h2 className="font-serif text-2xl">{menu.location}</h2>
          <ul className="mt-4 space-y-4">
            {[...menu.items]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <li key={item.id} className="border-t border-line pt-4">
                  <form action={saveItem.bind(null, item.id)} className="grid gap-3 md:grid-cols-2">
                    <Field label="Etichetă">
                      <Input name="label" required defaultValue={item.label} />
                    </Field>
                    <Field label="URL">
                      <Input name="url" required defaultValue={item.url ?? ""} />
                    </Field>
                    <Field label="Ordine">
                      <Input name="sortOrder" defaultValue={String(item.sortOrder)} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isVisible" defaultChecked={item.isVisible} /> Vizibil
                    </label>
                    <Button type="submit" variant="line">
                      Salvează
                    </Button>
                  </form>
                  <ConfirmForm action={deleteItem.bind(null, item.id)} message="Ștergi linkul din meniu?">
                    <button className="mt-2 text-xs text-danger underline">Șterge</button>
                  </ConfirmForm>
                </li>
              ))}
          </ul>
          <form action={addItem.bind(null, menu.id)} className="mt-6 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
            <Field label="Etichetă nouă">
              <Input name="label" required />
            </Field>
            <Field label="URL">
              <Input name="url" required placeholder="/produse" />
            </Field>
            <Button type="submit">Adaugă link</Button>
          </form>
        </section>
      ))}
    </div>
  );
}

function revalidateNav() {
  revalidatePath("/");
  revalidatePath("/admin/continut/navigatie");
}

async function ensureMenus() {
  "use server";
  const actor = await requirePermission("content.write");
  for (const location of LOCATIONS) {
    await sb().from("navigation_menus").upsert({ location }, { onConflict: "location", ignoreDuplicates: true });
  }
  await writeAudit({ actorUserId: actor.id, action: "navigation.ensure", entityType: "NavigationMenu", entityId: "all" });
  revalidateNav();
}

async function addItem(menuId: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const { count } = await sb().from("navigation_items").select("id", { count: "exact", head: true }).eq("menu_id", menuId);
  await sb().from("navigation_items").insert({
    menu_id: menuId,
    label: String(formData.get("label") ?? "").trim(),
    url: String(formData.get("url") ?? "").trim() || "/",
    sort_order: count ?? 0,
    is_visible: true,
  });
  await writeAudit({ actorUserId: actor.id, action: "navigation.add", entityType: "NavigationItem", entityId: menuId });
  revalidateNav();
}

async function saveItem(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb()
    .from("navigation_items")
    .update({
      label: String(formData.get("label") ?? "").trim(),
      url: String(formData.get("url") ?? "").trim() || "/",
      sort_order: Number(formData.get("sortOrder") ?? 0) || 0,
      is_visible: formData.get("isVisible") === "on",
    })
    .eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "navigation.update", entityType: "NavigationItem", entityId: id });
  revalidateNav();
}

async function deleteItem(id: string) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("navigation_items").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "navigation.delete", entityType: "NavigationItem", entityId: id });
  revalidateNav();
}
