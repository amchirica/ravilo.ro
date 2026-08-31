import "server-only";
import { Resend } from "resend";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatRon } from "@/lib/money";
import { getStoreSettings } from "@/services/settings";
import { escapeHtml, plainTextToHtml } from "@/lib/sanitize";
import type { StoreSettings } from "@/schemas/settings";

export const EMAIL_TEMPLATE_IDS = [
  ["order_received", "Order confirmation"],
  ["order_processing", "Order processing"],
  ["order_shipped", "Order shipped"],
  ["order_delivered", "Order delivered"],
  ["order_cancelled", "Order cancelled"],
  ["return_received", "Return received"],
  ["return_approved", "Return approved"],
  ["reset_password", "Password reset"],
  ["verify_email", "Welcome / verify"],
] as const;

type EmailPayload = Record<string, string | number | boolean | null>;

type OutboxRow = {
  id: string;
  toEmail: string;
  template: string;
  payload: EmailPayload;
  status: string;
  attempts: number;
};

function interpolatePayload(template: string, payload: EmailPayload): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(payload[key] ?? ""));
}

function render(template: string, payload: EmailPayload, settings?: StoreSettings): { subject: string; html: string } | null {
  const override = settings?.emailTemplates?.[template];
  if (override && override.enabled === false) return null;
  const brand = escapeHtml(settings?.siteName || settings?.storeName || "RAVILO");
  const wrap = (title: string, body: string, footer = "") => ({
    subject: `${brand} — ${title}`,
    html: `<!doctype html><html><body style="font-family:Georgia,serif;background:#F8F6F1;color:#1B1A18;padding:32px">
      <div style="max-width:560px;margin:auto;background:#FFFFFF;padding:36px;border:1px solid rgba(27,26,24,0.10)">
        <p style="letter-spacing:.28em;font-size:11px;color:#9A876A">${brand}</p>
        <h1 style="font-size:28px;font-weight:400;letter-spacing:-0.03em">${title}</h1>
        <div style="line-height:1.7;color:#706B63">${body}</div>
        ${footer ? `<p style="margin-top:24px;font-size:13px;color:#9A876A">${footer}</p>` : `<p style="margin-top:28px;font-size:13px;color:#9A876A">Lucruri bune pentru viața de zi cu zi.</p>`}
      </div></body></html>`,
  });
  if (override?.subject || override?.heading || override?.body) {
    const heading = escapeHtml(interpolatePayload(override.heading || override.subject || template, payload));
    const subject = interpolatePayload(override.subject || heading, payload);
    const body = plainTextToHtml(interpolatePayload(override.body || "", payload));
    const footer = escapeHtml(interpolatePayload(override.footer || "", payload));
    return { subject: `${brand} — ${subject}`.slice(0, 180), html: wrap(heading, body, footer).html };
  }
  switch (template) {
    case "verify_email":
      return wrap("Confirmă adresa de email", `<p>Salut ${payload.firstName ?? ""},</p><p><a href="${payload.url}">Confirmă emailul</a></p>`);
    case "reset_password":
      return wrap("Resetare parolă", `<p>Ai cerut resetarea parolei.</p><p><a href="${payload.url}">Setează o parolă nouă</a></p><p>Linkul expiră în 60 de minute.</p>`);
    case "order_received":
      return wrap(
        "Am primit comanda ta",
        `<p>Comanda ${payload.orderNumber} a fost înregistrată. Îți scriem din nou după confirmarea plății.</p>
         ${payload.items ? `<p>${payload.items}</p>` : ""}
         ${payload.total ? `<p>Total: ${formatRon(Number(payload.total))}</p>` : ""}
         ${payload.delivery ? `<p>Livrare: ${payload.delivery}</p>` : ""}`,
      );
    case "payment_confirmed":
      return wrap(
        "Plata a fost confirmată",
        `<p>Mulțumim. Comanda ${payload.orderNumber} este la noi (${formatRon(Number(payload.total ?? 0))}). Pregătim următorii pași și te ținem la curent.</p>`,
      );
    case "order_processing":
      return wrap("Pregătim comanda", `<p>Pregătim produsele pentru comanda ${payload.orderNumber}.</p>`);
    case "order_shipped":
      return wrap("Comanda ta este în drum", `<p>Comanda ${payload.orderNumber} a fost expediată.</p>`);
    case "order_delivered":
      return wrap("Comanda a ajuns", `<p>Comanda ${payload.orderNumber} a fost marcată ca livrată. Sperăm să-și găsească locul în zilele tale.</p>`);
    case "order_cancelled":
      return wrap("Comanda a fost anulată", `<p>Comanda ${payload.orderNumber} a fost anulată. Dacă ai întrebări, scrie-ne.</p>`);
    case "order_refund":
      return wrap("Rambursare", `<p>Am inițiat rambursarea pentru comanda ${payload.orderNumber}.</p>`);
    case "return_received":
      return wrap(
        "Cerere de retur înregistrată",
        `<p>Salut ${payload.firstName ?? ""},</p><p>Am primit cererea de retur pentru comanda ${payload.orderNumber}. Te anunțăm după verificare. Păstrează ambalajul până confirmăm.</p>`,
      );
    case "return_received_admin":
      return wrap(
        "Retur nou",
        `<p>Cerere ${payload.requestId} · comanda ${payload.orderNumber} · ${payload.email} · ${payload.reason}.</p><p>Vezi Admin → Retururi.</p>`,
      );
    case "return_approved":
      return wrap("Retur aprobat", `<p>Cererea de retur pentru comanda ${payload.orderNumber} a fost aprobată.</p>`);
    default:
      return wrap("Notificare", `<p>${payload.message ?? ""}</p>`);
  }
}

export async function enqueueEmail(toEmail: string, template: string, payload: EmailPayload) {
  if (!isSupabaseConfigured()) return;
  await sb().from("email_outbox").insert({ to_email: toEmail, template, payload });
}

export async function processEmailOutbox(limit = 20) {
  if (!isSupabaseConfigured()) return;
  const { data } = await sb()
    .from("email_outbox")
    .select("*")
    .eq("status", "PENDING")
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  const pending = camelList<OutboxRow>(data);
  const env = getEnv();
  const settings = await getStoreSettings();
  for (const item of pending) {
    try {
      const rendered = render(item.template, item.payload, settings);
      if (!rendered) {
        await sb().from("email_outbox").update({ status: "SENT", last_error: "template_disabled" }).eq("id", item.id);
        continue;
      }
      let providerId: string | undefined;
      if (env.EMAIL_PROVIDER === "resend") {
        if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
        const resend = new Resend(env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from: env.EMAIL_FROM,
          to: item.toEmail,
          subject: rendered.subject,
          html: rendered.html,
        });
        if (result.error) throw new Error(result.error.message);
        providerId = result.data?.id;
      } else {
        logger.info("email.console", { to: item.toEmail, template: item.template, subject: rendered.subject });
      }
      await sb()
        .from("email_outbox")
        .update({ status: "SENT", sent_at: new Date().toISOString(), last_error: null, provider_id: providerId ?? null })
        .eq("id", item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "send_failed";
      logger.error("email.failed", { id: item.id, template: item.template });
      await sb()
        .from("email_outbox")
        .update({
          status: item.attempts >= 4 ? "FAILED" : "PENDING",
          attempts: item.attempts + 1,
          last_error: message.slice(0, 500),
        })
        .eq("id", item.id);
    }
  }
}
