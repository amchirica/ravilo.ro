import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabasePublicConfigured } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { createServerSupabase } from "@/lib/supabase/server";
import { hasPermission, isAdminRole, isStaffRole, requiresMfa, type Permission } from "@/server/rbac";
import type { UserRole, UserStatus } from "@/types/domain";
import type { AuthScope } from "@/lib/supabase/auth-scope";

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  totpEnabled: boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
};

export async function getCurrentUser(scope: AuthScope = "shop"): Promise<SessionUser | null> {
  if (!isSupabasePublicConfigured()) return null;
  try {
    const supabase = await createServerSupabase(scope);
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) return null;
    const { data: row } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
    if (!row) return null;
    const profile = camelKeys<ProfileRow>(row);
    if (profile.status === "DISABLED") return null;
    const aal = authUser.app_metadata?.aal === "aal2" || Boolean(authUser.factors?.length);
    if (process.env.NODE_ENV === "production" && requiresMfa(profile.role) && !aal) {
      // Still return user; admin layout can force MFA enrollment.
    }
    return {
      id: profile.id,
      email: authUser.email ?? profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      status: profile.status,
      emailVerifiedAt: authUser.email_confirmed_at ? new Date(authUser.email_confirmed_at) : null,
      totpEnabled: aal,
    };
  } catch {
    return null;
  }
}

export async function getAdminUser() {
  return getCurrentUser("admin");
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getAdminUser();
  if (!user) {
    const path = (await headers()).get("x-ravilo-pathname") || "/admin";
    redirect(`/admin/login?next=${encodeURIComponent(path)}`);
  }
  return user as SessionUser;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) redirect("/admin/interzis");
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isStaffRole(user.role)) redirect("/admin/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/admin/login");
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: "invalid" | "confirm" | "exists" | "policy" | "rate" | "role" | "session" | "generic" = "generic",
  ) {
    super(message);
    this.name = "AuthError";
  }
}
