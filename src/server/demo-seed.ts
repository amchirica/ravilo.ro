import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultStoreSettings } from "../schemas/settings";
import { assertCanSeedDemo } from "../lib/dev-seed-guard";
import { DEMO_PRODUCTS, LEGACY_DEMO_SLUGS } from "./demo-products";

type Db = SupabaseClient;

async function upsertBySlug(db: Db, table: string, row: Record<string, unknown>, conflict = "slug") {
  const { error } = await db.from(table).upsert(row, { onConflict: conflict });
  if (error) throw new Error(`${table} upsert failed: ${error.message}`);
}

export async function seedDemoStore(db: Db) {
  assertCanSeedDemo();
  const now = new Date().toISOString();

  await db.from("order_sequence").upsert({ id: 1, last_number: 0 }, { onConflict: "id", ignoreDuplicates: true });
  await db.from("store_settings").upsert({ id: "default", data: defaultStoreSettings() }, { onConflict: "id", ignoreDuplicates: true });
  await db.from("inventory_locations").upsert(
    { name: "Depozit principal", code: "MAIN", is_default: true, is_active: true },
    { onConflict: "code", ignoreDuplicates: true },
  );
  const { data: location } = await db.from("inventory_locations").select("id").eq("code", "MAIN").maybeSingle();
  if (!location) throw new Error("Missing MAIN location");

  const categories = [
    {
      slug: "auto",
      name: "AUTO",
      name_en: "AUTO",
      description: "Accesorii care fac fiecare drum mai simplu.",
      description_en: "Accessories that make every drive easier.",
      seo_title: "AUTO — accesorii auto | RAVILO",
      seo_title_en: "AUTO — car accessories | RAVILO",
      seo_description: "Suporturi, încărcare, organizare și curățenie pentru mașină.",
      seo_description_en: "Mounts, charging, organization and cleaning for the car.",
      hero_image: "/demo/products/auto.svg",
      sort_order: 1,
    },
    {
      slug: "tech",
      name: "TECH",
      name_en: "TECH",
      description: "Încărcare, cabluri și obiecte de birou care rămân în uz.",
      description_en: "Charging, cables and desk objects that stay in use.",
      seo_title: "TECH — încărcare și birou | RAVILO",
      seo_title_en: "TECH — charging and desk | RAVILO",
      seo_description: "GaN, cabluri USB-C, dock-uri și organizare de birou.",
      seo_description_en: "GaN, USB-C cables, docks and desk organization.",
      hero_image: "/demo/products/tech.svg",
      sort_order: 2,
    },
    {
      slug: "home",
      name: "HOME",
      name_en: "HOME",
      description: "Casă mai ordonată, fără obiecte de umplutură.",
      description_en: "A tidier home, without filler objects.",
      seo_title: "HOME — casă practică | RAVILO",
      seo_title_en: "HOME — practical home | RAVILO",
      seo_description: "Organizare, smart home, birou și bucătărie practică.",
      seo_description_en: "Organization, smart home, desk and practical kitchen.",
      hero_image: "/demo/products/home.svg",
      sort_order: 3,
    },
    {
      slug: "travel",
      name: "TRAVEL",
      name_en: "TRAVEL",
      description: "Bagaj mai liniștit. Lucruri care se găsesc din prima.",
      description_en: "Quieter luggage. Things you find on the first try.",
      seo_title: "TRAVEL — esențiale de drum | RAVILO",
      seo_title_en: "TRAVEL — travel essentials | RAVILO",
      seo_description: "Organizatoare, adaptoare și accesorii de cabină.",
      seo_description_en: "Organizers, adapters and cabin accessories.",
      hero_image: "/demo/products/travel.svg",
      sort_order: 4,
    },
    {
      slug: "edc",
      name: "EDC",
      name_en: "EDC",
      description: "Lucruri pe care le porți în fiecare zi.",
      description_en: "Things you carry every day.",
      seo_title: "EDC — fiecare zi | RAVILO",
      seo_title_en: "EDC — every day | RAVILO",
      seo_description: "Portofele, pouch-uri, carabiniere și organizare de buzunar.",
      seo_description_en: "Wallets, pouches, carabiners and pocket organization.",
      hero_image: "/demo/products/edc.svg",
      sort_order: 5,
    },
  ];

  for (const category of categories) {
    await upsertBySlug(db, "categories", { ...category, is_active: true, is_demo: true, updated_at: now });
  }

  const { data: parents } = await db.from("categories").select("id, slug");
  const bySlug = Object.fromEntries((parents ?? []).map((row) => [row.slug, row.id as string]));

  const children: { parent: string; slug: string; name: string; name_en: string; sort_order: number }[] = [
    { parent: "auto", slug: "auto-suporturi-telefon", name: "Suporturi telefon", name_en: "Phone mounts", sort_order: 1 },
    { parent: "auto", slug: "auto-incarcare", name: "Încărcare auto", name_en: "Car charging", sort_order: 2 },
    { parent: "auto", slug: "auto-organizare", name: "Organizare", name_en: "Organization", sort_order: 3 },
    { parent: "auto", slug: "auto-curatenie", name: "Curățenie", name_en: "Cleaning", sort_order: 4 },
    { parent: "auto", slug: "auto-accesorii-interior", name: "Accesorii interior", name_en: "Interior accessories", sort_order: 5 },
    { parent: "tech", slug: "tech-incarcatoare", name: "Încărcătoare", name_en: "Chargers", sort_order: 1 },
    { parent: "tech", slug: "tech-cabluri", name: "Cabluri", name_en: "Cables", sort_order: 2 },
    { parent: "tech", slug: "tech-adaptoare", name: "Adaptoare", name_en: "Adapters", sort_order: 3 },
    { parent: "tech", slug: "tech-desk-setup", name: "Desk setup", name_en: "Desk setup", sort_order: 4 },
    { parent: "tech", slug: "tech-accesorii-telefon", name: "Accesorii telefon", name_en: "Phone accessories", sort_order: 5 },
    { parent: "home", slug: "home-organizare", name: "Organizare", name_en: "Organization", sort_order: 1 },
    { parent: "home", slug: "home-smart", name: "Smart home", name_en: "Smart home", sort_order: 2 },
    { parent: "home", slug: "home-birou", name: "Birou", name_en: "Desk", sort_order: 3 },
    { parent: "home", slug: "home-bucatarie", name: "Bucătărie practică", name_en: "Practical kitchen", sort_order: 4 },
    { parent: "home", slug: "home-iluminare", name: "Iluminare", name_en: "Lighting", sort_order: 5 },
    { parent: "travel", slug: "travel-organizatoare", name: "Organizatoare", name_en: "Organizers", sort_order: 1 },
    { parent: "travel", slug: "travel-adaptoare", name: "Adaptoare", name_en: "Adapters", sort_order: 2 },
    { parent: "travel", slug: "travel-bagaje", name: "Bagaje", name_en: "Luggage", sort_order: 3 },
    { parent: "travel", slug: "travel-avion", name: "Accesorii avion", name_en: "Cabin accessories", sort_order: 4 },
    { parent: "travel", slug: "travel-tech", name: "Tech travel", name_en: "Tech travel", sort_order: 5 },
    { parent: "edc", slug: "edc-portofele", name: "Portofele", name_en: "Wallets", sort_order: 1 },
    { parent: "edc", slug: "edc-organizare", name: "Organizare", name_en: "Organization", sort_order: 2 },
    { parent: "edc", slug: "edc-carabiniere", name: "Carabiniere", name_en: "Carabiners", sort_order: 3 },
    { parent: "edc", slug: "edc-pouch-uri", name: "Pouch-uri", name_en: "Pouches", sort_order: 4 },
    { parent: "edc", slug: "edc-accesorii", name: "Accesorii de zi cu zi", name_en: "Everyday accessories", sort_order: 5 },
  ];

  for (const child of children) {
    await upsertBySlug(db, "categories", {
      parent_id: bySlug[child.parent],
      slug: child.slug,
      name: child.name,
      name_en: child.name_en,
      description: child.name,
      description_en: child.name_en,
      seo_title: `${child.name} — RAVILO`,
      seo_title_en: `${child.name_en} — RAVILO`,
      seo_description: child.name,
      seo_description_en: child.name_en,
      sort_order: child.sort_order,
      is_active: true,
      is_demo: true,
      updated_at: now,
    });
  }

  const { data: allCats } = await db.from("categories").select("id, slug");
  const catId = Object.fromEntries((allCats ?? []).map((row) => [row.slug, row.id as string]));

  const { data: existingShipping } = await db.from("shipping_methods").select("id").eq("provider", "manual").maybeSingle();
  if (!existingShipping) {
    await db.from("shipping_methods").insert({
      name: "Curier standard",
      provider: "manual",
      price: 1900,
      free_above: 25000,
      estimated_min_days: 1,
      estimated_max_days: 3,
      is_active: true,
    });
  }

  await db.from("discounts").upsert(
    {
      code: "DEMO10",
      name: "Demo 10%",
      type: "PERCENTAGE",
      value: 10,
      minimum_order_value: 0,
      usage_per_customer: 5,
      is_active: true,
    },
    { onConflict: "code" },
  );

  if (LEGACY_DEMO_SLUGS.length) {
    await db.from("products").update({ is_demo: true, is_active: false, status: "ARCHIVED", updated_at: now }).in("slug", LEGACY_DEMO_SLUGS);
  }

  for (const item of DEMO_PRODUCTS) {
    await upsertBySlug(db, "products", {
      name: item.nameRo,
      name_en: item.nameEn,
      slug: item.slug,
      sku: item.sku,
      short_description: item.shortRo,
      short_description_en: item.shortEn,
      description: item.descRo,
      description_en: item.descEn,
      status: "ACTIVE",
      brand: "RAVILO",
      category_id: catId[item.subcategory] ?? catId[item.category],
      cost_price: item.cost,
      sale_price: item.price,
      compare_at_price: item.compareAt ?? null,
      currency: "RON",
      tax_rate_bps: 2100,
      weight_grams: item.weightGrams,
      length_mm: item.lengthMm,
      width_mm: item.widthMm,
      height_mm: item.heightMm,
      low_stock_threshold: 5,
      is_featured: Boolean(item.featured),
      is_ravilo_pick: Boolean(item.pick),
      is_new: Boolean(item.isNew),
      is_demo_bestseller: Boolean(item.demoBestseller),
      is_active: true,
      is_demo: true,
      tags: item.tags,
      published_at: now,
      why_we_chose: item.whyRo,
      why_we_chose_en: item.whyEn,
      how_it_works: item.howRo,
      how_it_works_en: item.howEn,
      specifications: item.specsRo,
      specifications_en: item.specsEn,
      compatibility: item.compatibilityRo,
      compatibility_en: item.compatibilityEn,
      in_the_box: item.boxRo,
      in_the_box_en: item.boxEn,
      seo_title: item.seoTitleRo,
      seo_title_en: item.seoTitleEn,
      seo_description: item.seoDescRo,
      seo_description_en: item.seoDescEn,
      updated_at: now,
    });
    const { data: product } = await db.from("products").select("id").eq("slug", item.slug).maybeSingle();
    if (!product) continue;
    await db.from("product_variants").upsert(
      { product_id: product.id, sku: `${item.sku}-DEF`, name: "Standard", is_active: true, weight_grams: item.weightGrams },
      { onConflict: "sku" },
    );
    const { data: variant } = await db.from("product_variants").select("id").eq("sku", `${item.sku}-DEF`).maybeSingle();
    if (variant) {
      const { data: level } = await db
        .from("inventory_levels")
        .select("id")
        .eq("variant_id", variant.id)
        .eq("location_id", location.id)
        .maybeSingle();
      if (level) {
        await db.from("inventory_levels").update({ quantity: item.stock, reserved_quantity: 0 }).eq("id", level.id);
      } else {
        await db.from("inventory_levels").insert({
          variant_id: variant.id,
          location_id: location.id,
          quantity: item.stock,
          reserved_quantity: 0,
        });
      }
    }
    await db.from("product_media").delete().eq("product_id", product.id);
    await db.from("product_media").insert({
      product_id: product.id,
      type: "IMAGE",
      storage_path: `/demo/products/${item.slug}.svg`,
      alt: item.nameRo,
      alt_en: item.nameEn,
      is_primary: true,
      sort_order: 0,
    });
  }

  const collections = [
    {
      slug: "ravilo-picks",
      name: "RAVILO Picks",
      name_en: "RAVILO Picks",
      description: "Lucrurile pe care le-am alege noi.",
      description_en: "The things we would choose ourselves.",
    },
    {
      slug: "new-arrivals",
      name: "New Arrivals",
      name_en: "New Arrivals",
      description: "Noutăți în catalog.",
      description_en: "New in the catalog.",
    },
    {
      slug: "drive-essentials",
      name: "Drive Essentials",
      name_en: "Drive Essentials",
      description: "Esențiale pentru mașină.",
      description_en: "Car essentials.",
    },
    {
      slug: "desk-essentials",
      name: "Desk Essentials",
      name_en: "Desk Essentials",
      description: "Birou fără cabluri vizibile.",
      description_en: "A desk without visible cables.",
    },
    {
      slug: "travel-essentials",
      name: "Travel Essentials",
      name_en: "Travel Essentials",
      description: "Pentru drum, fără haos în bagaj.",
      description_en: "For the road, without luggage chaos.",
    },
    {
      slug: "smart-home-starter",
      name: "Smart Home Starter",
      name_en: "Smart Home Starter",
      description: "Un început simplu de casă inteligentă.",
      description_en: "A simple start to a smarter home.",
    },
    {
      slug: "edc-essentials",
      name: "EDC Essentials",
      name_en: "EDC Essentials",
      description: "Lucruri de fiecare zi.",
      description_en: "Everyday carry.",
    },
  ];
  for (const collection of collections) {
    await upsertBySlug(db, "collections", {
      ...collection,
      seo_title: `${collection.name} — RAVILO`,
      seo_title_en: `${collection.name_en} — RAVILO`,
      seo_description: collection.description,
      seo_description_en: collection.description_en,
      type: "manual",
      is_active: true,
      is_demo: true,
      updated_at: now,
    });
  }

  const { data: productRows } = await db.from("products").select("id, slug, is_ravilo_pick, is_new, category_id");
  const productBySlug = Object.fromEntries((productRows ?? []).map((row) => [row.slug, row.id as string]));
  const { data: collectionRows } = await db.from("collections").select("id, slug");
  const collectionBySlug = Object.fromEntries((collectionRows ?? []).map((row) => [row.slug, row.id as string]));

  const collectionMap: Record<string, string[]> = {
    "ravilo-picks": DEMO_PRODUCTS.filter((item) => item.pick).map((item) => item.slug),
    "new-arrivals": DEMO_PRODUCTS.filter((item) => item.isNew).map((item) => item.slug),
    "drive-essentials": ["ravilo-drive-mount", "ravilo-charge-65", "ravilo-flexcable-100w", "ravilo-auto-organizer", "ravilo-vent-mount"],
    "desk-essentials": ["ravilo-deskdock", "ravilo-gan-65", "ravilo-desk-cable-rail", "ravilo-desk-tray", "ravilo-magstand"],
    "travel-essentials": ["ravilo-travel-grid", "ravilo-travel-adapter-pro", "ravilo-compact-tech-pouch", "ravilo-flexcable-100w", "ravilo-cable-case"],
    "smart-home-starter": ["ravilo-smart-plug-mini", "ravilo-home-sensor"],
    "edc-essentials": ["ravilo-edc-wallet", "ravilo-key-clip", "ravilo-everyday-pouch", "ravilo-carabiner-duo"],
  };

  for (const [slug, productSlugs] of Object.entries(collectionMap)) {
    const collectionId = collectionBySlug[slug];
    if (!collectionId) continue;
    await db.from("collection_products").delete().eq("collection_id", collectionId);
    for (const [index, productSlug] of productSlugs.entries()) {
      const productId = productBySlug[productSlug];
      if (!productId) continue;
      await db.from("collection_products").insert({ collection_id: collectionId, product_id: productId, sort_order: index });
    }
  }

  const { data: variantRows } = await db.from("product_variants").select("id, sku");
  const variantBySku = Object.fromEntries((variantRows ?? []).map((row) => [row.sku, row.id as string]));

  const bundles = [
    {
      slug: "drive-essentials-kit",
      name: "Drive Essentials Kit",
      name_en: "Drive Essentials Kit",
      description: "RAVILO Drive Mount + Charge 65 + FlexCable.",
      description_en: "RAVILO Drive Mount + Charge 65 + FlexCable.",
      skus: ["RAV-AUTO-001-DEF", "RAV-AUTO-003-DEF", "RAV-TECH-001-DEF"],
      price: 29900,
      compare: 35700,
    },
    {
      slug: "desk-reset-kit",
      name: "Desk Reset Kit",
      name_en: "Desk Reset Kit",
      description: "RAVILO DeskDock + GaN 65 + Desk Cable Rail.",
      description_en: "RAVILO DeskDock + GaN 65 + Desk Cable Rail.",
      skus: ["RAV-TECH-004-DEF", "RAV-TECH-003-DEF", "RAV-TECH-008-DEF"],
      price: 44900,
      compare: 50700,
    },
    {
      slug: "travel-tech-kit",
      name: "Travel Tech Kit",
      name_en: "Travel Tech Kit",
      description: "RAVILO Travel Adapter Pro + Cable Case + FlexCable.",
      description_en: "RAVILO Travel Adapter Pro + Cable Case + FlexCable.",
      skus: ["RAV-TRV-002-DEF", "RAV-TECH-006-DEF", "RAV-TECH-001-DEF"],
      price: 27900,
      compare: 32700,
    },
    {
      slug: "smart-home-starter-kit",
      name: "Smart Home Starter Kit",
      name_en: "Smart Home Starter Kit",
      description: "RAVILO Smart Plug Mini + Home Sensor.",
      description_en: "RAVILO Smart Plug Mini + Home Sensor.",
      skus: ["RAV-HOME-001-DEF", "RAV-HOME-002-DEF"],
      price: 14900,
      compare: 17800,
    },
  ];

  for (const bundle of bundles) {
    await upsertBySlug(db, "bundles", {
      name: bundle.name,
      name_en: bundle.name_en,
      slug: bundle.slug,
      description: bundle.description,
      description_en: bundle.description_en,
      price: bundle.price,
      compare_at_price: bundle.compare,
      image_path: `/demo/products/${bundle.slug}.svg`,
      is_active: true,
      is_demo: true,
      seo_title: `${bundle.name} — RAVILO`,
      seo_title_en: `${bundle.name_en} — RAVILO`,
      seo_description: bundle.description,
      seo_description_en: bundle.description_en,
      updated_at: now,
    });
    const { data: saved } = await db.from("bundles").select("id").eq("slug", bundle.slug).maybeSingle();
    if (!saved) continue;
    await db.from("bundle_items").delete().eq("bundle_id", saved.id);
    for (const sku of bundle.skus) {
      const variantId = variantBySku[sku];
      if (!variantId) continue;
      await db.from("bundle_items").insert({ bundle_id: saved.id, variant_id: variantId, quantity: 1 });
    }
  }

  await db.from("homepage_sections").update({ is_demo: true }).not("id", "is", null);
  await db.from("homepage_sections").delete().eq("is_demo", true);
  const sections = homepageSections();
  for (const [index, section] of sections.entries()) {
    await db.from("homepage_sections").insert({ ...section, sort_order: index, is_enabled: true, is_demo: true });
  }

  for (const locationName of ["HEADER", "MOBILE", "FOOTER"] as const) {
    await db.from("navigation_menus").upsert({ location: locationName }, { onConflict: "location", ignoreDuplicates: true });
    const { data: menu } = await db.from("navigation_menus").select("id").eq("location", locationName).maybeSingle();
    if (!menu) continue;
    await db.from("navigation_items").delete().eq("menu_id", menu.id);
    const items =
      locationName === "FOOTER"
        ? [
            { label: "Despre", label_en: "About", url: "/despre" },
            { label: "Livrare", label_en: "Shipping", url: "/livrare" },
            { label: "Retur", label_en: "Returns", url: "/retur" },
            { label: "Contact", label_en: "Contact", url: "/contact" },
            { label: "FAQ", label_en: "FAQ", url: "/faq" },
            { label: "Termeni", label_en: "Terms", url: "/termeni" },
            { label: "Confidențialitate", label_en: "Privacy", url: "/confidentialitate" },
          ]
        : [
            { label: "Noutăți", label_en: "New in", url: "/noutati" },
            { label: "Produse", label_en: "Products", url: "/produse" },
            { label: "Colecții", label_en: "Collections", url: "/colectii" },
            { label: "Ghiduri", label_en: "Guides", url: "/ghiduri" },
            { label: "Jurnal", label_en: "Journal", url: "/blog" },
          ];
    for (const [index, item] of items.entries()) {
      await db.from("navigation_items").insert({ menu_id: menu.id, ...item, sort_order: index, is_demo: true });
    }
  }

  await db.from("announcements").delete().eq("is_demo", true);
  const { data: existingAnnouncement } = await db.from("announcements").select("id").limit(1).maybeSingle();
  if (!existingAnnouncement) {
    await db.from("announcements").insert({
      text: "Transport gratuit peste 250 lei — prag configurat din admin.",
      text_en: "Free shipping over RON 250 — threshold set in admin.",
      link: "/livrare",
      is_enabled: true,
      is_demo: true,
    });
  }

  const pages = [
    {
      slug: "despre",
      title: "Despre RAVILO",
      title_en: "About RAVILO",
      content: "<p>Lucruri bune. Alese simplu. Datele legale se completează din Admin → Setări.</p>",
      content_en: "<p>Good things. Simply chosen. Legal company details are completed in Admin → Settings.</p>",
    },
    {
      slug: "contact",
      title: "Contact",
      title_en: "Contact",
      content: "<p>Scrie-ne prin formularul de contact. Emailul intern nu este expus public.</p>",
      content_en: "<p>Write through the contact form. Internal email is not exposed publicly.</p>",
    },
    {
      slug: "livrare",
      title: "Livrare",
      title_en: "Shipping",
      content: "<p>Livrăm în România prin curier. Pragul de transport gratuit se citește din setările magazinului.</p>",
      content_en: "<p>We ship in Romania by courier. The free-shipping threshold is read from store settings.</p>",
    },
    {
      slug: "retur",
      title: "Retur",
      title_en: "Returns",
      content: "<p>Politica de retur se editează din CMS. Completați textul legal înainte de lansare.</p>",
      content_en: "<p>The return policy is edited in CMS. Complete the legal text before launch.</p>",
    },
    {
      slug: "garantie",
      title: "Garanție",
      title_en: "Warranty",
      content: "<p>Garanția legală se aplică conform legislației din România. Completați detaliile din admin.</p>",
      content_en: "<p>The legal warranty applies under Romanian law. Complete the details in admin.</p>",
    },
    {
      slug: "faq",
      title: "Întrebări frecvente",
      title_en: "FAQ",
      content: "<p>Răspunsurile se gestionează din Admin → FAQ.</p>",
      content_en: "<p>Answers are managed from Admin → FAQ.</p>",
    },
    {
      slug: "termeni",
      title: "Termeni și condiții",
      title_en: "Terms",
      content: "<p>Placeholder. Completați termenii reali înainte de a procesa comenzi live.</p>",
      content_en: "<p>Placeholder. Complete the real terms before processing live orders.</p>",
    },
    {
      slug: "confidentialitate",
      title: "Confidențialitate",
      title_en: "Privacy",
      content: "<p>Placeholder GDPR. Completați politica reală și datele operatorului.</p>",
      content_en: "<p>GDPR placeholder. Complete the real policy and controller details.</p>",
    },
    {
      slug: "cookies",
      title: "Cookies",
      title_en: "Cookies",
      content: "<p>Folosim cookie-uri necesare. Analytics și marketing doar după consimțământ.</p>",
      content_en: "<p>We use necessary cookies. Analytics and marketing only after consent.</p>",
    },
  ];
  for (const page of pages) {
    await upsertBySlug(db, "pages", {
      ...page,
      status: "PUBLISHED",
      published_at: now,
      seo_title: `${page.title} — RAVILO`,
      seo_title_en: `${page.title_en} — RAVILO`,
      is_demo: true,
      updated_at: now,
    });
  }

  await db.from("faq_items").update({ is_demo: true }).not("id", "is", null);
  await db.from("faq_items").delete().eq("is_demo", true);
  await db.from("faq_items").insert([
      {
        question: "Cât durează livrarea?",
        question_en: "How long does shipping take?",
        answer: "De obicei 1–3 zile lucrătoare, în funcție de metoda de livrare activă.",
        answer_en: "Usually 1–3 working days, depending on the active shipping method.",
        sort_order: 0,
        is_enabled: true,
        is_demo: true,
      },
      {
        question: "Cum fac un retur?",
        question_en: "How do I return an item?",
        answer: "Politica de retur este publicată din CMS. Nu promitem termene care nu sunt scrise acolo.",
        answer_en: "The return policy is published from CMS. We do not promise timelines that are not written there.",
        sort_order: 1,
        is_enabled: true,
        is_demo: true,
      },
      {
        question: "Ce garanție am?",
        question_en: "What warranty do I have?",
        answer: "Se aplică garanția legală din România. Detaliile se completează din admin înainte de lansare.",
        answer_en: "The legal warranty in Romania applies. Details are completed in admin before launch.",
        sort_order: 2,
        is_enabled: true,
        is_demo: true,
      },
      {
        question: "Cum plătesc?",
        question_en: "How do I pay?",
        answer: "Plata se procesează prin adapterul configurat (Stripe sau mock în development). Cardul nu este stocat de RAVILO.",
        answer_en: "Payment is processed through the configured adapter (Stripe or mock in development). RAVILO does not store the card.",
        sort_order: 3,
        is_enabled: true,
        is_demo: true,
      },
      {
        question: "Ce înseamnă stoc redus?",
        question_en: "What does low stock mean?",
        answer: "Afișăm În stoc, Stoc redus sau Indisponibil. Nu publicăm cantitatea rezervată.",
        answer_en: "We show In stock, Low stock or Unavailable. We do not publish reserved quantity.",
        sort_order: 4,
        is_enabled: true,
        is_demo: true,
      },
    ]);

  const articles = [
    {
      slug: "cum-alegi-un-incarcator-usb-c",
      title: "Cum alegi un încărcător USB-C bun",
      title_en: "How to choose a good USB-C charger",
      excerpt: "Watti, GaN și cablul potrivit — fără listă de specificații inutile.",
      excerpt_en: "Watts, GaN and the right cable — without a useless spec sheet.",
    },
    {
      slug: "7-lucruri-utile-in-masina",
      title: "7 lucruri utile în mașină",
      title_en: "7 useful things in the car",
      excerpt: "Suport, încărcare, ordine. Atât.",
      excerpt_en: "Mount, charge, order. That is it.",
    },
    {
      slug: "cum-iti-organizezi-cablurile",
      title: "Cum îți organizezi cablurile",
      title_en: "How to organize your cables",
      excerpt: "Un birou liniștit începe sub blat, nu pe el.",
      excerpt_en: "A quiet desk starts under the surface, not on it.",
    },
    {
      slug: "ce-sa-ai-intr-un-bagaj-de-cabina",
      title: "Ce să ai într-un bagaj de cabină",
      title_en: "What to keep in a cabin bag",
      excerpt: "Adaptor, pouch, organizator. Fără dubluri.",
      excerpt_en: "Adapter, pouch, organizer. No duplicates.",
    },
    {
      slug: "ce-inseamna-gan",
      title: "Ce înseamnă GaN",
      title_en: "What GaN means",
      excerpt: "Același wattaj, mai puțin volum pe priză.",
      excerpt_en: "The same wattage, less bulk on the wall.",
    },
  ];
  for (const article of articles) {
    await upsertBySlug(db, "articles", {
      ...article,
      content: `<p>${article.excerpt}</p><p>Articol demo RAVILO. Editează-l din admin. Nu este ghid legal sau de siguranță.</p>`,
      content_en: `<p>${article.excerpt_en}</p><p>RAVILO demo article. Edit it from admin. It is not legal or safety advice.</p>`,
      status: "PUBLISHED",
      published_at: now,
      seo_title: `${article.title} — RAVILO`,
      seo_title_en: `${article.title_en} — RAVILO`,
      seo_description: article.excerpt,
      seo_description_en: article.excerpt_en,
      author: "RAVILO",
      category: "Jurnal",
      is_demo: true,
      updated_at: now,
    });
  }

  for (const [key, enabled] of [
    ["reviews", true],
    ["bundles", true],
    ["wishlist", true],
  ] as const) {
    await db.from("feature_flags").upsert({ key, enabled }, { onConflict: "key" });
  }

  return { products: DEMO_PRODUCTS.length, categories: 5, collections: collections.length, bundles: bundles.length };
}

