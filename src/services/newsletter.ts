import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { clip, normalizeEmail } from "@/lib/sanitize";

export async function subscribeNewsletter(email: string, source = "footer") {
  if (!isSupabaseConfigured()) throw new Error("Serviciul nu este disponibil.");
  const value = normalizeEmail(clip(email, 180));
  if (!value.includes("@") || value.length < 6) throw new Error("Email invalid.");
  const { error } = await sb().from("newsletter_subscribers").upsert(
    {
      email: value,
      status: "subscribed",
      source: clip(source, 40),
      consent_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) throw new Error("Nu am putut salva abonarea.");
}
