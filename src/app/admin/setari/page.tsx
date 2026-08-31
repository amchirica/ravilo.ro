import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getStoreSettings, saveStoreSettings } from "@/services/settings";
import { storeSettingsSchema } from "@/schemas/settings";
import { writeAudit } from "@/server/audit";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { parseRonToBani, formatRon } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveFormImage } from "@/services/storage";

export default async function SettingsPage() {
  const actor = await requirePermission("settings.write");
  void actor;
  const settings = await getStoreSettings();
  return (
    <div className="max-w-2xl">
      <AdminHeading k="storeSettings" />
      <form action={save} className="mt-8 grid gap-8" encType="multipart/form-data">
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Identitate</h2>
          <Field label="Nume magazin">
            <Input name="storeName" defaultValue={settings.storeName} />
          </Field>
          <Field label="Tagline">
            <Input name="tagline" defaultValue={settings.tagline} />
          </Field>
          <AdminImageField label="Logo" current={settings.logoPath} fileName="logo" keepName="logoKeep" removeName="logoRemove" />
          <AdminImageField label="Favicon" current={settings.faviconPath} fileName="favicon" keepName="faviconKeep" removeName="faviconRemove" />
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Companie</h2>
          <Field label="Denumire legală">
            <Input name="companyName" defaultValue={settings.companyName} />
          </Field>
          <Field label="CUI">
            <Input name="cui" defaultValue={settings.cui} />
          </Field>
          <Field label="Nr. Reg. Com.">
            <Input name="registrationNumber" defaultValue={settings.registrationNumber} />
          </Field>
          <Field label="Adresă">
            <Input name="address" defaultValue={settings.address} />
          </Field>
          <Field label="Țară">
            <Input name="country" defaultValue={settings.country} />
          </Field>
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Contact</h2>
          <Field label="Email public">
            <Input name="email" defaultValue={settings.email} />
          </Field>
          <Field label="Email suport">
            <Input name="supportEmail" defaultValue={settings.supportEmail} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" defaultValue={settings.phone} />
          </Field>
          <Field label="Program">
            <Input name="supportHours" defaultValue={settings.supportHours} />
          </Field>
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Comercial</h2>
          <Field label="Prag transport gratuit (RON)">
            <Input name="freeShippingThreshold" defaultValue={(settings.freeShippingThreshold / 100).toFixed(2)} />
          </Field>
          <p className="text-xs text-mute">Valoare curentă: {formatRon(settings.freeShippingThreshold)}. Folosită în announcement, coș, checkout, produs.</p>
          <Field label="TVA %">
            <Input name="vatPercent" defaultValue={String(settings.defaultTaxRateBps / 100)} />
          </Field>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="vatEnabled" defaultChecked={settings.vatEnabled} /> TVA activ
          </label>
          <Field label="Prefix comenzi">
            <Input name="orderNumberPrefix" defaultValue={settings.orderNumberPrefix} />
          </Field>
          <Field label="Prag stoc redus">
            <Input name="lowStockThreshold" type="number" defaultValue={String(settings.lowStockThreshold)} />
          </Field>
          <p className="text-sm text-mute">
            Best sellers și pachete se editează din Marketing, nu din setările firmei:{" "}
            <a href="/admin/best-sellers" className="underline underline-offset-4">
              Best Sellers
            </a>
            {" · "}
            <a href="/admin/pachete" className="underline underline-offset-4">
              Pachete
            </a>
            .
          </p>
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Announcement bar</h2>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="announcementEnabled" defaultChecked={settings.announcementEnabled} /> Activ
          </label>
          <Field label="Mesaj RO ({{free_shipping_threshold}})">
            <Textarea name="announcementTemplate" defaultValue={settings.announcementTemplate} />
          </Field>
          <Field label="Mesaj EN">
            <Textarea name="announcementTemplateEn" defaultValue={settings.announcementTemplateEn} />
          </Field>
          <Field label="Link">
            <Input name="announcementLink" defaultValue={settings.announcementLink} />
          </Field>
          <Field label="Stil">
            <select name="announcementStyle" defaultValue={settings.announcementStyle} className="w-full rounded-md border border-line px-3 py-2">
              <option value="band">Bandă</option>
              <option value="line">Linie</option>
            </select>
          </Field>
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">Social</h2>
          <Field label="Instagram">
            <Input name="instagram" defaultValue={settings.social.instagram} />
          </Field>
          <Field label="Facebook">
            <Input name="facebook" defaultValue={settings.social.facebook} />
          </Field>
          <Field label="TikTok">
            <Input name="tiktok" defaultValue={settings.social.tiktok} />
          </Field>
          <Field label="YouTube">
            <Input name="youtube" defaultValue={settings.social.youtube} />
          </Field>
        </section>
        <section className="grid gap-4">
          <h2 className="font-serif text-2xl">SEO</h2>
          <Field label="Site name">
            <Input name="siteName" defaultValue={settings.siteName} />
          </Field>
          <Field label="Meta title implicit">
            <Input name="defaultSeoTitle" defaultValue={settings.defaultSeoTitle} />
          </Field>
          <Field label="Meta description implicit">
            <Textarea name="defaultSeoDescription" defaultValue={settings.defaultSeoDescription} />
          </Field>
          <AdminImageField label="Imagine Open Graph" current={settings.defaultOgImage} fileName="ogImage" keepName="ogKeep" removeName="ogRemove" />
        </section>
        <Button type="submit">Salvează</Button>
      </form>
    </div>
  );
}

