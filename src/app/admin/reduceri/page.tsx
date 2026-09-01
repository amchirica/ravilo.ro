import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Button } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";
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

type DiscountRow = {
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
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function displayValue(discount: DiscountRow) {
  if (discount.type === "PERCENTAGE") return String(discount.value);
  if (discount.type === "FREE_SHIPPING") return "0";
  return (discount.value / 100).toFixed(2);
}

function payloadFromForm(formData: FormData) {
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
  const value = parsed.type === "PERCENTAGE" ? Math.round(Number(parsed.value)) : parseRonToBani(parsed.value || "0");
  return {
    code: parsed.code.toUpperCase().trim(),
    name: parsed.name,
    type: parsed.type,
    value,
    minimum_order_value: parseRonToBani(parsed.minimumOrderValue ?? "0"),
    usage_limit: parsed.usageLimit ? Number(parsed.usageLimit) : null,
    starts_at: parsed.startsAt ? new Date(parsed.startsAt).toISOString() : null,
    ends_at: parsed.endsAt ? new Date(parsed.endsAt).toISOString() : null,
    is_active: parsed.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
}

export default async function DiscountsAdmin() {
  await requirePermission("discount.write");
  const rows = await listRows<DiscountRow>("discounts", { order: "created_at", ascending: false });
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <AdminHeading k="discounts" />
        <ul className="mt-6 space-y-4">
          {rows.map((discount) => (
            <li key={discount.id} className="border border-line p-4">
              <form action={saveDiscount.bind(null, discount.id)} className="grid gap-3">
                <DiscountFields discount={discount} />
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" variant="line">
                    Salvează
                  </Button>
                </div>
              </form>
              <ConfirmForm
                action={deleteDiscount.bind(null, discount.id)}
                message="Ștergi codul de reducere? Folosirile rămân în istoricul comenzilor."
              >
                <button className="mt-3 text-xs text-danger underline">Șterge</button>
              </ConfirmForm>
            </li>
          ))}
          {rows.length === 0 ? <li>Nicio reducere încă.</li> : null}
        </ul>
      </div>
      <form action={createDiscount} className="grid gap-3">
        <h2 className="font-serif text-2xl">Cod nou</h2>
        <DiscountFields />
        <Button type="submit">Creează</Button>
      </form>
    </div>
  );
}

function DiscountFields({ discount }: { discount?: DiscountRow }) {
  return (
    <>
      <Field label="Cod">
        <Input name="code" required defaultValue={discount?.code ?? ""} />
      </Field>
      <Field label="Nume">
        <Input name="name" required defaultValue={discount?.name ?? ""} />
      </Field>
      <Field label="Tip">
        <select name="type" defaultValue={discount?.type ?? "PERCENTAGE"} className="w-full rounded-md border border-line px-3 py-2">
          <option value="PERCENTAGE">Procent</option>
          <option value="FIXED_AMOUNT">Sumă fixă</option>
          <option value="FREE_SHIPPING">Transport gratuit</option>
        </select>
      </Field>
      <Field label="Valoare (procent: 10 = 10%, sumă: RON)">
        <Input name="value" required defaultValue={discount ? displayValue(discount) : ""} />
      </Field>
      <Field label="Minim comandă (RON)">
        <Input name="minimumOrderValue" defaultValue={discount ? (discount.minimumOrderValue / 100).toFixed(2) : "0"} />
      </Field>
      <Field label="Limită folosiri">
        <Input name="usageLimit" defaultValue={discount?.usageLimit != null ? String(discount.usageLimit) : ""} />
      </Field>
      <Field label="Valid de la">
        <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(discount?.startsAt ?? null)} />
      </Field>
      <Field label="Valid până">
        <Input name="endsAt" type="datetime-local" defaultValue={toLocalInput(discount?.endsAt ?? null)} />
      </Field>
      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={discount?.isActive ?? true} /> Activ
      </label>
    </>
  );
}

async function createDiscount(formData: FormData) {
  "use server";
  const actor = await requirePermission("discount.write");
  const payload = payloadFromForm(formData);
  const { data, error } = await sb().from("discounts").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Nu am putut crea reducerea.");
  await writeAudit({ actorUserId: actor.id, action: "discount.create", entityType: "Discount", entityId: data.id, after: { code: payload.code } });
  revalidatePath("/admin/reduceri");
}

async function saveDiscount(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("discount.write");
  const payload = payloadFromForm(formData);
  const { error } = await sb().from("discounts").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "discount.update", entityType: "Discount", entityId: id, after: { code: payload.code } });
  revalidatePath("/admin/reduceri");
}

async function deleteDiscount(id: string) {
  "use server";
  const actor = await requirePermission("discount.write");
  await sb().from("discount_redemptions").delete().eq("discount_id", id);
  const { error } = await sb().from("discounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "discount.delete", entityType: "Discount", entityId: id });
  revalidatePath("/admin/reduceri");
}