export async function resetDemoStore(db: Db) {
  assertCanSeedDemo();

  const { data: demoProducts } = await db.from("products").select("id").eq("is_demo", true);
  const productIds = (demoProducts ?? []).map((row) => row.id);
  if (productIds.length) {
    const { data: variants } = await db.from("product_variants").select("id").in("product_id", productIds);
    const variantIds = (variants ?? []).map((row) => row.id);
    if (variantIds.length) {
      await db.from("inventory_levels").delete().in("variant_id", variantIds);
      await db.from("bundle_items").delete().in("variant_id", variantIds);
    }
    await db.from("collection_products").delete().in("product_id", productIds);
    await db.from("product_media").delete().in("product_id", productIds);
    await db.from("product_variants").delete().in("product_id", productIds);
    await db.from("products").delete().eq("is_demo", true);
  }

  const { data: demoBundles } = await db.from("bundles").select("id").eq("is_demo", true);
  if ((demoBundles ?? []).length) {
    await db.from("bundle_items").delete().in(
      "bundle_id",
      (demoBundles ?? []).map((row) => row.id),
    );
    await db.from("bundles").delete().eq("is_demo", true);
  }

  const { data: demoCollections } = await db.from("collections").select("id").eq("is_demo", true);
  if ((demoCollections ?? []).length) {
    await db.from("collection_products").delete().in(
      "collection_id",
      (demoCollections ?? []).map((row) => row.id),
    );
    await db.from("collections").delete().eq("is_demo", true);
  }

  await db.from("homepage_sections").delete().eq("is_demo", true);
  await db.from("navigation_items").delete().eq("is_demo", true);
  await db.from("announcements").delete().eq("is_demo", true);
  await db.from("faq_items").delete().eq("is_demo", true);
  await db.from("articles").delete().eq("is_demo", true);
  await db.from("pages").delete().eq("is_demo", true);

  const { data: demoCats } = await db.from("categories").select("id, parent_id").eq("is_demo", true);
  const children = (demoCats ?? []).filter((row) => row.parent_id);
  const parents = (demoCats ?? []).filter((row) => !row.parent_id);
  if (children.length) await db.from("categories").delete().in("id", children.map((row) => row.id));
  if (parents.length) await db.from("categories").delete().in("id", parents.map((row) => row.id));
}

