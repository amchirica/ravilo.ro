import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { getEnv } from "@/lib/env";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/schemas/auth";
import { AuthError } from "@/server/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { passwordGrant } from "@/lib/supabase/password-grant";
import { mergeGuestCartOnLogin } from "@/services/cart";
import { writeAudit } from "@/server/audit";
import { clientContext } from "@/server/http";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { isStaffRole } from "@/server/rbac";
import type { AuthScope } from "@/lib/supabase/auth-scope";
import type { UserRole } from "@/types/domain";

function passwordPolicy(password: string): string | null {
  if (password.length < 12) return "Parola trebuie să aibă cel puțin 12 caractere.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Parola trebuie să conțină majuscule, minuscule și cifre.";
  }
  return null;
}

export async function register(input: unknown, ip = "unknown") {
  const data = registerSchema.parse(input);
  const policy = passwordPolicy(data.password);
  if (policy) throw new AuthError(policy, 400, "policy");
  const limited = await rateLimit("register", ip, RATE_LIMITS.register.limit, RATE_LIMITS.register.windowSec);
  if (!limited.success) throw new AuthError("Prea multe încercări. Încearcă mai târziu.", 429, "rate");
  const supabase = await createServerSupabase();
  const { data: result, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${getEnv().APP_URL}/auth/verificare`,
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? "",
      },
    },
  });
  if (error) {
    if (/already/i.test(error.message)) {
      throw new AuthError("Există deja un cont cu acest email. Autentifică-te.", 409, "exists");
    }
    throw new AuthError("Nu am putut crea contul.", 400, "generic");
  }
  if (result.user && isSupabaseConfigured()) {
    await sb().from("profiles").upsert({
      id: result.user.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone ?? null,
      role: "CUSTOMER",
      status: result.user.email_confirmed_at || result.session ? "ACTIVE" : "PENDING_VERIFICATION",
      marketing_consent: data.marketingConsent,
      marketing_consent_at: data.marketingConsent ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (data.marketingConsent) {
      await sb().from("consent_records").insert({
        profile_id: result.user.id,
        category: "MARKETING",
        granted: true,
        source: "register",
        version: "v1",
      });
    }
    await mergeGuestCartOnLogin(result.user.id);
  }
  if (!result.session && result.user && process.env.NODE_ENV !== "production") {
    const { error: confirmError } = await sb().auth.admin.updateUserById(result.user.id, { email_confirm: true });
    if (!confirmError) {
      const signedIn = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (signedIn.data.session) {
        await sb()
          .from("profiles")
          .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
          .eq("id", result.user.id);
        return { ok: true as const, hasSession: true };
      }
    }
  }
  return { ok: true as const, hasSession: Boolean(result.session) };
}

export async function login(input: unknown, ip = "unknown", scope: AuthScope = "shop") {
  const data = loginSchema.parse(input);
  const limited = await rateLimit("login", `${ip}:${data.email}:${scope}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowSec);
  if (!limited.success) throw new AuthError("Prea multe încercări. Încearcă mai târziu.", 429, "rate");
  let grant = await passwordGrant(data.email, data.password);
  const unconfirmed =
    grant.error?.code === "email_not_confirmed" || /not confirmed|confirm your email/i.test(grant.error?.message ?? "");
  if (unconfirmed && process.env.NODE_ENV !== "production" && isSupabaseConfigured()) {
    const { data: profile } = await sb().from("profiles").select("id").eq("email", data.email).maybeSingle();
    if (profile?.id) {
      await sb().auth.admin.updateUserById(profile.id, { email_confirm: true });
      grant = await passwordGrant(data.email, data.password);
    }
  }
  if (grant.error || !grant.user || !grant.session) {
    console.error("[auth.login] sign-in failed", { scope, code: grant.error?.code, message: grant.error?.message });
    if (unconfirmed) {
      throw new AuthError("Confirmă emailul din linkul primit, apoi revino să te autentifici.", 403, "confirm");
    }
    throw new AuthError("Email sau parolă invalidă.", 401, "invalid");
  }
  let role: string = "CUSTOMER";
  if (isSupabaseConfigured()) {
    const { data: row } = await sb().from("profiles").select("*").eq("id", grant.user.id).maybeSingle();
    const profile = row ? camelKeys<{ status: string; role: string }>(row) : null;
    if (!profile || profile.status === "DISABLED") {
      throw new AuthError("Email sau parolă invalidă.", 401, "invalid");
    }
    if (scope === "admin" && !isStaffRole(profile.role as UserRole)) {
      throw new AuthError("Acest cont este de magazin. Folosește contul de administrator.", 401, "role");
    }
    role = profile.role;
    await sb()
      .from("profiles")
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: grant.user.email_confirmed_at ? "ACTIVE" : profile.status,
      })
      .eq("id", grant.user.id);
    if (scope === "shop") await mergeGuestCartOnLogin(grant.user.id);
  }
  const supabase = await createServerSupabase(scope);
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: grant.session.access_token,
    refresh_token: grant.session.refresh_token,
  });
  if (sessionError) {
    console.error("[auth.login] setSession failed", { scope, message: sessionError.message });
    throw new AuthError("Nu am putut deschide sesiunea. Reîncearcă.", 401, "session");
  }
  try {
    const { ipHash, userAgent } = await clientContext();
    await writeAudit({
      actorUserId: grant.user.id,
      action: scope === "admin" ? "auth.admin_login" : "auth.login",
      entityType: "User",
      entityId: grant.user.id,
      ipHash,
      userAgent,
    });
  } catch {
    // Audit must not block a valid login.
  }
  return { ok: true, role };
}

export async function logout(scope: AuthScope = "shop") {
  const supabase = await createServerSupabase(scope);
  await supabase.auth.signOut();
}

export async function requestPasswordReset(input: unknown, ip = "unknown") {
  const data = forgotPasswordSchema.parse(input);
  const limited = await rateLimit("passwordReset", ip, RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowSec);
  if (!limited.success) throw new AuthError("Prea multe încercări. Încearcă mai târziu.", 429);
  const supabase = await createServerSupabase();
  await supabase.auth.resetPasswordForEmail(data.email, {
    redirectTo: `${getEnv().APP_URL}/auth/reset`,
  });
  return { ok: true };
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);
  const policy = passwordPolicy(data.password);
  if (policy) throw new AuthError(policy, 400);
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: data.password });
  if (error) throw new AuthError("Link invalid sau expirat.", 400);
  return { ok: true };
}

export async function verifyEmail() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email_confirmed_at && isSupabaseConfigured()) {
    await sb().from("profiles").update({ status: "ACTIVE", updated_at: new Date().toISOString() }).eq("id", data.user.id);
  }
  return { ok: true };
}
