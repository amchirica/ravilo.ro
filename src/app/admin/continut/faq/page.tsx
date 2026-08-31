import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isEnabled: boolean;
  scope?: string;
  categoryLabel?: string;
};

async function saveFaq(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const payload = {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    sort_order: Number(formData.get("sortOrder") ?? 0),
    is_enabled: true,
    scope: String(formData.get("scope") ?? "global"),
    category_label: String(formData.get("categoryLabel") ?? ""),
  };
  await sb().from("faq_items").insert(payload);
  revalidatePath("/faq");
  revalidatePath("/admin/continut/faq");
}

export default async function FaqAdmin() {
  await requirePermission("content.write");
  const items = await listRows<Faq>("faq_items", { order: "sort_order" });
  return (
    <div>
      <AdminHeading k="faq" />
      <form action={saveFaq} className="mt-8 grid max-w-xl gap-3 border border-line p-5">
        <Field label="Întrebare">
          <Input name="question" required />
        </Field>
        <Field label="Răspuns">
          <Input name="answer" required />
        </Field>
        <Field label="Grup">
          <Input name="categoryLabel" placeholder="Livrare, Plată..." />
        </Field>
        <select name="scope" className="border border-line bg-paper px-3 py-2">
          <option value="global">Global</option>
          <option value="product">Produs</option>
          <option value="category">Categorie</option>
        </select>
        <Button type="submit">Adaugă</Button>
      </form>
      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <p className="font-medium">{item.question}</p>
            <p className="text-sm text-mute">{item.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
