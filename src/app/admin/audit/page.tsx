import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";

type LogRow = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: { email: string } | null;
};

export default async function AuditPage() {
  await requirePermission("audit.read");
  const { data } = isSupabaseConfigured()
    ? await sb()
        .from("audit_logs")
        .select("id, created_at, action, entity_type, entity_id, actor:profiles(email)")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const logs = camelList<LogRow>(data);
  return (
    <div>
      <AdminHeading k="audit" />
      <p className="mt-2 text-sm text-mute">Doar citire. Ștergerea din UI nu este permisă.</p>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Timp</th>
            <th>Actor</th>
            <th>Acțiune</th>
            <th>Entitate</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-line">
              <td className="py-2">{log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt)}</td>
              <td>{log.actor?.email ?? "system"}</td>
              <td>{log.action}</td>
              <td>
                {log.entityType} {log.entityId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
