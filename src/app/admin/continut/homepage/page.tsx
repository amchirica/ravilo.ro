import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Button } from "@/components/ui/primitives";
import { AdminPreviewBar } from "@/components/admin/preview-bar";
import { translationMissing } from "@/lib/i18n";

type Section = {
  id: string;
  type: string;
  title: string | null;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  sortOrder: number;
  isEnabled: boolean;
  content: Record<string, unknown> | null;
};

export default async function HomepageAdmin() {
  await requirePermission("content.write");
  const sections = await listRows<Section>("homepage_sections", { order: "sort_order" });
  return (
    <div>
      <AdminHeading k="homepage" />
      <p className="mt-2 text-sm text-mute">Activează, dezactivează și editează RO/EN. Frontend-ul afișează doar ce e enabled.</p>
      <div className="mt-6">
        <AdminPreviewBar />
      </div>
      <ul className="mt-4 space-y-3">
        {sections.map((section) => {
          const content = (section.content ?? {}) as {
            headline?: string;
            body?: string;
            image?: string;
            cta1?: { label?: string; href?: string };
            cta2?: { label?: string; href?: string };
          };
          return (
          <li key={section.id} className="border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{section.type}</p>
                <p className="text-sm text-mute">
                  {section.title || "fără titlu"} · ordine {section.sortOrder} · RO ✓{" "}
                  <span className={translationMissing(section.titleEn) ? "text-warning" : "text-success"}>
                    {translationMissing(section.titleEn) ? "EN ⚠" : "EN ✓"}
                  </span>
                </p>
              </div>
              <form action={toggleSection.bind(null, section.id, !section.isEnabled)}>
                <button className="text-sm underline">{section.isEnabled ? "Dezactivează" : "Activează"}</button>
              </form>
            </div>
            <form action={saveSection.bind(null, section.id)} className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Titlu RO">
                <Input name="title" defaultValue={section.title ?? ""} />
              </Field>
              <Field label="Title EN">
                <Input name="titleEn" defaultValue={section.titleEn ?? ""} />
              </Field>
              <Field label="Subtitlu RO">
                <Input name="subtitle" defaultValue={section.subtitle ?? ""} />
              </Field>
              <Field label="Subtitle EN">
                <Input name="subtitleEn" defaultValue={section.subtitleEn ?? ""} />
              </Field>
              <Field label="Ordine">
                <Input name="sortOrder" defaultValue={String(section.sortOrder)} />
              </Field>
              {section.type === "HERO" ? (
                <>
                  <Field label="CTA 1 label">
                    <Input name="cta1Label" defaultValue={content.cta1?.label ?? ""} />
                  </Field>
                  <Field label="CTA 1 href">
                    <Input name="cta1Href" defaultValue={content.cta1?.href ?? "/produse"} />
                  </Field>
                  <Field label="CTA 2 label">
                    <Input name="cta2Label" defaultValue={content.cta2?.label ?? ""} />
                  </Field>
                  <Field label="CTA 2 href">
                    <Input name="cta2Href" defaultValue={content.cta2?.href ?? "/categorii"} />
                  </Field>
                  <Field label="Imagine hero (URL)">
                    <Input name="image" defaultValue={content.image ?? ""} />
                  </Field>
                </>
              ) : null}
              <div className="md:col-span-2">
                <Button type="submit" variant="line">
                  Salvează
                </Button>
              </div>
            </form>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

async function toggleSection(id: string, isEnabled: boolean) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("homepage_sections").update({ is_enabled: isEnabled, updated_at: new Date().toISOString() }).eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "homepage.toggle", entityType: "HomepageSection", entityId: id, after: { isEnabled } });
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/admin/continut/homepage");
}

async function saveSection(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const title = String(formData.get("title") ?? "");
  const titleEn = String(formData.get("titleEn") ?? "");
  const subtitle = String(formData.get("subtitle") ?? "");
  const subtitleEn = String(formData.get("subtitleEn") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const { data: existing } = await sb().from("homepage_sections").select("content").eq("id", id).maybeSingle();
  const previous = (existing?.content ?? {}) as Record<string, unknown>;
  const content = {
    ...previous,
    cta1: {
      label: String(formData.get("cta1Label") ?? "") || (previous.cta1 as { label?: string } | undefined)?.label,
      href: String(formData.get("cta1Href") ?? "") || (previous.cta1 as { href?: string } | undefined)?.href,
    },
    cta2: {
      label: String(formData.get("cta2Label") ?? "") || (previous.cta2 as { label?: string } | undefined)?.label,
      href: String(formData.get("cta2Href") ?? "") || (previous.cta2 as { href?: string } | undefined)?.href,
    },
    image: String(formData.get("image") ?? "") || (previous.image as string | undefined),
  };
  await sb()
    .from("homepage_sections")
    .update({
      title,
      title_en: titleEn || null,
      subtitle,
      subtitle_en: subtitleEn || null,
      sort_order: sortOrder,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await writeAudit({
    actorUserId: actor.id,
    action: "homepage.update",
    entityType: "HomepageSection",
    entityId: id,
    after: { title, titleEn },
  });
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/admin/continut/homepage");
}
