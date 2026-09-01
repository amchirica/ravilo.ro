import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { STOREFRONT_CACHE, revalidateStorefrontTag } from "@/lib/storefront-cache";
import { Field, Input, Textarea, Button, Select } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { AdminPreviewBar } from "@/components/admin/preview-bar";
import { translationMissing } from "@/lib/i18n";
import { resolveFormImage } from "@/services/storage";
import { HOMEPAGE_SECTION_TYPES, type HomepageSectionType } from "@/types/domain";
import { homepageSectionLabel } from "@/lib/homepage-section-labels";
import { ConfirmForm } from "@/components/admin/confirm-form";

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
  contentEn: Record<string, unknown> | null;
};

type Cta = { label?: string; href?: string };
type TrustItem = { title?: string; body?: string };
type ProblemItem = { title?: string; href?: string };

const SLOT_COUNT = 6;

export default async function HomepageAdmin() {
  await requirePermission("content.write");
  const [sections, bundles] = await Promise.all([
    listRows<Section>("homepage_sections", { order: "sort_order" }),
    listRows<{ id: string; name: string; slug: string; isActive: boolean }>("bundles", { order: "name" }),
  ]);
  return (
    <div>
      <AdminHeading k="homepage" />
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
        Aici editezi <strong className="font-medium text-ink">textul și secțiunile paginii de acasă</strong> (RO și EN).
        Nu este Setări magazin — CUI, TVA, logo și transport rămân în{" "}
        <Link href="/admin/setari" className="underline underline-offset-4">
          Admin → Setări magazin
        </Link>
        . Paginile legale (termeni, retur) se editează din{" "}
        <Link href="/admin/continut/pagini" className="underline underline-offset-4">
          Admin → Pagini
        </Link>
        . Frontend-ul afișează doar secțiunile activate.
      </p>
      <div className="mt-6">
        <AdminPreviewBar />
      </div>
      {sections.length === 0 ? (
        <form action={seedDefaultSections} className="mt-6 border border-line bg-card p-5">
          <p className="text-sm text-mute">
            Nu există încă o structură pentru pagina de acasă. Creează secțiunile de bază (hero, categorii, produse,
            best sellers) ca să le poți edita aici.
          </p>
          <Button type="submit" className="mt-4">
            Creează structura paginii de acasă
          </Button>
        </form>
      ) : null}
      <form action={addSection} className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Adaugă o secțiune">
          <Select name="type" defaultValue="EDITORIAL">
            {HOMEPAGE_SECTION_TYPES.filter((type) => type !== "NEWSLETTER").map((type) => (
              <option key={type} value={type}>
                {homepageSectionLabel(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="line">
          Adaugă
        </Button>
      </form>
      <ul className="mt-6 space-y-3">
        {sections.map((section) => {
          const content = (section.content ?? {}) as {
            headline?: string;
            body?: string;
            image?: string;
            href?: string;
            cta?: string;
            slug?: string;
            cta1?: Cta;
            cta2?: Cta;
            items?: Array<TrustItem & ProblemItem>;
          };
          const contentEn = (section.contentEn ?? {}) as {
            cta1?: Cta;
            cta2?: Cta;
            items?: Array<TrustItem & ProblemItem>;
          };
          const items = content.items ?? [];
          const itemsEn = contentEn.items ?? [];
          return (
            <li key={section.id} className="border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{homepageSectionLabel(section.type)}</p>
                  <p className="text-sm text-mute">
                    {section.title || "fără titlu"} · ordine {section.sortOrder} · RO ✓{" "}
                    <span className={translationMissing(section.titleEn) ? "text-warning" : "text-success"}>
                      {translationMissing(section.titleEn) ? "EN ⚠" : "EN ✓"}
                    </span>
                  </p>
                </div>
                <div className="flex gap-4">
                  <form action={toggleSection.bind(null, section.id, !section.isEnabled)}>
                    <button className="text-sm underline">{section.isEnabled ? "Dezactivează" : "Activează"}</button>
                  </form>
                  <ConfirmForm action={deleteSection.bind(null, section.id)} message="Ștergi secțiunea de pe homepage?">
                    <button className="text-sm text-danger underline">Șterge</button>
                  </ConfirmForm>
                </div>
              </div>
              <form action={saveSection.bind(null, section.id)} className="mt-4 grid gap-3 md:grid-cols-2" encType="multipart/form-data">
                <Field label="Titlu RO (apare pe site)">
                  <Input name="title" defaultValue={section.title ?? content.headline ?? ""} />
                </Field>
                <Field label="Title EN">
                  <Input name="titleEn" defaultValue={section.titleEn ?? ""} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Subtitlu / text RO">
                    <Textarea name="subtitle" defaultValue={section.subtitle ?? content.body ?? ""} rows={3} />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Subtitle / body EN">
                    <Textarea name="subtitleEn" defaultValue={section.subtitleEn ?? ""} rows={3} />
                  </Field>
                </div>
                <Field label="Ordine">
                  <Input name="sortOrder" defaultValue={String(section.sortOrder)} />
                </Field>
                {section.type === "HERO" ? (
                  <>
                    <Field label="CTA 1 — text RO">
                      <Input name="cta1Label" defaultValue={content.cta1?.label ?? ""} />
                    </Field>
                    <Field label="CTA 1 — text EN">
                      <Input name="cta1LabelEn" defaultValue={contentEn.cta1?.label ?? ""} />
                    </Field>
                    <Field label="CTA 1 — link">
                      <Input name="cta1Href" defaultValue={content.cta1?.href ?? "/produse"} />
                    </Field>
                    <Field label="CTA 2 — text RO">
                      <Input name="cta2Label" defaultValue={content.cta2?.label ?? ""} />
                    </Field>
                    <Field label="CTA 2 — text EN">
                      <Input name="cta2LabelEn" defaultValue={contentEn.cta2?.label ?? ""} />
                    </Field>
                    <Field label="CTA 2 — link">
                      <Input name="cta2Href" defaultValue={content.cta2?.href ?? "/noutati"} />
                    </Field>
                    <div className="md:col-span-2">
                      <AdminImageField label="Imagine hero" current={typeof content.image === "string" ? content.image : null} />
                    </div>
                  </>
                ) : null}
                {section.type === "CUSTOM_BANNER" ? (
                  <>
                    <Field label="Link">
                      <Input name="bannerHref" defaultValue={String(content.href ?? "")} />
                    </Field>
                    <Field label="Text buton">
                      <Input name="bannerCta" defaultValue={String(content.cta ?? "")} />
                    </Field>
                    <div className="md:col-span-2">
                      <AdminImageField label="Imagine banner" current={typeof content.image === "string" ? content.image : null} />
                    </div>
                  </>
                ) : null}
                {section.type === "BUNDLE" ? (
                  <Field label="Pachet afișat">
                    <Select name="bundleSlug" defaultValue={String(content.slug ?? bundles[0]?.slug ?? "")}>
                      <option value="">Primul pachet activ</option>
                      {bundles.map((bundle) => (
                        <option key={bundle.id} value={bundle.slug}>
                          {bundle.name}
                          {bundle.isActive ? "" : " (inactiv)"}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {section.type === "TRUST" || section.type === "WHY_RAVILO" ? (
                  <div className="md:col-span-2 grid gap-4">
                    <p className="text-sm text-mute">Până la {SLOT_COUNT} puncte. Lasă titlul gol ca să sari un rând.</p>
                    {Array.from({ length: SLOT_COUNT }, (_, index) => (
                      <div key={index} className="grid gap-3 border border-line p-3 md:grid-cols-2">
                        <Field label={`Punct ${index + 1} — titlu RO`}>
                          <Input name={`itemTitle_${index}`} defaultValue={items[index]?.title ?? ""} />
                        </Field>
                        <Field label="Title EN">
                          <Input name={`itemTitleEn_${index}`} defaultValue={itemsEn[index]?.title ?? ""} />
                        </Field>
                        <Field label="Text RO">
                          <Input name={`itemBody_${index}`} defaultValue={items[index]?.body ?? ""} />
                        </Field>
                        <Field label="Text EN">
                          <Input name={`itemBodyEn_${index}`} defaultValue={itemsEn[index]?.body ?? ""} />
                        </Field>
                      </div>
                    ))}
                  </div>
                ) : null}
                {section.type === "SHOP_BY_PROBLEM" ? (
                  <div className="md:col-span-2 grid gap-4">
                    <p className="text-sm text-mute">Linkuri către categorii sau colecții. Lasă titlul gol ca să sari un rând.</p>
                    {Array.from({ length: SLOT_COUNT }, (_, index) => (
                      <div key={index} className="grid gap-3 border border-line p-3 md:grid-cols-3">
                        <Field label={`Titlu RO ${index + 1}`}>
                          <Input name={`itemTitle_${index}`} defaultValue={items[index]?.title ?? ""} />
                        </Field>
                        <Field label="Title EN">
                          <Input name={`itemTitleEn_${index}`} defaultValue={itemsEn[index]?.title ?? ""} />
                        </Field>
                        <Field label="Link">
                          <Input name={`itemHref_${index}`} defaultValue={items[index]?.href ?? ""} />
                        </Field>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="md:col-span-2">
                  <Button type="submit" variant="line">
                    Salvează secțiunea
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

function revalidateHomepage() {
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/admin/continut/homepage");
  revalidateStorefrontTag(STOREFRONT_CACHE.homepage);
}

function defaultHomepageSections() {
  return [
    {
      type: "HERO" as const,
      title: "Lucruri bune pentru viața de zi cu zi.",
      title_en: "Good things for everyday life.",
      subtitle: "O selecție atentă pentru casă, familie, drum și timpul tău.",
      subtitle_en: "A careful selection for home, family, the road, and your time.",
      content: {
        headline: "Lucruri bune pentru viața de zi cu zi.",
        body: "O selecție atentă pentru casă, familie, drum și timpul tău.",
        cta1: { label: "Descoperă produsele", href: "/produse" },
        cta2: { label: "Vezi noutățile", href: "/noutati" },
      },
      content_en: {
        headline: "Good things for everyday life.",
        body: "A careful selection for home, family, the road, and your time.",
        cta1: { label: "Discover the products", href: "/produse" },
        cta2: { label: "See what’s new", href: "/noutati" },
      },
    },
    {
      type: "EDITORIAL" as const,
      title: "Mai puține lucruri. Alegeri mai bune.",
      title_en: "Fewer things. Better choices.",
      subtitle: "La RAVILO căutăm produse pe care chiar să le folosești. Lucruri simple, utile și bine alese pentru casă, familie, mașină și viața de zi cu zi.",
      subtitle_en: "At RAVILO we look for products you will actually use. Simple, useful things, chosen for home, family, the car, and everyday life.",
      content: {},
      content_en: {},
    },
    {
      type: "CATEGORY_GRID" as const,
      title: "Pentru lucrurile care fac parte din fiecare zi.",
      title_en: "For the things that belong in every day.",
      subtitle: "De acasă până la drumurile lungi, găsește lucruri practice pentru momentele care se repetă.",
      subtitle_en: "From home to longer journeys, practical things for the moments that keep coming back.",
      content: {},
      content_en: {},
    },
    {
      type: "FEATURED_PRODUCTS" as const,
      title: "Alese pentru fiecare zi",
      title_en: "Chosen for every day",
      subtitle: "Produse simple și utile, alese pentru felul în care trăim zi de zi.",
      subtitle_en: "Simple, useful products, chosen for the way we live.",
      content: {},
      content_en: {},
    },
    {
      type: "BESTSELLERS" as const,
      title: "Cele mai alese",
      title_en: "Most chosen",
      subtitle: "Lucruri care merită locul lor.",
      subtitle_en: "Things that earn their place.",
      content: {},
      content_en: {},
    },
    {
      type: "BUNDLE" as const,
      title: "Pachete",
      title_en: "Kits",
      subtitle: "Seturi cu preț mai bun decât suma produselor.",
      subtitle_en: "Kits priced below the sum of the parts.",
      content: {},
      content_en: {},
    },
    {
      type: "WHY_RAVILO" as const,
      title: "De ce RAVILO?",
      title_en: "Why RAVILO?",
      subtitle: "",
      subtitle_en: "",
      content: {
        items: [
          { title: "Ales cu grijă", body: "Nu adăugăm produse doar ca să avem mai multe. Fiecare trebuie să aibă un rost." },
          { title: "Util în viața reală", body: "Căutăm lucruri pe care chiar să le folosești, nu doar să le pui în coș." },
          { title: "Simplu de cumpărat", body: "Informații clare, plată sigură și o experiență fără complicații." },
          { title: "Suntem aici", body: "Dacă ai o întrebare, scrie-ne. Preferăm un răspuns clar, nu un zid de formulare." },
        ],
      },
      content_en: {
        items: [
          { title: "Chosen with care", body: "We don’t add products just to have more. Each one should have a reason." },
          { title: "Useful in real life", body: "We look for things you will actually use, not just add to a cart." },
          { title: "Simple to buy", body: "Clear information, secure payment, and an experience without extra noise." },
          { title: "We’re here", body: "If you have a question, write to us. We prefer a clear answer over a wall of forms." },
        ],
      },
    },
  ];
}

async function seedDefaultSections() {
  "use server";
  const actor = await requirePermission("content.write");
  const existing = await listRows<Section>("homepage_sections", { limit: 1 });
  if (existing.length) return;
  const rows = defaultHomepageSections().map((section, index) => ({
    ...section,
    sort_order: index,
    is_enabled: true,
  }));
  const { error } = await sb().from("homepage_sections").insert(rows);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "homepage.seed", entityType: "HomepageSection", entityId: "default" });
  revalidateHomepage();
}

async function addSection(formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const type = String(formData.get("type") ?? "") as HomepageSectionType;
  if (!HOMEPAGE_SECTION_TYPES.includes(type)) return;
  const { data: last } = await sb().from("homepage_sections").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const sortOrder = Number(last?.sort_order ?? -1) + 1;
  const title = homepageSectionLabel(type);
  const { data, error } = await sb()
    .from("homepage_sections")
    .insert({
      type,
      title,
      title_en: title,
      subtitle: "",
      subtitle_en: "",
      content: {},
      content_en: {},
      sort_order: sortOrder,
      is_enabled: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit({
    actorUserId: actor.id,
    action: "homepage.create",
    entityType: "HomepageSection",
    entityId: data?.id ?? type,
    after: { type },
  });
  revalidateHomepage();
}

async function deleteSection(id: string) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("homepage_sections").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "homepage.delete", entityType: "HomepageSection", entityId: id });
  revalidateHomepage();
}

async function toggleSection(id: string, isEnabled: boolean) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("homepage_sections").update({ is_enabled: isEnabled, updated_at: new Date().toISOString() }).eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "homepage.toggle", entityType: "HomepageSection", entityId: id, after: { isEnabled } });
  revalidateHomepage();
}

function collectItems(formData: FormData, kind: "trust" | "problem") {
  const ro: Array<TrustItem & ProblemItem> = [];
  const en: Array<TrustItem & ProblemItem> = [];
  for (let index = 0; index < SLOT_COUNT; index++) {
    const title = String(formData.get(`itemTitle_${index}`) ?? "").trim();
    if (!title) continue;
    const titleEn = String(formData.get(`itemTitleEn_${index}`) ?? "").trim() || title;
    if (kind === "problem") {
      const href = String(formData.get(`itemHref_${index}`) ?? "").trim() || "/produse";
      ro.push({ title, href });
      en.push({ title: titleEn, href });
    } else {
      const body = String(formData.get(`itemBody_${index}`) ?? "").trim();
      const bodyEn = String(formData.get(`itemBodyEn_${index}`) ?? "").trim() || body;
      ro.push({ title, body });
      en.push({ title: titleEn, body: bodyEn });
    }
  }
  return { ro, en };
}

async function saveSection(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  const title = String(formData.get("title") ?? "");
  const titleEn = String(formData.get("titleEn") ?? "");
  const subtitle = String(formData.get("subtitle") ?? "");
  const subtitleEn = String(formData.get("subtitleEn") ?? "");
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  const { data: existing } = await sb().from("homepage_sections").select("type, content, content_en").eq("id", id).maybeSingle();
  const previous = (existing?.content ?? {}) as Record<string, unknown>;
  const previousEn = (existing?.content_en ?? {}) as Record<string, unknown>;
  const type = String(existing?.type ?? "");
  const image = formData.has("imageKeep")
    ? await resolveFormImage(formData, {
        createdBy: actor.id,
        folder: "homepage",
        current: typeof previous.image === "string" ? previous.image : null,
      })
    : ((previous.image as string | undefined) ?? null);

  const content: Record<string, unknown> = {
    ...previous,
    headline: title,
    body: subtitle,
    image,
  };
  const contentEn: Record<string, unknown> = {
    ...previousEn,
    headline: titleEn || title,
    body: subtitleEn || subtitle,
    image,
  };

  if (type === "HERO") {
    const cta1Href = String(formData.get("cta1Href") ?? "") || (previous.cta1 as Cta | undefined)?.href || "/produse";
    const cta2Href = String(formData.get("cta2Href") ?? "") || (previous.cta2 as Cta | undefined)?.href || "/noutati";
    content.cta1 = {
      label: String(formData.get("cta1Label") ?? "") || (previous.cta1 as Cta | undefined)?.label,
      href: cta1Href,
    };
    content.cta2 = {
      label: String(formData.get("cta2Label") ?? "") || (previous.cta2 as Cta | undefined)?.label,
      href: cta2Href,
    };
    contentEn.cta1 = {
      label: String(formData.get("cta1LabelEn") ?? "") || (previousEn.cta1 as Cta | undefined)?.label || (content.cta1 as Cta).label,
      href: cta1Href,
    };
    contentEn.cta2 = {
      label: String(formData.get("cta2LabelEn") ?? "") || (previousEn.cta2 as Cta | undefined)?.label || (content.cta2 as Cta).label,
      href: cta2Href,
    };
  }

  if (type === "CUSTOM_BANNER") {
    content.href = String(formData.get("bannerHref") ?? "") || previous.href;
    content.cta = String(formData.get("bannerCta") ?? "") || previous.cta;
    contentEn.href = content.href;
    contentEn.cta = content.cta;
  }

  if (type === "BUNDLE") {
    const slug = String(formData.get("bundleSlug") ?? "");
    content.slug = slug;
    contentEn.slug = slug;
  }

  if (type === "TRUST" || type === "WHY_RAVILO") {
    const items = collectItems(formData, "trust");
    content.items = items.ro;
    contentEn.items = items.en;
  }
  if (type === "SHOP_BY_PROBLEM") {
    const items = collectItems(formData, "problem");
    content.items = items.ro;
    contentEn.items = items.en;
  }

  await sb()
    .from("homepage_sections")
    .update({
      title,
      title_en: titleEn || null,
      subtitle,
      subtitle_en: subtitleEn || null,
      sort_order: sortOrder,
      content,
      content_en: contentEn,
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
  revalidateHomepage();
}
