import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { canSeedDemo } from "@/lib/dev-seed-guard";
import { sb } from "@/lib/supabase/db";
import { seedDemoStore, resetDemoStore } from "@/server/demo-seed";
import { writeAudit } from "@/server/audit";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { revalidatePath } from "next/cache";

export default async function DevSeedPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requirePermission("admin.manage");
  const query = await searchParams;
  const allowed = canSeedDemo();
  return (
    <div className="max-w-xl">
      <AdminHeading k="dev" />
      <p className="mt-3 text-sm text-mute">Seed și reset doar pentru înregistrări cu is_demo = true. Indisponibil în producție fără ALLOW_DEV_SEED=true.</p>
      {query.ok === "seed" ? <p className="mt-4 text-success">Catalog demo creat.</p> : null}
      {query.ok === "reset" ? <p className="mt-4 text-success">Datele demo au fost șterse.</p> : null}
      {query.err ? <p className="mt-4 text-danger">{query.err}</p> : null}
      {!allowed ? (
        <p className="mt-8 border border-line bg-card p-4 text-sm">Seed-ul este blocat. Setează ALLOW_DEV_SEED=true în development/staging.</p>
      ) : (
        <div className="mt-8 grid gap-6">
          <ConfirmForm action={runSeed} message="Creează catalogul demo (is_demo). Continui?">
            <p className="text-sm text-mute">Creează produse, categorii, colecții, bundle-uri și conținut demo.</p>
            <Button type="submit" className="mt-3">
              Seed catalog demo
            </Button>
          </ConfirmForm>
          <ConfirmForm action={runReset} message="Șterge doar înregistrările is_demo = true. Continui?">
            <p className="text-sm text-mute">Șterge doar is_demo = true. Comenzile reale nu sunt atinse.</p>
            <Button type="submit" variant="line" className="mt-3">
              Șterge datele demo
            </Button>
          </ConfirmForm>
        </div>
      )}
    </div>
  );
}

async function runSeed() {
  "use server";
  const actor = await requirePermission("admin.manage");
  try {
    const result = await seedDemoStore(sb());
    await writeAudit({
      actorUserId: actor.id,
      action: "demo.seed",
      entityType: "Catalog",
      entityId: "demo",
      after: result,
    });
    revalidatePath("/");
    redirect("/admin/dezvoltare?ok=seed");
  } catch (error) {
    redirect(`/admin/dezvoltare?err=${encodeURIComponent(error instanceof Error ? error.message : "Seed failed")}`);
  }
}

async function runReset() {
  "use server";
  const actor = await requirePermission("admin.manage");
  try {
    await resetDemoStore(sb());
    await writeAudit({
      actorUserId: actor.id,
      action: "demo.reset",
      entityType: "Catalog",
      entityId: "demo",
      after: { is_demo: true },
    });
    revalidatePath("/");
    redirect("/admin/dezvoltare?ok=reset");
  } catch (error) {
    redirect(`/admin/dezvoltare?err=${encodeURIComponent(error instanceof Error ? error.message : "Reset failed")}`);
  }
}