function homepageSections() {
  return [
    {
      type: "HERO",
      title: "Lucruri bune. Alese simplu.",
      title_en: "Good things. Simply chosen.",
      subtitle: "Produse utile pentru mașină, casă, tehnologie și călătorii.",
      subtitle_en: "Useful products for your car, home, tech and travel.",
      content: {
        headline: "Lucruri bune. Alese simplu.",
        body: "Produse utile pentru mașină, casă, tehnologie și călătorii.",
        cta1: { label: "Descoperă produsele", href: "/produse" },
        cta2: { label: "Vezi noutățile", href: "/colectii/new-arrivals" },
      },
      content_en: {
        headline: "Good things. Simply chosen.",
        body: "Useful products for your car, home, tech and travel.",
        cta1: { label: "Shop products", href: "/auto" },
        cta2: { label: "See what's new", href: "/colectii/new-arrivals" },
      },
    },
    {
      type: "CATEGORY_GRID",
      title: "Categorii",
      title_en: "Categories",
      subtitle: "Auto, Tech, Home, Travel, EDC.",
      subtitle_en: "Auto, Tech, Home, Travel, EDC.",
      content: {},
      content_en: {},
    },
    {
      type: "RAVILO_PICKS",
      title: "RAVILO Picks",
      title_en: "RAVILO Picks",
      subtitle: "Lucrurile pe care le-am alege noi.",
      subtitle_en: "The things we would choose ourselves.",
      content: {},
      content_en: {},
    },
    {
      type: "BESTSELLERS",
      title: "Popular",
      title_en: "Popular",
      subtitle: "Selecție demo pentru development.",
      subtitle_en: "Demo ranking for development.",
      content: {},
      content_en: {},
    },
    {
      type: "SHOP_BY_PROBLEM",
      title: "Rezolvă o problemă",
      title_en: "Shop by problem",
      subtitle: "Începe de la nevoie, nu de la raft.",
      subtitle_en: "Start from a need, not a shelf.",
      content: {
        items: [
          { title: "Ordine în mașină", href: "/colectii/drive-essentials" },
          { title: "Telefon mereu încărcat", href: "/categorie/tech-incarcatoare" },
          { title: "Birou fără cabluri", href: "/colectii/desk-essentials" },
          { title: "Bagaj mai organizat", href: "/colectii/travel-essentials" },
          { title: "Casă mai inteligentă", href: "/colectii/smart-home-starter" },
          { title: "Cadou pentru el", href: "/colectii/edc-essentials" },
        ],
      },
      content_en: {
        items: [
          { title: "Organize your car", href: "/colectii/drive-essentials" },
          { title: "Keep your phone charged", href: "/categorie/tech-incarcatoare" },
          { title: "Cable-free desk", href: "/colectii/desk-essentials" },
          { title: "Organize your luggage", href: "/colectii/travel-essentials" },
          { title: "Smarter home", href: "/colectii/smart-home-starter" },
          { title: "Gift ideas for him", href: "/colectii/edc-essentials" },
        ],
      },
    },
    {
      type: "BUNDLE",
      title: "Kit-uri alese",
      title_en: "Chosen kits",
      subtitle: "Pachet cu preț mai bun decât suma pieselor.",
      subtitle_en: "A kit priced below the sum of the parts.",
      content: { slug: "drive-essentials-kit" },
      content_en: { slug: "drive-essentials-kit" },
    },
    {
      type: "NEW_ARRIVALS",
      title: "Noutăți",
      title_en: "New arrivals",
      subtitle: "",
      subtitle_en: "",
      content: {},
      content_en: {},
    },
    {
      type: "EDITORIAL",
      title: "Mai puțin zgomot. Mai multă utilitate.",
      title_en: "Less noise. More use.",
      subtitle: "RAVILO alege obiecte care rămân în uz, nu în sertarul de impulse.",
      subtitle_en: "RAVILO chooses objects that stay in use, not in the impulse drawer.",
      content: { href: "/despre" },
      content_en: { href: "/despre" },
    },
    {
      type: "TRUST",
      title: "De ce RAVILO",
      title_en: "Why RAVILO",
      subtitle: "",
      subtitle_en: "",
      content: {
        items: [
          { title: "Alese, nu aruncate în pagină", body: "Fiecare produs are un motiv clar." },
          { title: "Livrare în România", body: "Transport gratuit peste pragul din admin." },
          { title: "Retur simplu", body: "Politica de retur este publicată din CMS." },
        ],
      },
      content_en: {
        items: [
          { title: "Chosen, not dumped on a page", body: "Every product has a clear reason." },
          { title: "Shipped in Romania", body: "Free shipping over the admin threshold." },
          { title: "Simple returns", body: "The return policy is published from CMS." },
        ],
      },
    },
    {
      type: "JOURNAL",
      title: "Jurnal",
      title_en: "Journal",
      subtitle: "Note scurte despre obiecte utile.",
      subtitle_en: "Short notes about useful objects.",
      content: {},
      content_en: {},
    },
    {
      type: "NEWSLETTER",
      title: "Primește noutăți care chiar merită.",
      title_en: "Get updates worth opening.",
      subtitle: "Fără spam. Doar dacă îți dai acordul.",
      subtitle_en: "No spam. Only if you agree.",
      content: {},
      content_en: {},
    },
  ];
}