async function save(formData: FormData) {
  "use server";
  const actor = await requirePermission("settings.write");
  const current = await getStoreSettings();
  const vatPercent = Number(String(formData.get("vatPercent") ?? current.defaultTaxRateBps / 100));
  const logoPath = (await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "brand",
    current: current.logoPath,
    fileField: "logo",
    keepField: "logoKeep",
    removeField: "logoRemove",
  })) || "/ravilo.png";
  const faviconPath = (await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "brand",
    current: current.faviconPath,
    fileField: "favicon",
    keepField: "faviconKeep",
    removeField: "faviconRemove",
  })) || "/favicon.ico";
  const defaultOgImage = (await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "brand",
    current: current.defaultOgImage,
    fileField: "ogImage",
    keepField: "ogKeep",
    removeField: "ogRemove",
  })) || "/ravilo.png";
  const next = storeSettingsSchema.parse({
    ...current,
    storeName: String(formData.get("storeName") ?? current.storeName),
    tagline: String(formData.get("tagline") ?? current.tagline),
    logoPath,
    faviconPath,
    companyName: String(formData.get("companyName") ?? ""),
    cui: String(formData.get("cui") ?? ""),
    registrationNumber: String(formData.get("registrationNumber") ?? ""),
    address: String(formData.get("address") ?? ""),
    country: String(formData.get("country") ?? current.country),
    email: String(formData.get("email") ?? current.email),
    supportEmail: String(formData.get("supportEmail") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    supportHours: String(formData.get("supportHours") ?? current.supportHours),
    freeShippingThreshold: parseRonToBani(String(formData.get("freeShippingThreshold") ?? "0")),
    vatEnabled: formData.get("vatEnabled") === "on",
    defaultTaxRateBps: Math.round((Number.isFinite(vatPercent) ? vatPercent : 21) * 100),
    orderNumberPrefix: String(formData.get("orderNumberPrefix") ?? current.orderNumberPrefix),
    lowStockThreshold: Number(formData.get("lowStockThreshold") ?? current.lowStockThreshold) || 3,
    bestSellerMode: current.bestSellerMode,
    announcementEnabled: formData.get("announcementEnabled") === "on",
    announcementTemplate: String(formData.get("announcementTemplate") ?? current.announcementTemplate),
    announcementTemplateEn: String(formData.get("announcementTemplateEn") ?? current.announcementTemplateEn),
    announcementLink: String(formData.get("announcementLink") ?? current.announcementLink),
    announcementStyle: String(formData.get("announcementStyle") ?? current.announcementStyle) === "line" ? "line" : "band",
    siteName: String(formData.get("siteName") ?? current.siteName),
    defaultSeoTitle: String(formData.get("defaultSeoTitle") ?? current.defaultSeoTitle),
    defaultSeoDescription: String(formData.get("defaultSeoDescription") ?? current.defaultSeoDescription),
    defaultOgImage,
    social: {
      instagram: String(formData.get("instagram") ?? ""),
      facebook: String(formData.get("facebook") ?? ""),
      tiktok: String(formData.get("tiktok") ?? ""),
      youtube: String(formData.get("youtube") ?? ""),
    },
  });
  await saveStoreSettings(next, actor.id);
  await writeAudit({ actorUserId: actor.id, action: "settings.update", entityType: "StoreSettings", entityId: "default", after: { freeShippingThreshold: next.freeShippingThreshold } });
  revalidatePath("/", "layout");
  revalidatePath("/cos");
  revalidatePath("/checkout");
  revalidatePath("/produse");
  redirect("/admin/setari");
}
