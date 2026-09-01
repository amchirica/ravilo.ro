import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { formatRon, parseRonToBani } from "@/lib/money";
import { getStoreSettings } from "@/services/settings";
import { Field, Input, Button } from "@/components/ui/primitives";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { ConfirmForm } from "@/components/admin/confirm-form";
import Link from "next/link";

type Method = {
  id: string;
  name: string;
  price: number;
  freeAbove: number | null;
  provider: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
};

export default async function ShippingAdmin() {
  await requirePermission("shipping.write");
  const settings = await getStoreSettings();
  const methods = await listRows<Method>("shipping_methods", { order: "sort_order" });
  return (
    <div className="max-w-2xl">
      <AdminHeading k="shipping" />
      <p className="mt-2 text-sm text-mute">
        Pragul de transport gratuit este o singură valoare, din{" "}
        <Link href="/admin/setari" className="underline">
          Setări magazin
        </Link>
        : {formatRon(settings.freeShippingThreshold)}.
      </p>
      <ul className="mt-8 grid gap-6">
        {methods.length === 0 ? <li className="text-sm text-mute">Nicio metodă de livrare. Creează una din Development sau adaugă mai jos.</li> : null}
        {methods.map((method) => (
          <li key={method.id}>
            <form action={saveMethod.bind(null, method.id)} className="grid gap-3 border border-line bg-card p-5">
              <Field label="Nume">
                <Input name="name" defaultValue={method.name} required />
              </Field>
              <Field label="Cost (RON)">
                <Input name="price" defaultValue={(method.price / 100).toFixed(2)} />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Zile min">
                  <Input name="estimatedMinDays" type="number" defaultValue={String(method.estimatedMinDays)} />
                </Field>
                <Field label="Zile max">
                  <Input name="estimatedMaxDays" type="number" defaultValue={String(method.estimatedMaxDays)} />
                </Field>
              </div>
              <p className="text-xs text-mute">Provider: {method.provider}. free_above pe metodă este ignorat — se folosește pragul din setări.</p>
              <label className="flex gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={method.isActive} /> Activă
              </label>
              <Button type="submit">Salvează metoda</Button>
            </form>
            <ConfirmForm action={deleteMethod.bind(null, method.id)} message="Ștergi metoda de livrare?">
              <button className="mt-2 text-xs text-danger underline">Șterge metoda</button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
      <form action={createMethod} className="mt-10 grid gap-3 border border-dashed border-line p-5">
        <h2 className="font-serif text-2xl">Metodă nouă</h2>
        <Field label="Nume">
          <Input name="name" required placeholder="Curier standard" />
        </Field>
        <Field label="Cost (RON)">
          <Input name="price" defaultValue="19.90" />
        </Field>
        <Button type="submit">Adaugă</Button>
      </form>
    </div>
  );
}

async function saveMethod(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("shipping.write");
  if (!isSupabaseConfigured()) return;
  const min = Number(formData.get("estimatedMinDays") ?? 1);
  const max = Number(formData.get("estimatedMaxDays") ?? 3);
  await sb()
    .from("shipping_methods")
    .update({
      name: String(formData.get("name") ?? "").trim() || "Livrare",
      price: parseRonToBani(String(formData.get("price") ?? "0")),
      estimated_min_days: Number.isFinite(min) ? min : 1,
      estimated_max_days: Number.isFinite(max) ? max : 3,
      is_active: formData.get("isActive") === "on",
      free_above: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "shipping.update", entityType: "ShippingMethod", entityId: id });
  revalidatePath("/admin/livrare");
  revalidatePath("/checkout");
}

async function deleteMethod(id: string) {
  "use server";
  const actor = await requirePermission("shipping.write");
  const { error } = await sb().from("shipping_methods").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "shipping.delete", entityType: "ShippingMethod", entityId: id });
  revalidatePath("/admin/livrare");
  revalidatePath("/checkout");
}

async function createMethod(formData: FormData) {
  "use server";
  const actor = await requirePermission("shipping.write");
  if (!isSupabaseConfigured()) return;
  await sb().from("shipping_methods").insert({
    name: String(formData.get("name") ?? "").trim() || "Livrare",
    provider: "manual",
    price: parseRonToBani(String(formData.get("price") ?? "0")),
    free_above: null,
    is_active: true,
  });
  await writeAudit({ actorUserId: actor.id, action: "shipping.create", entityType: "ShippingMethod", entityId: "new" });
  revalidatePath("/admin/livrare");
}
