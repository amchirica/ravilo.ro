import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { Field, Input, Button, Select } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { revalidatePath } from "next/cache";
import { STOREFRONT_CACHE, revalidateStorefrontTag } from "@/lib/storefront-cache";
import { resolveFormImage } from "@/services/storage";
import { BANNER_PLACEMENTS, normalizeBannerPlacement } from "@/lib/banner-placement";

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

const PLACEMENT_LABELS: Record<(typeof BANNER_PLACEMENTS)[number], string> = {
  homepage: "Pagina de acasă",
  category: "Categorii",
  cart: "Coș",
  global: "Tot magazinul (sub meniu)",
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
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Bannerele publicate aici apar pe magazin, nu în Setări. Alege locul: acasă, categorii, coș, sau o bandă sub meniu pe tot site-ul. Trebuie bifat <strong className="font-medium text-ink">Activ</strong>.
        </p>
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
                <Field label="Unde apare">
                  <Select name="placement" defaultValue={normalizeBannerPlacement(banner.placement)}>
                    {BANNER_PLACEMENTS.map((placement) => (
                      <option key={placement} value={placement}>
                        {PLACEMENT_LABELS[placement]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={banner.isActive} /> Activ pe magazin
                </label>
                <div className="flex gap-4">
                  <Button type="submit" variant="line">
                    Salvează
                  </Button>
                </div>
              </form>
              <form action={deleteBanner.bind(null, banner.id)} className="mt-3">
                <button className="text-xs text-mute underline">Șterge</button>
              </form>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="text-sm text-mute">Niciun banner. Creează unul în dreapta.</li>
          ) : null}
        </ul>
      </div>
      <form action={createBanner} className="grid gap-3" encType="multipart/form-data">
        <h2 className="font-serif text-2xl">Banner nou</h2>
        <Field label="Titlu">
          <Input name="title" required />
        </Field>
        <Field label="Subtitlu">
          <Input name="subtitle" />
        </Field>
        <Field label="Unde apare">
          <Select name="placement" defaultValue="homepage">
            {BANNER_PLACEMENTS.map((placement) => (
              <option key={placement} value={placement}>
                {PLACEMENT_LABELS[placement]}
              </option>
            ))}
          </Select>
        </Field>
        <AdminImageField />
        <Field label="Text buton">
          <Input name="ctaLabel" placeholder="Descoperă" />
        </Field>
        <Field label="Link">
          <Input name="ctaUrl" placeholder="/produse" />
        </Field>
        <Button type="submit">Creează și publică</Button>
      </form>
    </div>
  );
}

function revalidateBanners() {
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/categorii");
  revalidatePath("/categorie");
  revalidatePath("/cos");
  revalidatePath("/admin/bannere");
  revalidateStorefrontTag(STOREFRONT_CACHE.banners);
}

async function createBanner(formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const imagePath = await resolveFormImage(formData, { createdBy: actor.id, folder: "banners", current: null });
  const { error } = await sb().from("store_banners").insert({
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    placement: normalizeBannerPlacement(String(formData.get("placement") ?? "homepage")),
    image_path: imagePath,
    cta_label: String(formData.get("ctaLabel") ?? "").trim(),
    cta_url: String(formData.get("ctaUrl") ?? "").trim(),
    is_active: true,
  });
  if (error) throw new Error(error.message);
  revalidateBanners();
}

async function saveBanner(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const { data: existing } = await sb().from("store_banners").select("image_path").eq("id", id).maybeSingle();
  const imagePath = await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "banners",
    current: typeof existing?.image_path === "string" ? existing.image_path : null,
  });
  const { error } = await sb()
    .from("store_banners")
    .update({
      title: String(formData.get("title") ?? "").trim(),
      subtitle: String(formData.get("subtitle") ?? "").trim(),
      image_path: imagePath,
      cta_label: String(formData.get("ctaLabel") ?? "").trim(),
      cta_url: String(formData.get("ctaUrl") ?? "").trim(),
      placement: normalizeBannerPlacement(String(formData.get("placement") ?? "homepage")),
      is_active: formData.get("isActive") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBanners();
}

async function deleteBanner(id: string) {
  "use server";
  await requirePermission("content.write");
  const { error } = await sb().from("store_banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBanners();
}
