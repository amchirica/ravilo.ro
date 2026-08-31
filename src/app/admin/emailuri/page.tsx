import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getStoreSettings, saveStoreSettings } from "@/services/settings";
import { EMAIL_TEMPLATE_IDS } from "@/services/email";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { clip } from "@/lib/sanitize";

export default async function EmailsAdmin() {
  await requirePermission("settings.write");
  const settings = await getStoreSettings();
  return (
    <div className="max-w-2xl">
      <AdminHeading k="emails" />
      <p className="mt-2 text-sm text-mute">
        Subject, heading și body sunt text simplu (fără HTML). Placeholders: {"{{orderNumber}}"}, {"{{url}}"}. Dacă lași gol, se folosește template-ul intern.
      </p>
      <div className="mt-8 grid gap-10">
        {EMAIL_TEMPLATE_IDS.map(([id, label]) => {
          const current = settings.emailTemplates[id] ?? { enabled: true, subject: "", heading: "", body: "", footer: "" };
          return (
            <form key={id} action={saveTemplate.bind(null, id)} className="grid gap-3 border border-line bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif text-2xl">{label}</h2>
                <span className="text-xs uppercase tracking-[0.14em] text-mute">{id}</span>
              </div>
              <label className="flex gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked={current.enabled} /> Activ
              </label>
              <Field label="Subject">
                <Input name="subject" defaultValue={current.subject} />
              </Field>
              <Field label="Heading">
                <Input name="heading" defaultValue={current.heading} />
              </Field>
              <Field label="Body">
                <Textarea name="body" defaultValue={current.body} rows={5} />
              </Field>
              <Field label="Footer">
                <Input name="footer" defaultValue={current.footer} />
              </Field>
              <Button type="submit">Salvează</Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

async function saveTemplate(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("settings.write");
  const current = await getStoreSettings();
  const next = {
    ...current,
    emailTemplates: {
      ...current.emailTemplates,
      [id]: {
        enabled: formData.get("enabled") === "on",
        subject: clip(String(formData.get("subject") ?? ""), 140),
        heading: clip(String(formData.get("heading") ?? ""), 160),
        body: clip(String(formData.get("body") ?? ""), 4000),
        footer: clip(String(formData.get("footer") ?? ""), 400),
      },
    },
  };
  await saveStoreSettings(next, actor.id);
  await writeAudit({ actorUserId: actor.id, action: "settings.update", entityType: "EmailTemplate", entityId: id });
  revalidatePath("/admin/emailuri");
}
