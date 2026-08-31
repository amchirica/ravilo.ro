import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Button } from "@/components/ui/primitives";
import { parseRonToBani } from "@/lib/money";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: z.string(),
  minimumOrderValue: z.string().optional(),
  usageLimit: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional(),
});

export default async function DiscountsAdmin() {
  await requirePermission("discount.write");
  const rows = await listRows<{
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
    minimumOrderValue: number;
    usageLimit: number | null;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }>("discounts", { order: "created_at", ascending: false });
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <AdminHeading k="discounts" />
        <ul className="mt-6 space-y-2 text-sm">
          {rows.map((discount) => (
            <li key={discount.id} className="flex items-center justify-between border-b border-line py-3">
              <span>
                {discount.code} · {discount.type} · {discount.type === "PERCENTAGE" ? `${discount.value}%` : discount.value} ·{" "}
                {discount.isActive ? "activ" : "inactiv"}
              </span>
              <form action={toggleDiscount.bind(null, discount.id, !discount.isActive)}>
                <button className="text-xs underline">{discount.isActive ? "Dezactivează" : "Activează"}</button>
              </form>
            </li>
          ))}
          {rows.length === 0 ? <li>Nicio reducere încă.</li> : null}
        </ul>
      </div>
      <form action={createDiscount} className="grid gap-3">
        <h2 className="font-serif text-2xl">Cod nou</h2>
        <Field label="Cod">
          <Input name="code" required />
        </Field>
        <Field label="Nume">
          <Input name="name" required />
        </Field>
        <Field label="Tip">
          <select name="type" className="w-full rounded-md border border-line px-3 py-2">
            <option value="PERCENTAGE">Procent</option>
            <option value="FIXED_AMOUNT">Sumă fixă</option>
            <option value="FREE_SHIPPING">Transport gratuit</option>
          </select>
        </Field>
        <Field label="Valoare (procent: 10 = 10%, sumă: RON)">
          <Input name="value" required />
        </Field>
        <Field label="Minim comandă (RON)">
          <Input name="minimumOrderValue" defaultValue="0" />
        </Field>
        <Field label="Limită folosiri">
          <Input name="usageLimit" />
        </Field>
        <Field label="Valid de la">
          <Input name="startsAt" type="datetime-local" />
        </Field>
        <Field label="Valid până">
          <Input name="endsAt" type="datetime-local" />
        </Field>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> Activ
        </label>
        <Button type="submit">Creează</Button>
      </form>
    </div>
  );
}

async function createDiscount(formData: FormData) {
  "use server";
  const actor = await requirePermission("discount.write");
  const parsed = schema.parse({
    code: formData.get("code"),
    name: formData.get("name"),
    type: formData.get("type"),
    value: formData.get("value"),
    minimumOrderValue: String(formData.get("minimumOrderValue") ?? "0"),
    usageLimit: String(formData.get("usageLimit") ?? "") || undefined,
    startsAt: String(formData.get("startsAt") ?? "") || undefined,
    endsAt: String(formData.get("endsAt") ?? "") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  const value = parsed.type === "PERCENTAGE" ? Math.round(Number(parsed.value)) : parseRonToBani(parsed.value);
  const { data, error } = await sb()
    .from("discounts")
    .insert({
      code: parsed.code.toUpperCase().trim(),
      name: parsed.name,
      type: parsed.type,
      value,
      minimum_order_value: parseRonToBani(parsed.minimumOrderValue ?? "0"),
      usage_limit: parsed.usageLimit ? Number(parsed.usageLimit) : null,
      starts_at: parsed.startsAt ? new Date(parsed.startsAt).toISOString() : null,
      ends_at: parsed.endsAt ? new Date(parsed.endsAt).toISOString() : null,
      is_active: parsed.isActive ?? true,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Nu am putut crea reducerea.");
  await writeAudit({ actorUserId: actor.id, action: "discount.create", entityType: "Discount", entityId: data.id, after: { code: parsed.code } });
  revalidatePath("/admin/reduceri");
}

async function toggleDiscount(id: string, isActive: boolean) {
  "use server";
  const actor = await requirePermission("discount.write");
  await sb().from("discounts").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "discount.toggle", entityType: "Discount", entityId: id, after: { isActive } });
  revalidatePath("/admin/reduceri");
}
