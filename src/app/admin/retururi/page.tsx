import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { Button } from "@/components/ui/primitives";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { formatDate } from "@/lib/format";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ReturnRow = {
  id: string;
  publicOrderNumber: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: string;
  resolution: string;
  status: string;
  description: string;
  photoUrls: string[];
  iban: string | null;
  ibanHolder: string;
  street: string;
  streetNumber: string;
  city: string;
  county: string;
  postalCode: string;
  returnMethod: string;
  createdAt: string;
};

export default async function ReturnsAdmin() {
  await requirePermission("order.read");
  const { data } = isSupabaseConfigured()
    ? await sb().from("return_requests").select("*").order("created_at", { ascending: false }).limit(80)
    : { data: [] };
  const rows = camelList<ReturnRow>(data);
  return (
    <div>
      <AdminHeading k="returns" />
      <p className="mt-2 text-sm text-mute">Cereri de retur din magazin, cu poze.</p>
      <ul className="mt-8 grid gap-6">
        {rows.map((row) => (
          <li key={row.id} className="border border-line bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">
                {row.publicOrderNumber} · {row.firstName} {row.lastName}
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-mute">
                {row.status} · {formatDate(row.createdAt, "ro")}
              </p>
            </div>
            <p className="mt-1 text-sm text-mute">
              {row.email} · {row.phone}
              {row.iban ? ` · IBAN ${row.iban}${row.ibanHolder ? ` (${row.ibanHolder})` : ""}` : ""}
            </p>
            <p className="mt-1 text-sm text-mute">
              {row.street} {row.streetNumber}, {row.postalCode} {row.city}, {row.county}
              {row.returnMethod === "COURIER_PICKUP" ? " · ridicare curier" : " · trimite clientul"}
            </p>
            <p className="mt-2 text-sm">
              {row.reason} → {row.resolution} · {row.quantity}× {row.productName || "—"} {row.sku ? `(${row.sku})` : ""}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm">{row.description}</p>
            {row.photoUrls?.length ? (
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {row.photoUrls.map((src) => (
                  <li key={src}>
                    <a href={src} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-24 w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-mute">Fără poze.</p>
            )}
            <form action={updateReturn.bind(null, row.id)} className="mt-4 flex flex-wrap items-center gap-2">
              <select name="status" defaultValue={row.status} className="rounded-md border border-line bg-paper px-3 py-2 text-sm">
                <option value="PENDING">PENDING</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <Button type="submit" variant="line">
                Actualizează
              </Button>
            </form>
          </li>
        ))}
        {rows.length === 0 ? <li className="text-sm text-mute">Nicio cerere de retur.</li> : null}
      </ul>
    </div>
  );
}

async function updateReturn(id: string, formData: FormData) {
  "use server";
  await requirePermission("order.write");
  const status = String(formData.get("status") ?? "PENDING");
  await sb().from("return_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/retururi");
  redirect("/admin/retururi");
}
