import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { Field, Input, Button } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { revalidatePath } from "next/cache";
import { STOREFRONT_CACHE, revalidateStorefrontTag } from "@/lib/storefront-cache";
import { resolveFormImage } from "@/services/storage";

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  imagePath: string | null;
  ctaLabel: string;
  ctaUrl: string;
  placement: string;
  isActive: boolean;
  sortOrder: number;
};

export default async function BannersAdmin() {
  await requirePermission("content.write");
  const { data } = isSupabaseConfigured()
    ? await sb().from("store_banners").select("*").order("sort_order", { ascending: true })
    : { data: [] };
  const rows = camelList<Banner>(data);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <AdminHeading k="banners" />
        <p className="mt-2 text-sm text-mute">Placement: homepage, category, cart, global.</p>
        <ul className="mt-6 space-y-4">
          {rows.map((banner) => (
            <li key={banner.id} className="border border-line bg-card p-4">
              <form action={saveBanner.bind(null, banner.id)} className="grid gap-3" encType="multipart/form-data">
                <Field label="Titlu">
                  <Input name="title" defaultValue={banner.title} />
                </Field>
                <Field label="Subtitlu">
                  <Input name="subtitle" defaultValue={banner.subtitle} />
                </Field>
                <AdminImageField current={banner.imagePath} />
                <Field label="CTA">
                  <Input name="ctaLabel" defaultValue={banner.ctaLabel} />
                </Field>
                <Field label="URL">
                  <Input name="ctaUrl" defaultValue={banner.ctaUrl} />
                </Field>
                <Field label="Placement">
                  <Input name="placement" defaultValue={banner.placement} />
                </Field>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={banner.isActive} /> Activ
                </label>
                <Button type="submit" variant="line">
                  Salvează
                </Button>
              </form>
            </li>
          ))}
          {rows.length === 0 ? <li className="text-sm text-mute">Niciun banner. Creează unul în dreapta. Dacă tabela lipsește, rulează migrarea 0008.</li> : null}
        </ul>
      </div>
      <form action={createBanner} className="grid gap-3" encType="multipart/form-data">
        <h2 className="font-serif text-2xl">Banner nou</h2>
        <Field label="Titlu">
          <Input name="title" required />
        </Field>
        <Field label="Placement">
          <Input name="placement" defaultValue="homepage" />
        </Field>
        <AdminImageField />
        <Field label="CTA / URL">
          <Input name="ctaLabel" placeholder="Descoperă" />
          <Input name="ctaUrl" placeholder="/produse" />
        </Field>
        <Button type="submit">Creează</Button>
      </form>
    </div>
  );
}

async function createBanner(formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const imagePath = await resolveFormImage(formData, { createdBy: actor.id, folder: "banners" });
  await sb().from("store_banners").insert({
    title: String(formData.get("title") ?? ""),
    placement: String(formData.get("placement") ?? "homepage"),
    image_path: imagePath,
    cta_label: String(formData.get("ctaLabel") ?? ""),
    cta_url: String(formData.get("ctaUrl") ?? ""),
    is_active: true,
  });
  revalidatePath("/");
  revalidatePath("/admin/bannere");
  revalidateStorefrontTag(STOREFRONT_CACHE.banners);
}

async function saveBanner(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const imagePath = await resolveFormImage(formData, { createdBy: actor.id, folder: "banners" });
  await sb()
    .from("store_banners")
    .update({
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      image_path: imagePath,
      cta_label: String(formData.get("ctaLabel") ?? ""),
      cta_url: String(formData.get("ctaUrl") ?? ""),
      placement: String(formData.get("placement") ?? "homepage"),
      is_active: formData.get("isActive") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/");
  revalidatePath("/admin/bannere");
  revalidateStorefrontTag(STOREFRONT_CACHE.banners);
}
