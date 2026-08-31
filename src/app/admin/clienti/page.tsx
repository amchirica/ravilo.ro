import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows } from "@/lib/supabase/db";

export default async function CustomersAdmin() {
  await requirePermission("customer.read");
  const customers = await listRows<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    marketingConsent: boolean;
  }>("profiles", { eq: ["role", "CUSTOMER"], order: "created_at", ascending: false, limit: 80 });
  return (
    <div>
      <AdminHeading k="customers" />
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Email</th>
            <th>Nume</th>
            <th>Marketing</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-t border-line">
              <td className="py-2">{customer.email}</td>
              <td>
                {customer.firstName} {customer.lastName}
              </td>
              <td>{customer.marketingConsent ? "da" : "nu"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
