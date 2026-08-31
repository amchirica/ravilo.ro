import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { Button } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { fulfillDeletion, fulfillExport } from "@/services/data-requests";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  type: "EXPORT" | "DELETION";
  status: string;
  createdAt: string;
  profileId: string;
  profiles: { email: string; role: string; firstName: string; lastName: string } | { email: string; role: string; firstName: string; lastName: string }[] | null;
};

export default async function DataRequestsAdmin() {
  const actor = await requirePermission("customer.write");
  void actor;
  const { data } = await sb()
    .from("data_requests")
    .select("id, type, status, created_at, profile_id, profiles(email, role, first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(80);
  const rows = camelList<Row>(data);
  return (
    <div>
      <AdminHeading k="dataRequests" />
      <p className="mt-2 text-sm text-mute">Exportul și ștergerea (GDPR). Comenzile fiscale rămân ca snapshot.</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Tip</th>
            <th>Status</th>
            <th>Client</th>
            <th>Data</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <td className="py-2">{row.type === "DELETION" ? "Ștergere" : "Export"}</td>
              <td>{row.status}</td>
              <td>
                {(() => {
                  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                  return (
                    <>
                      {profile?.email ?? row.profileId}
                      {profile?.role && profile.role !== "CUSTOMER" ? ` · ${profile.role}` : ""}
                    </>
                  );
                })()}
              </td>
              <td>{formatDate(row.createdAt, "ro")}</td>
              <td>
                {row.status === "PENDING" || row.status === "PROCESSING" ? (
                  <ConfirmForm
                    action={completeRequest.bind(null, row.id, row.profileId, row.type)}
                    message={row.type === "DELETION" ? "Anonimizezi contul? Comenzile fiscale rămân." : "Generezi exportul?"}
                  >
                    <Button type="submit" variant="line">
                      Finalizează
                    </Button>
                  </ConfirmForm>
                ) : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="py-6 text-mute" colSpan={5}>
                Nicio cerere.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

async function completeRequest(id: string, profileId: string, type: "EXPORT" | "DELETION") {
  "use server";
  const actor = await requirePermission("customer.write");
  if (type === "EXPORT") await fulfillExport(id, profileId, actor.id);
  else await fulfillDeletion(id, profileId, actor.id);
  revalidatePath("/admin/clienti/cereri");
  redirect("/admin/clienti/cereri");
}
