import { Container, Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";
import { clip, normalizeEmail } from "@/lib/sanitize";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional(),
});

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const t = await getTranslations("contact");
  const { sent } = await searchParams;
  return (
    <Container className="max-w-xl py-16">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      {sent ? <p className="mt-4 text-olive">{t("sent")}</p> : null}
      <form action={submitContact} className="mt-8 grid gap-4">
        <Field label={t("name")}>
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label={t("email")}>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label={t("phone")}>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label={t("subject")}>
          <Input name="subject" required />
        </Field>
        <Field label={t("message")}>
          <Textarea name="message" rows={6} required />
        </Field>
        <div className="hidden" aria-hidden>
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <Button type="submit">{t("send")}</Button>
      </form>
    </Container>
  );
}

async function submitContact(formData: FormData) {
  "use server";
  const locale = (await getLocale()) as AppLocale;
  if (String(formData.get("website") ?? "")) return;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limited = await rateLimit("contact", ip, RATE_LIMITS.contact.limit, RATE_LIMITS.contact.windowSec);
  if (!limited.success) throw new Error("Prea multe mesaje. Încearcă mai târziu.");
  const parsed = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: String(formData.get("phone") ?? "") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: String(formData.get("website") ?? ""),
  });
  if (!isSupabaseConfigured()) {
    redirect({ href: "/contact?sent=1", locale });
  }
  const payload = {
    name: clip(parsed.name, 80),
    email: normalizeEmail(parsed.email),
    message: `${parsed.subject}\n${parsed.phone ? `Tel: ${parsed.phone}\n` : ""}${parsed.message}`,
    phone: parsed.phone ?? null,
    subject: parsed.subject,
  };
  const { error } = await sb().from("contact_submissions").insert(payload);
  if (error) {
    await sb().from("contact_submissions").insert({ name: payload.name, email: payload.email, message: payload.message });
  }
  redirect({ href: "/contact?sent=1", locale });
}
