import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getStoreSettings, saveStoreSettings } from "@/services/settings";
import { getLaunchReadiness } from "@/services/launch-readiness";
import { Button } from "@/components/ui/primitives";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function PaymentsAdmin() {
  await requirePermission("settings.write");
  const settings = await getStoreSettings();
  const { checks, liveReady } = await getLaunchReadiness();
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  return (
    <div className="max-w-xl">
      <AdminHeading k="payments" />
      <p className="mt-2 text-sm text-mute">
        Procesator activ pe server: <strong>{provider}</strong>. Cheile rămân în environment, nu în browser.
      </p>
      <div className="mt-6 border border-line bg-card p-5">
        <p className="text-sm font-medium">{liveReady ? "Live Stripe este gata." : "Checklist lansare — etapa 1"}</p>
        <ul className="mt-3 grid gap-2 text-sm">
          {checks.map((check) => (
            <li key={check.label}>
              <span className={check.ok ? "text-success" : "text-warning"}>{check.ok ? "●" : "○"}</span> {check.label}
              {check.hint && !check.ok ? <p className="mt-1 pl-4 text-xs text-mute">{check.hint}</p> : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-mute">
          Localhost folosește sk_test_. Pe ravilo.ro: NODE_ENV=production, sk_live_, webhook live către
          /api/webhooks/stripe, APP_URL=https://ravilo.ro.
        </p>
      </div>
      <form action={save} className="mt-8 grid gap-3">
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="stripe" defaultChecked={settings.paymentMethods.stripe} /> Stripe
        </label>
        <p className="text-xs text-mute">Netopia, EuPlatesc și PayU sunt pregătite ca setări, dar nu sunt conectate fără adapter real.</p>
        <Button type="submit">Salvează</Button>
      </form>
    </div>
  );
}

async function save(formData: FormData) {
  "use server";
  const actor = await requirePermission("settings.write");
  const current = await getStoreSettings();
  await saveStoreSettings(
    {
      ...current,
      paymentMethods: { ...current.paymentMethods, stripe: formData.get("stripe") === "on" },
    },
    actor.id,
  );
  revalidatePath("/admin/plati");
  redirect("/admin/plati");
}
