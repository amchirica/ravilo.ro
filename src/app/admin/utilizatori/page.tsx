import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { canAssignRole } from "@/server/rbac";
import type { UserRole } from "@/types/domain";
import { revalidatePath } from "next/cache";

type UserRow = { id: string; email: string; role: UserRole; status: string };

export default async function UsersAdmin() {
  const actor = await requirePermission("admin.manage");
  const users = await listRows<UserRow>("profiles", { order: "created_at", ascending: false, limit: 100 });
  return (
    <div>
      <AdminHeading k="users" />
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Email</th>
            <th>Rol</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-line">
              <td className="py-2">{user.email}</td>
              <td>{user.role}</td>
              <td>{user.status}</td>
              <td>
                <form action={changeRole.bind(null, user.id)} className="flex gap-2">
                  <select name="role" defaultValue={user.role} className="border border-line px-2 py-1">
                    {["CUSTOMER", "STAFF", "EDITOR", "MANAGER", "ADMIN", "SUPER_ADMIN"].map((role) => (
                      <option key={role} value={role} disabled={!canAssignRole(actor.role, role as UserRole) && role !== user.role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button className="underline">Salvează</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function changeRole(userId: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("admin.manage");
  const role = String(formData.get("role")) as UserRole;
  const { data } = await sb().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!data) return;
  const target = camelKeys<UserRow>(data);
  if (!canAssignRole(actor.role, role) || (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN")) {
    throw new Error("Forbidden");
  }
  await sb().from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
  await writeAudit({
    actorUserId: actor.id,
    action: "user.role",
    entityType: "User",
    entityId: userId,
    before: { role: target.role },
    after: { role },
  });
  revalidatePath("/admin/utilizatori");
}
