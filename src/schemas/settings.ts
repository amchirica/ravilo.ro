import { z } from "zod";

export const storeSettingsSchema = z.object({
  storeName: z.string().max(80).default("RAVILO"),
  tagline: z.string().max(120).default("Lucruri bune pentru viața de zi cu zi."),
  positioning: z.string().max(200).default("O selecție atentă pentru casă, familie, drum și timpul tău."),
  companyName: z.string().max(160).default(""),
  cui: z.string().max(20).default(""),
  registrationNumber: z.string().max(40).default(""),
  address: z.string().max(300).default(""),
  email: z.string().max(120).default("hello@ravilo.ro"),
  supportEmail: z.string().max(120).default(""),
  phone: z.string().max(40).default(""),
  country: z.string().max(80).default("România"),
  currency: z.literal("RON").default("RON"),
  vatEnabled: z.boolean().default(true),
  defaultTaxRateBps: z.number().int().min(0).max(10_000).default(2100),
  pricesIncludeTax: z.boolean().default(true),
  freeShippingThreshold: z.number().int().min(0).default(25000),
  lowStockThreshold: z.number().int().min(0).max(99).default(3),
  supportHours: z.string().max(120).default("Luni–Vineri, 09:00–17:00"),
  orderNumberPrefix: z.string().max(8).default("RVL"),
  reservationMinutes: z.number().int().min(5).max(120).default(45),
  logoPath: z.string().max(300).default("/ravilo.png"),
  faviconPath: z.string().max(300).default("/favicon.ico"),
  siteName: z.string().max(80).default("RAVILO"),
  defaultOgImage: z.string().max(300).default("/ravilo.png"),
  defaultSeoTitle: z.string().max(70).default("RAVILO — Lucruri bune pentru viața de zi cu zi."),
  defaultSeoDescription: z
    .string()
    .max(160)
    .default("O selecție atentă pentru casă, familie, drum și timpul tău."),
  announcementEnabled: z.boolean().default(true),
  announcementTemplate: z
    .string()
    .max(240)
    .default("Transport gratuit la comenzile de peste {{free_shipping_threshold}} lei."),
  announcementTemplateEn: z
    .string()
    .max(240)
    .default("Free shipping on orders over {{free_shipping_threshold}} lei."),
  announcementLink: z.string().max(200).default("/produse"),
  announcementStyle: z.enum(["band", "line"]).default("band"),
  bestSellerMode: z.enum(["auto", "manual"]).default("auto"),
  social: z
    .object({
      instagram: z.string().max(200).default(""),
      facebook: z.string().max(200).default(""),
      tiktok: z.string().max(200).default(""),
      youtube: z.string().max(200).default(""),
    })
    .default({ instagram: "", facebook: "", tiktok: "", youtube: "" }),
  paymentMethods: z
    .object({
      stripe: z.boolean().default(true),
      netopia: z.boolean().default(false),
      euplatesc: z.boolean().default(false),
      payu: z.boolean().default(false),
    })
    .default({ stripe: true, netopia: false, euplatesc: false, payu: false }),
  emailTemplates: z
    .record(
      z.string(),
      z.object({
        enabled: z.boolean().default(true),
        subject: z.string().max(140).default(""),
        heading: z.string().max(160).default(""),
        body: z.string().max(4000).default(""),
        footer: z.string().max(400).default(""),
      }),
    )
    .default({}),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

export const defaultStoreSettings = (): StoreSettings => storeSettingsSchema.parse({});
