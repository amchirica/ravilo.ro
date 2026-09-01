import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isEnabled: boolean;
  scope?: string;
  categoryLabel?: string;
};

function faqPayload(formData: FormData) {
  return {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    is_enabled: formData.get("isEnabled") === "on",
    scope: String(formData.get("scope") ?? "global"),
    category_label: String(formData.get("categoryLabel") ?? ""),
  };
}

async function createFaq(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const payload = faqPayload(formData);
  payload.is_enabled = true;
  await sb().from("faq_items").insert(payload);
  revalidatePath("/faq");
  revalidatePath("/admin/continut/faq");
}

async function saveFaq(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  await sb().from("faq_items").update(faqPayload(formData)).eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "faq.update", entityType: "FaqItem", entityId: id });
  revalidatePath("/faq");
  revalidatePath("/admin/continut/faq");
}

async function deleteFaq(id: string) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("faq_items").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "faq.delete", entityType: "FaqItem", entityId: id });
  revalidatePath("/faq");
  revalidatePath("/admin/continut/faq");
}

export default async function FaqAdmin() {
  await requirePermission("content.write");
  const items = await listRows<Faq>("faq_items", { order: "sort_order" });
  return (
    <div>
      <AdminHeading k="faq" />
      <form action={createFaq} className="mt-8 grid max-w-xl gap-3 border border-line p-5">
        <FaqFields />
        <Button type="submit">Adaugă</Button>
      </form>
      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="border border-line p-4">
            <form action={saveFaq.bind(null, item.id)} className="grid max-w-xl gap-3">
              <FaqFields item={item} />
              <Button type="submit" variant="line">
                Salvează
              </Button>
            </form>
            <ConfirmForm action={deleteFaq.bind(null, item.id)} message="Ștergi întrebarea?">
              <button className="mt-3 text-xs text-danger underline">Șterge</button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqFields({ item }: { item?: Faq }) {
  return (
    <>
      <Field label="Întrebare">
        <Input name="question" required defaultValue={item?.question ?? ""} />
      </Field>
      <Field label="Răspuns">
        <Input name="answer" required defaultValue={item?.answer ?? ""} />
      </Field>
      <Field label="Grup">
        <Input name="categoryLabel" placeholder="Livrare, Plată..." defaultValue={item?.categoryLabel ?? ""} />
      </Field>
      <Field label="Ordine">
        <Input name="sortOrder" defaultValue={String(item?.sortOrder ?? 0)} />
      </Field>
      <select name="scope" defaultValue={item?.scope ?? "global"} className="border border-line bg-paper px-3 py-2">
        <option value="global">Global</option>
        <option value="product">Produs</option>
        <option value="category">Categorie</option>
      </select>
      {item ? (
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="isEnabled" defaultChecked={item.isEnabled} /> Activă
        </label>
      ) : (
        <input type="hidden" name="isEnabled" value="on" />
      )}
    </>
  );
}
